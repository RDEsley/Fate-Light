create or replace function private.get_current_account_gate()
returns table (
  has_profile boolean,
  account_status text,
  has_workspace boolean,
  workspace_status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    profile.id is not null as has_profile,
    profile.account_status,
    workspace.id is not null as has_workspace,
    workspace.status as workspace_status
  from (select auth.uid() as user_id) as identity
  left join public.profiles as profile
    on profile.id = identity.user_id
  left join public.workspaces as workspace
    on workspace.created_by = identity.user_id
  where identity.user_id is not null;
$$;

create or replace function public.get_current_account_gate()
returns table (
  has_profile boolean,
  account_status text,
  has_workspace boolean,
  workspace_status text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.get_current_account_gate();
$$;

comment on function private.get_current_account_gate() is
  'Resolve somente os estados necessarios ao roteamento da conta autenticada.';

comment on function public.get_current_account_gate() is
  'RPC invoker sem parametros para o gate de conta derivado de auth.uid().';

revoke all privileges on function private.get_current_account_gate()
from public, anon, authenticated;

revoke all privileges on function public.get_current_account_gate()
from public, anon, authenticated;

grant execute on function private.get_current_account_gate() to authenticated;
grant execute on function public.get_current_account_gate() to authenticated;
