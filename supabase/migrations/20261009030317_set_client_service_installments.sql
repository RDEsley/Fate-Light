-- Permite mudar a quantidade de parcelas de um serviço de cobrança única enquanto nenhuma
-- parcela foi paga. As pendentes são recriadas com o mesmo rateio de
-- apply_service_to_client; depois do primeiro pagamento a função recusa a troca.

create or replace function public.set_client_service_installments(
  p_service_id uuid,
  p_installment_count integer
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_service public.client_services%rowtype;
  v_first_due date;
  v_charge_revenue numeric(15,2);
  v_charge_media numeric(15,2);
  v_charge_additional numeric(15,2);
  v_index integer;
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

  if v_service.billing_type <> 'single' or p_installment_count not between 1 and 120 then
    return 'invalid';
  end if;

  if p_installment_count = v_service.installment_count then
    return 'unchanged';
  end if;

  -- Parcela paga é histórico financeiro: a partir dela a divisão não muda mais.
  if exists (
    select 1 from public.charges as charge
    where charge.client_service_id = p_service_id
      and charge.workspace_id = v_service.workspace_id
      and charge.status = 'paid'
  ) then
    return 'locked';
  end if;

  if p_installment_count > 1 and p_installment_count > greatest(
    round(v_service.company_revenue * 100)::integer,
    round(v_service.media_budget * 100)::integer,
    round(v_service.additional_fee * 100)::integer
  ) then
    raise check_violation using message = 'installment count exceeds divisible amount';
  end if;

  select min(charge.due_date)
  into v_first_due
  from public.charges as charge
  where charge.client_service_id = p_service_id
    and charge.workspace_id = v_service.workspace_id
    and charge.status = 'pending';
  v_first_due := coalesce(v_first_due, v_service.next_due_date, current_date);

  delete from public.charges as charge
  where charge.client_service_id = p_service_id
    and charge.workspace_id = v_service.workspace_id
    and charge.status = 'pending';

  for v_index in 1..p_installment_count loop
    v_charge_revenue := (
      floor(v_service.company_revenue * 100 / p_installment_count)
      + case when v_index <= mod(round(v_service.company_revenue * 100)::integer, p_installment_count)
        then 1 else 0 end
    ) / 100;
    v_charge_media := (
      floor(v_service.media_budget * 100 / p_installment_count)
      + case when v_index <= mod(round(v_service.media_budget * 100)::integer, p_installment_count)
        then 1 else 0 end
    ) / 100;
    v_charge_additional := (
      floor(v_service.additional_fee * 100 / p_installment_count)
      + case when v_index <= mod(round(v_service.additional_fee * 100)::integer, p_installment_count)
        then 1 else 0 end
    ) / 100;

    insert into public.charges (
      workspace_id, client_id, client_entity_id, client_service_id, description, due_date,
      company_revenue, media_budget, additional_fee, additional_fee_is_revenue, status
    ) values (
      v_service.workspace_id, v_service.client_id, v_service.client_entity_id, v_service.id,
      v_service.name || case when p_installment_count > 1
        then ' · parcela ' || v_index || '/' || p_installment_count else '' end,
      private.add_months_clamped(v_first_due, v_index - 1),
      v_charge_revenue, v_charge_media, v_charge_additional,
      v_service.additional_fee_is_revenue, 'pending'
    );
  end loop;

  update public.client_services
  set installment_count = p_installment_count
  where id = p_service_id;

  return 'updated';
end;
$$;

revoke all on function public.set_client_service_installments(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.set_client_service_installments(uuid, integer)
  to authenticated;

comment on function public.set_client_service_installments(uuid, integer) is
  'Redivide um serviço de cobrança única em outra quantidade de parcelas enquanto nenhuma foi paga.';
