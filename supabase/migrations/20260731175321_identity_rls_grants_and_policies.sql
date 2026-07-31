alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated, service_role;

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.workspaces enable row level security;
alter table public.workspaces force row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_members force row level security;
alter table public.workspace_settings enable row level security;
alter table public.workspace_settings force row level security;
alter table public.legal_documents enable row level security;
alter table public.legal_documents force row level security;
alter table public.legal_acceptances enable row level security;
alter table public.legal_acceptances force row level security;

revoke all privileges on table
  public.profiles,
  public.workspaces,
  public.workspace_members,
  public.workspace_settings,
  public.legal_documents,
  public.legal_acceptances
from public, anon, authenticated;

revoke all privileges on table private.identity_bootstrap_audit_events
from public, anon, authenticated;

revoke all privileges on all functions in schema private
from public, anon, authenticated;

revoke all privileges on function public.bootstrap_identity_workspace(
  text, text, uuid[], text, text, text, text, text, text, text, text, text, text, smallint[]
)
from public, anon, authenticated;

grant usage on schema public to authenticated;
grant usage on schema private to authenticated;

grant execute on function private.is_valid_timezone(text) to authenticated;
grant execute on function private.are_valid_alert_offsets(smallint[]) to authenticated;
grant execute on function private.current_user_is_active() to authenticated;
grant execute on function private.current_user_can_read_legal_documents() to authenticated;
grant execute on function private.is_active_workspace_owner(uuid) to authenticated;
grant execute on function private.bootstrap_identity_workspace(
  text, text, uuid[], text, text, text, text, text, text, text, text, text, text, smallint[]
) to authenticated;
grant execute on function public.bootstrap_identity_workspace(
  text, text, uuid[], text, text, text, text, text, text, text, text, text, text, smallint[]
) to authenticated;

grant select on table public.profiles to authenticated;
grant update (full_name, phone, locale, timezone, theme)
  on table public.profiles to authenticated;

grant select on table public.workspaces to authenticated;
grant update (name) on table public.workspaces to authenticated;

grant select on table public.workspace_members to authenticated;

grant select on table public.workspace_settings to authenticated;
grant update (
  legal_name,
  trade_name,
  tax_id,
  address_line1,
  address_line2,
  address_district,
  address_city,
  address_region,
  postal_code,
  country_code,
  date_format,
  accounting_basis,
  default_alert_offsets,
  general_settings
) on table public.workspace_settings to authenticated;

grant select on table public.legal_documents to authenticated;
grant select on table public.legal_acceptances to authenticated;

create policy profiles_select_own_active
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  and (select private.current_user_is_active())
);

create policy profiles_update_own_allowed_fields
on public.profiles
for update
to authenticated
using (
  id = (select auth.uid())
  and (select private.current_user_is_active())
)
with check (
  id = (select auth.uid())
  and (select private.current_user_is_active())
);

create policy workspaces_select_active_owner
on public.workspaces
for select
to authenticated
using ((select private.is_active_workspace_owner(id)));

create policy workspaces_update_name_as_active_owner
on public.workspaces
for update
to authenticated
using ((select private.is_active_workspace_owner(id)))
with check ((select private.is_active_workspace_owner(id)));

create policy workspace_members_select_own_active_owner
on public.workspace_members
for select
to authenticated
using (
  user_id = (select auth.uid())
  and (select private.is_active_workspace_owner(workspace_id))
);

create policy workspace_settings_select_active_owner
on public.workspace_settings
for select
to authenticated
using ((select private.is_active_workspace_owner(workspace_id)));

create policy workspace_settings_update_as_active_owner
on public.workspace_settings
for update
to authenticated
using ((select private.is_active_workspace_owner(workspace_id)))
with check ((select private.is_active_workspace_owner(workspace_id)));

create policy legal_documents_select_current_authenticated
on public.legal_documents
for select
to authenticated
using (
  status = 'published'
  and effective_at <= statement_timestamp()
  and (select private.current_user_can_read_legal_documents())
);

create policy legal_acceptances_select_own_active
on public.legal_acceptances
for select
to authenticated
using (
  user_id = (select auth.uid())
  and (select private.current_user_is_active())
);
