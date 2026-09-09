-- Despesas recorrentes herdam client_entity_id na criação e no próximo ciclo.
drop function if exists public.create_expense_with_recurrence(
  text, text, numeric, date, text, text, uuid, text, boolean
);

create or replace function public.create_expense_with_recurrence(
  p_description text,
  p_category text,
  p_amount numeric,
  p_due_date date,
  p_expense_type text,
  p_status text,
  p_client_id uuid default null,
  p_notes text default null,
  p_enable_recurrence boolean default false,
  p_client_entity_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_workspace_id uuid;
  v_group_id uuid;
  v_expense_id uuid;
  v_next_id uuid;
  v_next_due_date date;
  v_paid_at timestamptz;
  v_status text := nullif(btrim(coalesce(p_status, '')), '');
  v_type text := nullif(btrim(coalesce(p_expense_type, '')), '');
  v_enable boolean := coalesce(p_enable_recurrence, false);
  v_entity_id uuid := p_client_entity_id;
begin
  select member.workspace_id
  into v_workspace_id
  from public.workspace_members as member
  join public.workspaces as workspace on workspace.id = member.workspace_id
  join public.profiles as profile on profile.id = member.user_id
  where member.user_id = v_user_id
    and member.role = 'owner'
    and member.status = 'active'
    and workspace.status = 'active'
    and profile.account_status = 'active'
  order by member.created_at
  limit 1;

  if v_user_id is null or v_workspace_id is null
    or not (select private.is_active_workspace_owner(v_workspace_id)) then
    raise insufficient_privilege using message = 'active workspace owner required';
  end if;

  if v_status is null or v_status not in ('pending', 'paid') then
    raise check_violation using message = 'expense status must be pending or paid';
  end if;

  if v_type is null or v_type not in ('fixed', 'variable') then
    raise check_violation using message = 'expense type must be fixed or variable';
  end if;

  if v_enable and v_type is distinct from 'fixed' then
    raise check_violation using message = 'only fixed expenses can recur';
  end if;

  if v_entity_id is not null and p_client_id is null then
    raise check_violation using message = 'client entity requires client';
  end if;

  if p_client_id is not null and not exists (
    select 1
    from public.clients as client
    where client.id = p_client_id
      and client.workspace_id = v_workspace_id
  ) then
    raise foreign_key_violation using message = 'client is not available in workspace';
  end if;

  if v_entity_id is not null and not exists (
    select 1
    from public.client_entities as entity
    where entity.id = v_entity_id
      and entity.workspace_id = v_workspace_id
      and entity.client_id = p_client_id
      and entity.archived_at is null
      and entity.status = 'active'
  ) then
    raise foreign_key_violation using message = 'client entity is not available';
  end if;

  if v_status = 'paid' then
    v_paid_at := (p_due_date::text || ' 12:00:00+00')::timestamptz;
  else
    v_paid_at := null;
  end if;

  if v_enable then
    v_group_id := gen_random_uuid();
  end if;

  insert into public.expenses (
    workspace_id,
    client_id,
    client_entity_id,
    description,
    category,
    amount,
    due_date,
    status,
    paid_at,
    expense_type,
    notes,
    recurrence_group_id,
    recurrence_frequency,
    recurrence_sequence,
    recurrence_active
  ) values (
    v_workspace_id,
    p_client_id,
    v_entity_id,
    btrim(p_description),
    p_category,
    p_amount,
    p_due_date,
    v_status,
    v_paid_at,
    v_type,
    nullif(btrim(coalesce(p_notes, '')), ''),
    v_group_id,
    case when v_enable then 'monthly' else null end,
    case when v_enable then 1 else null end,
    v_enable
  )
  returning id into v_expense_id;

  if v_enable and v_status = 'paid' then
    v_next_due_date := private.add_months_clamped(p_due_date, 1);

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
      v_workspace_id,
      p_client_id,
      v_entity_id,
      btrim(p_description),
      p_category,
      p_amount,
      v_next_due_date,
      'pending',
      v_type,
      nullif(btrim(coalesce(p_notes, '')), ''),
      v_group_id,
      'monthly',
      2,
      true
    )
    on conflict (workspace_id, recurrence_group_id, due_date)
      where recurrence_group_id is not null
    do nothing
    returning id into v_next_id;

    if v_next_id is null then
      select expense.id
      into v_next_id
      from public.expenses as expense
      where expense.workspace_id = v_workspace_id
        and expense.recurrence_group_id = v_group_id
        and expense.due_date = v_next_due_date;
    end if;
  end if;

  return jsonb_build_object(
    'status', 'created',
    'expense_id', v_expense_id,
    'recurrence_group_id', to_jsonb(v_group_id),
    'next_due_date', to_jsonb(v_next_due_date),
    'next_expense_id', to_jsonb(v_next_id)
  );
end;
$$;

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

revoke all on function public.create_expense_with_recurrence(
  text, text, numeric, date, text, text, uuid, text, boolean, uuid
) from public, anon, authenticated;
grant execute on function public.create_expense_with_recurrence(
  text, text, numeric, date, text, text, uuid, text, boolean, uuid
) to authenticated;

comment on function public.create_expense_with_recurrence(
  text, text, numeric, date, text, text, uuid, text, boolean, uuid
) is
  'Cria despesa com entity opcional; recorrência mensa herda client_entity_id.';
