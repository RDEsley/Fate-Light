alter table public.clients
  drop constraint clients_commercial_status_check,
  add constraint clients_commercial_status_check
    check (
      commercial_status in ('budget', 'pending', 'active', 'inactive', 'blacklist', 'archived')
    ),
  add column website text,
  add constraint clients_website_check check (
    website is null
    or (
      website = lower(website)
      and char_length(website) between 4 and 253
      and website ~ '^[a-z0-9]([a-z0-9.-]{1,251}[a-z0-9])?$'
    )
  );

grant insert (website) on table public.clients to authenticated;
grant update (website) on table public.clients to authenticated;

alter table public.client_services
  drop constraint client_services_status_check,
  add constraint client_services_status_check check (status in ('active', 'paused', 'ended')),
  drop constraint client_services_ended_at_check,
  add constraint client_services_ended_at_check check (
    (status in ('active', 'paused') and ended_at is null)
    or (status = 'ended' and ended_at is not null)
  );

alter table public.charges
  drop constraint charges_values_check,
  add constraint charges_values_check check (
    company_revenue >= 0 and media_budget >= 0 and additional_fee >= 0 and gross_total >= 0
  ),
  add column cancel_reason_code text,
  add column cancel_reason text,
  add column cancelled_at timestamptz,
  add constraint charges_cancel_reason_check check (
    (cancel_reason_code is null and cancel_reason is null and cancelled_at is null)
    or (
      status = 'cancelled'
      and cancel_reason_code in (
        'client_withdrew', 'service_not_delivered', 'duplicate_charge',
        'entry_error', 'renegotiated', 'other'
      )
      and char_length(btrim(cancel_reason)) between 2 and 500
      and cancelled_at is not null
    )
  );

grant update (cancel_reason_code, cancel_reason, cancelled_at) on table public.charges to authenticated;

create index client_services_workspace_client_paused_idx
  on public.client_services (workspace_id, client_id)
  where status = 'paused';

