create table public.manual_alerts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  title text not null,
  notes text,
  due_on date not null,
  severity text not null default 'warning',
  state text not null default 'open',
  resolved_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid not null default auth.uid(),
  updated_by uuid not null default auth.uid(),
  constraint manual_alerts_title_check check (char_length(btrim(title)) between 2 and 120),
  constraint manual_alerts_notes_check check (notes is null or char_length(notes) <= 1000),
  constraint manual_alerts_severity_check check (severity in ('warning', 'danger')),
  constraint manual_alerts_state_check check (state in ('open', 'resolved')),
  constraint manual_alerts_resolution_check check (
    (state = 'open' and resolved_at is null)
    or (state = 'resolved' and resolved_at is not null)
  )
);

create index manual_alerts_workspace_state_due_idx
  on public.manual_alerts (workspace_id, state, due_on, created_at desc);

alter table public.manual_alerts enable row level security;
alter table public.manual_alerts force row level security;

revoke all on table public.manual_alerts from public, anon, authenticated;
grant select, delete on table public.manual_alerts to authenticated;
grant insert (workspace_id, title, notes, due_on, severity)
  on table public.manual_alerts to authenticated;
grant update (title, notes, due_on, severity, state, resolved_at)
  on table public.manual_alerts to authenticated;

create trigger manual_alerts_set_updated_at
before update on public.manual_alerts
for each row execute function private.set_updated_at();

create trigger manual_alerts_set_updated_by
before update on public.manual_alerts
for each row execute function private.set_operational_updated_by();

create policy manual_alerts_select_owner on public.manual_alerts
for select to authenticated
using ((select private.is_active_workspace_owner(workspace_id)));

create policy manual_alerts_insert_owner on public.manual_alerts
for insert to authenticated
with check ((select private.is_active_workspace_owner(workspace_id)));

create policy manual_alerts_update_owner on public.manual_alerts
for update to authenticated
using ((select private.is_active_workspace_owner(workspace_id)))
with check ((select private.is_active_workspace_owner(workspace_id)));

create policy manual_alerts_delete_owner on public.manual_alerts
for delete to authenticated
using ((select private.is_active_workspace_owner(workspace_id)));

comment on table public.manual_alerts is
  'Lembretes avulsos internos do workspace; não envia e-mail nem push.';
