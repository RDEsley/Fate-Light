-- A baixa sempre gravava "agora" como data do pagamento. Quem registra com atraso um
-- pagamento que chegou dias antes jogava a receita (ou o custo) no mês errado do dashboard e
-- do histórico. As duas funções de baixa passam a aceitar a data em que o dinheiro entrou ou
-- saiu (`p_paid_on`, opcional: sem ela continua valendo "agora"). Gravada às 12:00 UTC, como
-- a cobrança criada já paga, para cair no mesmo dia em qualquer fuso do Brasil. O ciclo
-- seguinte continua contado a partir do vencimento, não da data do pagamento.
--
-- A assinatura muda, então as versões antigas saem antes: manter as duas deixaria a chamada
-- com dois argumentos ambígua.

drop function public.settle_charge_and_schedule_next(uuid, text);
drop function public.settle_expense_and_schedule_next(uuid);

create or replace function public.settle_charge_and_schedule_next(
  p_charge_id uuid,
  p_payment_method text,
  p_paid_on date default null
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
  v_entity_id uuid;
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

  -- O pagamento pode ter chegado antes de ser registrado; o futuro não é aceito.
  if p_paid_on is not null and p_paid_on > current_date + 1 then
    raise check_violation using message = 'payment date cannot be in the future';
  end if;

  update public.charges
  set
    paid_at = coalesce((p_paid_on + time '12:00') at time zone 'UTC', statement_timestamp()),
    payment_method = btrim(p_payment_method),
    status = 'paid'
  where id = v_charge.id;

  if v_charge.client_service_id is null then
    return null;
  end if;

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

  v_entity_id := coalesce(v_service.client_entity_id, v_charge.client_entity_id);
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

  if not exists (
    select 1 from public.charges
    where client_service_id = v_service.id
      and due_date = v_next_due_date
      and status <> 'cancelled'
  ) then
    insert into public.charges (
      workspace_id, client_id, client_entity_id, client_service_id, description, due_date,
      company_revenue, media_budget, additional_fee, additional_fee_is_revenue, status
    ) values (
      v_service.workspace_id, v_service.client_id, v_entity_id, v_service.id, v_service.name,
      v_next_due_date, v_next_revenue, v_service.media_budget,
      v_service.additional_fee, v_service.additional_fee_is_revenue, 'pending'
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

create or replace function public.settle_expense_and_schedule_next(
  p_expense_id uuid,
  p_paid_on date default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expense public.expenses%rowtype;
  v_next_due_date date;
  v_next_id uuid;
  v_scheduled boolean := false;
begin
  select expense.*
  into v_expense
  from public.expenses as expense
  where expense.id = p_expense_id
  for update;

  if v_expense.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  if (select auth.uid()) is null
    or not (select private.is_active_workspace_owner(v_expense.workspace_id)) then
    raise insufficient_privilege using message = 'active workspace owner required';
  end if;

  -- O pagamento pode ter chegado antes de ser registrado; o futuro não é aceito.
  if p_paid_on is not null and p_paid_on > current_date + 1 then
    raise check_violation using message = 'payment date cannot be in the future';
  end if;

  if v_expense.status is distinct from 'pending' then
    return jsonb_build_object(
      'status', 'already_settled',
      'expense_id', v_expense.id,
      'next_due_date', null,
      'next_expense_id', null,
      'scheduled', false
    );
  end if;

  update public.expenses
  set
    status = 'paid',
    paid_at = coalesce((p_paid_on + time '12:00') at time zone 'UTC', statement_timestamp())
  where id = v_expense.id
    and workspace_id = v_expense.workspace_id;

  v_expense.status := 'paid';

  if v_expense.expense_type = 'fixed'
    and v_expense.recurrence_active
    and v_expense.recurrence_frequency = 'monthly'
    and v_expense.recurrence_group_id is not null then
    v_next_due_date := private.add_months_clamped(v_expense.due_date, 1);

    select expense.id
    into v_next_id
    from public.expenses as expense
    where expense.workspace_id = v_expense.workspace_id
      and expense.recurrence_group_id = v_expense.recurrence_group_id
      and expense.due_date = v_next_due_date;

    if v_next_id is null then
      insert into public.expenses (
        workspace_id,
        client_id,
        client_entity_id,
        description,
        category,
        amount,
        due_date,
        status,
        expense_type,
        notes,
        recurrence_group_id,
        recurrence_frequency,
        recurrence_sequence,
        recurrence_active
      ) values (
        v_expense.workspace_id,
        v_expense.client_id,
        v_expense.client_entity_id,
        v_expense.description,
        v_expense.category,
        v_expense.amount,
        v_next_due_date,
        'pending',
        v_expense.expense_type,
        v_expense.notes,
        v_expense.recurrence_group_id,
        v_expense.recurrence_frequency,
        v_expense.recurrence_sequence + 1,
        true
      )
      returning id into v_next_id;

      v_scheduled := true;
    end if;
  end if;

  return jsonb_build_object(
    'status', 'settled',
    'expense_id', v_expense.id,
    'next_due_date', to_jsonb(v_next_due_date),
    'next_expense_id', to_jsonb(v_next_id),
    'scheduled', v_scheduled
  );
end;
$$;

revoke all on function public.settle_charge_and_schedule_next(uuid, text, date)
  from public, anon, authenticated;
grant execute on function public.settle_charge_and_schedule_next(uuid, text, date)
  to authenticated;

revoke all on function public.settle_expense_and_schedule_next(uuid, date)
  from public, anon, authenticated;
grant execute on function public.settle_expense_and_schedule_next(uuid, date)
  to authenticated;

comment on function public.settle_expense_and_schedule_next(uuid, date) is
  'Marca despesa pendente como paga (na data informada ou agora) e agenda a próxima mensal se a série estiver ativa; já paga retorna already_settled sem reagendar.';
