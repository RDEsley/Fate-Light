alter table public.client_services
  drop constraint client_services_billing_type_check,
  add constraint client_services_billing_type_check check (
    billing_type in (
      'single',
      'daily',
      'weekly',
      'biweekly',
      'monthly',
      'bimonthly',
      'quarterly',
      'semiannual',
      'annual'
    )
  );

create or replace function public.delete_client_record(p_client_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
begin
  select client.workspace_id
  into v_workspace_id
  from public.clients as client
  where client.id = p_client_id
  for update;

  if v_workspace_id is null then
    return 'not_found';
  end if;

  if (select auth.uid()) is null
    or not (select private.is_active_workspace_owner(v_workspace_id)) then
    raise insufficient_privilege using message = 'active workspace owner required';
  end if;

  if exists (
    select 1 from public.client_services where workspace_id = v_workspace_id and client_id = p_client_id
    union all
    select 1 from public.charges where workspace_id = v_workspace_id and client_id = p_client_id
    union all
    select 1 from public.expenses where workspace_id = v_workspace_id and client_id = p_client_id
    union all
    select 1 from public.domains where workspace_id = v_workspace_id and client_id = p_client_id
  ) then
    return 'blocked';
  end if;

  delete from public.client_contacts
  where workspace_id = v_workspace_id and client_id = p_client_id;

  delete from public.clients
  where workspace_id = v_workspace_id and id = p_client_id;

  return 'deleted';
end;
$$;

create or replace function public.delete_workspace_record(p_record_type text, p_record_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
begin
  case p_record_type
    when 'service' then
      select workspace_id into v_workspace_id
      from public.client_services where id = p_record_id for update;
    when 'charge' then
      select workspace_id into v_workspace_id
      from public.charges where id = p_record_id for update;
    when 'expense' then
      select workspace_id into v_workspace_id
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

create or replace function public.reset_current_workspace_operational_data(p_confirmation text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_workspace_id uuid;
  v_counts jsonb;
begin
  if p_confirmation <> 'EXCLUIR TUDO' then
    raise invalid_parameter_value using message = 'invalid confirmation';
  end if;

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
  limit 1
  for update of workspace;

  if v_user_id is null or v_workspace_id is null then
    raise insufficient_privilege using message = 'active workspace owner required';
  end if;

  select jsonb_build_object(
    'clients', (select count(*) from public.clients where workspace_id = v_workspace_id),
    'services', (select count(*) from public.client_services where workspace_id = v_workspace_id),
    'charges', (select count(*) from public.charges where workspace_id = v_workspace_id),
    'expenses', (select count(*) from public.expenses where workspace_id = v_workspace_id),
    'domains', (select count(*) from public.domains where workspace_id = v_workspace_id)
  ) into v_counts;

  delete from public.charges where workspace_id = v_workspace_id;
  delete from public.expenses where workspace_id = v_workspace_id;
  delete from public.domains where workspace_id = v_workspace_id;
  delete from public.client_services where workspace_id = v_workspace_id;
  delete from public.client_contacts where workspace_id = v_workspace_id;
  delete from public.clients where workspace_id = v_workspace_id;
  delete from public.services where workspace_id = v_workspace_id;
  delete from public.vendors where workspace_id = v_workspace_id;
  delete from public.expense_categories where workspace_id = v_workspace_id;
  delete from public.import_jobs where workspace_id = v_workspace_id;
  delete from public.audit_events where workspace_id = v_workspace_id;

  return v_counts;
end;
$$;

revoke all on function public.delete_client_record(uuid) from public, anon, authenticated;
revoke all on function public.delete_workspace_record(text, uuid) from public, anon, authenticated;
revoke all on function public.reset_current_workspace_operational_data(text)
from public, anon, authenticated;

grant execute on function public.delete_client_record(uuid) to authenticated;
grant execute on function public.delete_workspace_record(text, uuid) to authenticated;
grant execute on function public.reset_current_workspace_operational_data(text) to authenticated;

comment on function public.delete_client_record(uuid) is
  'Exclui um cliente sem histórico financeiro ou operacional vinculado, sob autorização do owner.';
comment on function public.delete_workspace_record(text, uuid) is
  'Exclui somente registros operacionais elegíveis e nunca movimentos financeiros confirmados.';
comment on function public.reset_current_workspace_operational_data(text) is
  'Remove atomicamente dados operacionais do workspace atual após confirmação reforçada.';