create or replace function public.apply_service_to_client(
  p_client_id uuid,
  p_service_id uuid,
  p_name text,
  p_description text,
  p_list_price numeric,
  p_discount_type text,
  p_discount_value numeric,
  p_media_budget numeric,
  p_additional_fee numeric,
  p_billing_type text,
  p_start_date date,
  p_next_due_date date,
  p_installment_count integer,
  p_promotional_price numeric,
  p_promotional_cycles integer,
  p_adjustment_interval_months integer,
  p_adjustment_rate numeric,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_service_instance_id uuid;
  v_catalog_service_id uuid;
  v_normalized_name text := btrim(p_name);
  v_company_revenue numeric(15,2);
  v_first_revenue numeric(15,2);
  v_total numeric(15,2);
  v_charge_revenue numeric(15,2);
  v_charge_media numeric(15,2);
  v_charge_additional numeric(15,2);
  v_index integer;
begin
  select client.workspace_id
  into v_workspace_id
  from public.clients as client
  where client.id = p_client_id
    and client.archived_at is null
    and client.commercial_status in ('active', 'budget', 'pending');

  if v_workspace_id is null
    or (select auth.uid()) is null
    or not (select private.is_active_workspace_owner(v_workspace_id)) then
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

  -- Serviço avulso alimenta o catálogo do workspace; nomes iguais reaproveitam o registro
  -- existente para não multiplicar entradas equivalentes.
  if p_service_id is null then
    select service.id
    into v_catalog_service_id
    from public.services as service
    where service.workspace_id = v_workspace_id
      and lower(service.name) = lower(v_normalized_name)
      and service.active
      and service.archived_at is null
    limit 1;

    if v_catalog_service_id is null then
      insert into public.services (
        workspace_id, name, description, active, default_price, default_billing_type,
        default_adjustment_interval_months, default_adjustment_rate
      ) values (
        v_workspace_id, v_normalized_name, nullif(btrim(p_description), ''), true,
        p_list_price, p_billing_type, p_adjustment_interval_months, p_adjustment_rate
      )
      on conflict (workspace_id, lower(name)) where active and archived_at is null do nothing
      returning id into v_catalog_service_id;
    end if;

    if v_catalog_service_id is null then
      select service.id
      into v_catalog_service_id
      from public.services as service
      where service.workspace_id = v_workspace_id
        and lower(service.name) = lower(v_normalized_name)
        and service.active
        and service.archived_at is null
      limit 1;
    end if;
  else
    if not exists (
      select 1 from public.services
      where id = p_service_id and workspace_id = v_workspace_id and active and archived_at is null
    ) then
      raise foreign_key_violation using message = 'catalog service is not available';
    end if;
    v_catalog_service_id := p_service_id;
  end if;

  insert into public.client_services (
    workspace_id, client_id, service_id, name, description,
    list_price, discount_type, discount_value, company_revenue,
    media_budget, additional_fee, billing_type, start_date, next_due_date,
    installment_count, promotional_price, promotional_cycles, promotional_cycles_used,
    adjustment_interval_months, adjustment_rate, next_adjustment_date, status, notes
  ) values (
    v_workspace_id, p_client_id, v_catalog_service_id, v_normalized_name,
    nullif(btrim(p_description), ''),
    p_list_price, p_discount_type, p_discount_value, v_company_revenue,
    p_media_budget, p_additional_fee, p_billing_type, p_start_date, p_next_due_date,
    p_installment_count, p_promotional_price, p_promotional_cycles, 0,
    p_adjustment_interval_months, p_adjustment_rate,
    case when p_adjustment_interval_months is null then null
      else private.add_months_clamped(p_start_date, p_adjustment_interval_months) end,
    'active', nullif(btrim(p_notes), '')
  ) returning id into v_service_instance_id;

  -- A promoção sempre começa no primeiro vencimento, independentemente da data de início.
  v_first_revenue := coalesce(p_promotional_price, v_company_revenue);
  v_total := v_company_revenue + p_media_budget + p_additional_fee;

  if p_billing_type = 'single' then
    if v_total = 0 then
      insert into public.charges (
        workspace_id, client_id, client_service_id, description, due_date,
        company_revenue, media_budget, additional_fee, status
      ) values (
        v_workspace_id, p_client_id, v_service_instance_id, v_normalized_name,
        p_next_due_date, 0, 0, 0, 'pending'
      );
    else
      if p_installment_count > greatest(
        round(v_company_revenue * 100)::integer,
        round(p_media_budget * 100)::integer,
        round(p_additional_fee * 100)::integer
      ) then
        raise check_violation using message = 'installment count exceeds divisible amount';
      end if;
      for v_index in 1..p_installment_count loop
        v_charge_revenue := (
          floor(v_company_revenue * 100 / p_installment_count)
          + case when v_index <= mod(round(v_company_revenue * 100)::integer, p_installment_count)
            then 1 else 0 end
        ) / 100;
        v_charge_media := (
          floor(p_media_budget * 100 / p_installment_count)
          + case when v_index <= mod(round(p_media_budget * 100)::integer, p_installment_count)
            then 1 else 0 end
        ) / 100;
        v_charge_additional := (
          floor(p_additional_fee * 100 / p_installment_count)
          + case when v_index <= mod(round(p_additional_fee * 100)::integer, p_installment_count)
            then 1 else 0 end
        ) / 100;

        insert into public.charges (
          workspace_id, client_id, client_service_id, description, due_date,
          company_revenue, media_budget, additional_fee, status
        ) values (
          v_workspace_id, p_client_id, v_service_instance_id,
          v_normalized_name || case when p_installment_count > 1
            then ' · parcela ' || v_index || '/' || p_installment_count else '' end,
          private.add_months_clamped(p_next_due_date, v_index - 1),
          v_charge_revenue, v_charge_media, v_charge_additional, 'pending'
        );
      end loop;
    end if;
  else
    -- Cobranças de valor zero são válidas e necessárias: sem elas o ciclo promocional
    -- gratuito nunca avançaria, porque o avanço acontece na liquidação.
    insert into public.charges (
      workspace_id, client_id, client_service_id, description, due_date,
      company_revenue, media_budget, additional_fee, status
    ) values (
      v_workspace_id, p_client_id, v_service_instance_id, v_normalized_name, p_next_due_date,
      v_first_revenue, p_media_budget, p_additional_fee, 'pending'
    );
  end if;

  return v_service_instance_id;
end;
$$;

revoke all on function public.apply_service_to_client(
  uuid, uuid, text, text, numeric, text, numeric, numeric, numeric, text,
  date, date, integer, numeric, integer, integer, numeric, text
) from public, anon, authenticated;
grant execute on function public.apply_service_to_client(
  uuid, uuid, text, text, numeric, text, numeric, numeric, numeric, text,
  date, date, integer, numeric, integer, integer, numeric, text
) to authenticated;

create or replace function public.settle_charge_and_schedule_next(
  p_charge_id uuid,
  p_payment_method text
)
returns date
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_charge public.charges%rowtype;
  v_service public.client_services%rowtype;
  v_next_due_date date;
  v_next_revenue numeric(15,2);
  v_promotion_cycles_used smallint;
begin
  select charge.*
  into v_charge
  from public.charges as charge
  where charge.id = p_charge_id
    and charge.status = 'pending'
  for update;

  if v_charge.id is null
    or (select auth.uid()) is null
    or not (select private.is_active_workspace_owner(v_charge.workspace_id)) then
    raise insufficient_privilege using message = 'pending workspace charge required';
  end if;

  update public.charges
  set
    paid_at = statement_timestamp(),
    payment_method = btrim(p_payment_method),
    status = 'paid'
  where id = v_charge.id;

  if v_charge.client_service_id is null then
    return null;
  end if;

  -- Serviço pausado não agenda o próximo ciclo; retomar restaura a agenda.
  select service.*
  into v_service
  from public.client_services as service
  where service.id = v_charge.client_service_id
    and service.workspace_id = v_charge.workspace_id
    and service.status = 'active'
  for update;

  if v_service.id is null or v_service.billing_type = 'single' then
    return null;
  end if;

  v_next_due_date := private.next_billing_date(v_charge.due_date, v_service.billing_type);
  v_promotion_cycles_used := case
    when v_service.promotional_price is not null
      then least(v_service.promotional_cycles_used + 1, v_service.promotional_cycles)
    else 0
  end;
  v_next_revenue := case
    when v_service.promotional_price is not null
      and v_promotion_cycles_used < v_service.promotional_cycles
      then v_service.promotional_price
    else v_service.company_revenue
  end;

  -- Um ciclo gratuito também gera cobrança: é ela que mantém a recorrência avançando.
  if not exists (
    select 1 from public.charges
    where client_service_id = v_service.id
      and due_date = v_next_due_date
      and status <> 'cancelled'
  ) then
    insert into public.charges (
      workspace_id, client_id, client_service_id, description, due_date,
      company_revenue, media_budget, additional_fee, status
    ) values (
      v_service.workspace_id, v_service.client_id, v_service.id, v_service.name,
      v_next_due_date, v_next_revenue, v_service.media_budget,
      v_service.additional_fee, 'pending'
    );
  end if;

  update public.client_services
  set
    next_due_date = v_next_due_date,
    promotional_cycles_used = v_promotion_cycles_used
  where id = v_service.id;

  return v_next_due_date;
end;
$$;

revoke all on function public.settle_charge_and_schedule_next(uuid, text)
from public, anon, authenticated;
grant execute on function public.settle_charge_and_schedule_next(uuid, text) to authenticated;

create or replace function public.delete_client_service_cascade(p_service_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
begin
  select service.workspace_id
  into v_workspace_id
  from public.client_services as service
  where service.id = p_service_id
  for update;

  if v_workspace_id is null then
    return 'not_found';
  end if;

  if (select auth.uid()) is null
    or not (select private.is_active_workspace_owner(v_workspace_id)) then
    raise insufficient_privilege using message = 'active workspace owner required';
  end if;

  if exists (
    select 1 from public.charges
    where workspace_id = v_workspace_id
      and client_service_id = p_service_id
      and (status = 'paid' or paid_at is not null)
  ) then
    return 'blocked';
  end if;

  delete from public.charges
  where workspace_id = v_workspace_id and client_service_id = p_service_id;

  delete from public.client_services
  where workspace_id = v_workspace_id and id = p_service_id;

  return 'deleted';
end;
$$;

create or replace function public.delete_catalog_service(p_service_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
begin
  select service.workspace_id
  into v_workspace_id
  from public.services as service
  where service.id = p_service_id
  for update;

  if v_workspace_id is null then
    return 'not_found';
  end if;

  if (select auth.uid()) is null
    or not (select private.is_active_workspace_owner(v_workspace_id)) then
    raise insufficient_privilege using message = 'active workspace owner required';
  end if;

  if exists (
    select 1 from public.client_services
    where workspace_id = v_workspace_id and service_id = p_service_id
  ) then
    return 'blocked';
  end if;

  delete from public.services
  where workspace_id = v_workspace_id and id = p_service_id;

  return 'deleted';
end;
$$;

revoke all on function public.delete_client_service_cascade(uuid) from public, anon, authenticated;
revoke all on function public.delete_catalog_service(uuid) from public, anon, authenticated;
grant execute on function public.delete_client_service_cascade(uuid) to authenticated;
grant execute on function public.delete_catalog_service(uuid) to authenticated;

comment on function public.delete_client_service_cascade(uuid) is
  'Remove um serviço do cliente e suas cobranças não pagas; bloqueia diante de pagamento confirmado.';

comment on function public.delete_catalog_service(uuid) is
  'Remove um serviço do catálogo somente quando nenhum cliente o utiliza.';

comment on column public.clients.website is
  'Host do site do cliente em minúsculas, sem protocolo; a interface monta o link.';
