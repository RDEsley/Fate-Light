-- Hardening: settle de despesa já paga é idempotente sem reagendar;
-- excluir ocorrência pendente de série mensal encerra a recorrência do grupo.

create or replace function public.settle_expense_and_schedule_next(p_expense_id uuid)
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

  -- Já liquidada: não reagenda. Evita retry/stale ou settle após exclusão
  -- da próxima pendente regenerar ocorrência indevida.
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
    paid_at = statement_timestamp()
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

-- Preserva a semântica de ADR-0013/0017 e acrescenta: excluir pendente de série
-- mensal desativa recurrence_active no grupo (equivale a parar a recorrência).
create or replace function public.delete_workspace_record(p_record_type text, p_record_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_group_id uuid;
begin
  case p_record_type
    when 'service' then
      select workspace_id into v_workspace_id
      from public.client_services where id = p_record_id for update;
    when 'charge' then
      select workspace_id into v_workspace_id
      from public.charges where id = p_record_id for update;
    when 'expense' then
      select workspace_id, recurrence_group_id
      into v_workspace_id, v_group_id
      from public.expenses where id = p_record_id for update;
    when 'domain' then
      select workspace_id into v_workspace_id
      from public.domains where id = p_record_id for update;
    else
      raise invalid_parameter_value using message = 'unsupported record type';
  end case;

  if v_workspace_id is null then
    return 'not_found';
  end if;

  if (select auth.uid()) is null
    or not (select private.is_active_workspace_owner(v_workspace_id)) then
    raise insufficient_privilege using message = 'active workspace owner required';
  end if;

  case p_record_type
    when 'service' then
      if exists (
        select 1 from public.client_services
        where id = p_record_id and workspace_id = v_workspace_id and status <> 'ended'
      ) or exists (
        select 1 from public.charges
        where workspace_id = v_workspace_id and client_service_id = p_record_id
      ) then
        return 'blocked';
      end if;
      delete from public.client_services
      where id = p_record_id and workspace_id = v_workspace_id;
    when 'charge' then
      if exists (
        select 1 from public.charges
        where id = p_record_id and workspace_id = v_workspace_id
          and (status = 'paid' or paid_at is not null)
          and not (
            client_service_id is null
            and payment_method = 'Histórico'
            and description = 'Histórico anterior ao sistema'
            and notes = 'Valor consolidado informado no cadastro do cliente.'
          )
      ) then
        return 'blocked';
      end if;
      delete from public.charges
      where id = p_record_id and workspace_id = v_workspace_id;
    when 'expense' then
      if exists (
        select 1 from public.expenses
        where id = p_record_id and workspace_id = v_workspace_id
          and (status = 'paid' or paid_at is not null)
      ) then
        return 'blocked';
      end if;

      if v_group_id is not null then
        update public.expenses
        set recurrence_active = false
        where workspace_id = v_workspace_id
          and recurrence_group_id = v_group_id
          and recurrence_active;
      end if;

      delete from public.expenses
      where id = p_record_id and workspace_id = v_workspace_id;
    when 'domain' then
      if exists (
        select 1 from public.domains
        where id = p_record_id and workspace_id = v_workspace_id and status <> 'cancelled'
      ) then
        return 'blocked';
      end if;
      delete from public.domains
      where id = p_record_id and workspace_id = v_workspace_id;
  end case;

  return 'deleted';
end;
$$;

comment on function public.settle_expense_and_schedule_next(uuid) is
  'Marca despesa pendente como paga e agenda a próxima mensal se a série estiver ativa; já paga retorna already_settled sem reagendar.';
comment on function public.delete_workspace_record(text, uuid) is
  'Exclui registros operacionais elegíveis; ao excluir pendente de série mensal, desativa recurrence_active do grupo. Movimento pago só via exceção ADR-0017 ou delete_paid_financial_record.';
