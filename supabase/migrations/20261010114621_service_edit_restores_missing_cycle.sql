-- Um serviço recorrente ativo podia ficar sem cobrança pendente (a quitação em lote antiga
-- pagava sem agendar o ciclo seguinte) e nada o trazia de volta: mudar o "próximo
-- vencimento" na edição não criava cobrança. A função é a de 20261009023140, com a
-- reposição do ciclo que faltar ao salvar.

create or replace function public.update_client_service(
  p_service_id uuid,
  p_name text,
  p_description text,
  p_list_price numeric,
  p_discount_type text,
  p_discount_value numeric,
  p_media_budget numeric,
  p_additional_fee numeric,
  p_additional_fee_is_revenue boolean,
  p_billing_type text,
  p_next_due_date date,
  p_promotional_price numeric,
  p_promotional_cycles integer,
  p_adjustment_interval_months integer,
  p_adjustment_rate numeric,
  p_notes text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_service public.client_services%rowtype;
  v_company_revenue numeric(15,2);
  v_pending_revenue numeric(15,2);
  v_is_revenue boolean := coalesce(p_additional_fee_is_revenue, true);
  v_charge_revenue numeric(15,2);
  v_charge_media numeric(15,2);
  v_charge_additional numeric(15,2);
  v_row record;
begin
  select service.*
  into v_service
  from public.client_services as service
  where service.id = p_service_id
  for update;

  if v_service.id is null then
    return 'not_found';
  end if;

  if (select auth.uid()) is null
    or not (select private.is_active_workspace_owner(v_service.workspace_id)) then
    raise insufficient_privilege using message = 'active workspace owner required';
  end if;

  v_company_revenue := round(case p_discount_type
    when 'percentage' then p_list_price * (1 - p_discount_value / 100)
    when 'fixed' then p_list_price - p_discount_value
    else p_list_price
  end, 2);

  if v_company_revenue < 0 then
    raise check_violation using message = 'discount exceeds list price';
  end if;

  update public.client_services
  set
    name = btrim(p_name),
    description = nullif(btrim(coalesce(p_description, '')), ''),
    list_price = p_list_price,
    discount_type = p_discount_type,
    discount_value = p_discount_value,
    company_revenue = v_company_revenue,
    media_budget = p_media_budget,
    additional_fee = p_additional_fee,
    additional_fee_is_revenue = v_is_revenue,
    billing_type = p_billing_type,
    next_due_date = p_next_due_date,
    promotional_price = p_promotional_price,
    promotional_cycles = p_promotional_cycles,
    adjustment_interval_months = p_adjustment_interval_months,
    adjustment_rate = p_adjustment_rate,
    -- A data da revisão acompanha o lembrete: some quando ele é desligado, nasce quando é
    -- ligado e é recalculada quando o intervalo muda. Antes ela nunca era tocada aqui, e
    -- desligar o lembrete esbarrava em client_services_adjustment_check.
    next_adjustment_date = case
      when p_adjustment_interval_months is null then null
      when v_service.next_adjustment_date is not null
        and v_service.adjustment_interval_months = p_adjustment_interval_months
        then v_service.next_adjustment_date
      else private.add_months_clamped(current_date, p_adjustment_interval_months)
    end,
    notes = nullif(btrim(coalesce(p_notes, '')), '')
  where id = p_service_id;

  if v_service.billing_type = 'single' and v_service.installment_count > 1 then
    -- Cada parcela recebe a fatia da sua posição no novo total, com os centavos de resto
    -- indo para as primeiras — o mesmo rateio que apply_service_to_client usou ao criar.
    -- A posição é contada sobre todas as cobranças não canceladas para que as já pagas
    -- não desloquem o índice das pendentes.
    for v_row in
      select charge.id, charge.status,
             row_number() over (order by charge.due_date, charge.id) as position
      from public.charges as charge
      where charge.client_service_id = p_service_id
        and charge.workspace_id = v_service.workspace_id
        and charge.status <> 'cancelled'
    loop
      if v_row.status <> 'pending' then
        continue;
      end if;

      v_charge_revenue := (
        floor(v_company_revenue * 100 / v_service.installment_count)
        + case when v_row.position
            <= mod(round(v_company_revenue * 100)::integer, v_service.installment_count)
          then 1 else 0 end
      ) / 100;
      v_charge_media := (
        floor(p_media_budget * 100 / v_service.installment_count)
        + case when v_row.position
            <= mod(round(p_media_budget * 100)::integer, v_service.installment_count)
          then 1 else 0 end
      ) / 100;
      v_charge_additional := (
        floor(p_additional_fee * 100 / v_service.installment_count)
        + case when v_row.position
            <= mod(round(p_additional_fee * 100)::integer, v_service.installment_count)
          then 1 else 0 end
      ) / 100;

      update public.charges
      set company_revenue = v_charge_revenue,
          media_budget = v_charge_media,
          additional_fee = v_charge_additional,
          additional_fee_is_revenue = v_is_revenue
      where id = v_row.id;
    end loop;
  else
    -- A pendente é o ciclo de número promotional_cycles_used + 1: ela ainda é promocional
    -- exatamente enquanto os ciclos consumidos não alcançaram o total contratado, que é o
    -- mesmo critério que settle_charge_and_schedule_next aplica ao criar o próximo.
    v_pending_revenue := case
      when p_promotional_price is not null
        and v_service.promotional_cycles_used < coalesce(p_promotional_cycles, 0)
        then p_promotional_price
      else v_company_revenue
    end;

    update public.charges
    set company_revenue = v_pending_revenue,
        media_budget = p_media_budget,
        additional_fee = p_additional_fee,
        additional_fee_is_revenue = v_is_revenue
    where client_service_id = p_service_id
      and workspace_id = v_service.workspace_id
      and status = 'pending';
  end if;

  -- Serviço recorrente ativo sem nenhuma cobrança pendente saiu do ciclo e não volta
  -- sozinho: a próxima cobrança só nasce quando a atual é paga. Ao salvar o serviço, o
  -- ciclo do "próximo vencimento" é reposto, a menos que essa data já tenha cobrança.
  if p_billing_type <> 'single'
    and v_service.status = 'active'
    and p_next_due_date is not null
    and not exists (
      select 1 from public.charges as charge
      where charge.client_service_id = p_service_id
        and charge.workspace_id = v_service.workspace_id
        and (charge.status = 'pending'
          or (charge.due_date = p_next_due_date and charge.status <> 'cancelled'))
    ) then
    insert into public.charges (
      workspace_id, client_id, client_entity_id, client_service_id, description, due_date,
      company_revenue, media_budget, additional_fee, additional_fee_is_revenue, status
    ) values (
      v_service.workspace_id, v_service.client_id, v_service.client_entity_id, p_service_id,
      btrim(p_name), p_next_due_date,
      case
        when p_promotional_price is not null
          and v_service.promotional_cycles_used < coalesce(p_promotional_cycles, 0)
          then p_promotional_price
        else v_company_revenue
      end,
      p_media_budget, p_additional_fee, v_is_revenue, 'pending'
    );
  end if;

  return 'updated';
end;
$$;
