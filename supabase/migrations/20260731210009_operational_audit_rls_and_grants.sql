create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  reason text,
  changed_fields text[] not null,
  before_json jsonb,
  after_json jsonb,
  occurred_at timestamptz not null default statement_timestamp(),
  correlation_id uuid not null default gen_random_uuid(),
  constraint audit_events_correlation_id_unique unique (correlation_id),
  constraint audit_events_entity_type_check
    check (
      entity_type in ('client', 'client_contact', 'service', 'vendor', 'expense_category')
    ),
  constraint audit_events_action_check
    check (
      action ~ '^(client|client_contact|service|vendor|expense_category)\.(created|updated|archived|restored)$'
    ),
  constraint audit_events_reason_length_check
    check (reason is null or char_length(btrim(reason)) between 2 and 500),
  constraint audit_events_changed_fields_check
    check (cardinality(changed_fields) between 1 and 30),
  constraint audit_events_before_json_check
    check (
      before_json is null
      or (jsonb_typeof(before_json) = 'object' and octet_length(before_json::text) <= 8192)
    ),
  constraint audit_events_after_json_check
    check (
      after_json is null
      or (jsonb_typeof(after_json) = 'object' and octet_length(after_json::text) <= 8192)
    )
);

create index audit_events_workspace_occurred_idx
  on public.audit_events (workspace_id, occurred_at desc);

create index audit_events_workspace_entity_occurred_idx
  on public.audit_events (workspace_id, entity_type, entity_id, occurred_at desc);

create index audit_events_workspace_actor_occurred_idx
  on public.audit_events (workspace_id, actor_user_id, occurred_at desc);

create index audit_events_actor_idx
  on public.audit_events (actor_user_id);

create or replace function private.set_operational_updated_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    new.updated_by := (select auth.uid());
  end if;
  return new;
end;
$$;

create or replace function private.audit_operational_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_user_id uuid := (select auth.uid());
  v_workspace_id uuid := new.workspace_id;
  v_entity_type text;
  v_action text;
  v_changed_fields text[];
  v_new_row jsonb := to_jsonb(new);
  v_old_row jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
begin
  if v_actor_user_id is null
    or not (select private.is_active_workspace_owner(v_workspace_id)) then
    raise exception using
      errcode = '42501',
      message = 'An active workspace owner is required to change operational records.';
  end if;

  v_entity_type := case tg_table_name
    when 'clients' then 'client'
    when 'client_contacts' then 'client_contact'
    when 'services' then 'service'
    when 'vendors' then 'vendor'
    when 'expense_categories' then 'expense_category'
    else null
  end;

  if v_entity_type is null then
    raise exception using
      errcode = '22023',
      message = 'Unsupported operational audit source.';
  end if;

  if tg_op = 'INSERT' then
    v_action := v_entity_type || '.created';
    select coalesce(array_agg(field.key order by field.key), '{}'::text[])
    into v_changed_fields
    from jsonb_each(v_new_row) as field
    where field.key not in (
      'id',
      'workspace_id',
      'created_at',
      'updated_at',
      'created_by',
      'updated_by'
    )
      and field.value <> 'null'::jsonb;
  else
    select coalesce(array_agg(new_field.key order by new_field.key), '{}'::text[])
    into v_changed_fields
    from jsonb_each(v_new_row) as new_field
    join jsonb_each(v_old_row) as old_field using (key)
    where new_field.key not in ('updated_at', 'updated_by')
      and new_field.value is distinct from old_field.value;

    if cardinality(v_changed_fields) = 0 then
      return new;
    end if;

    v_action := case
      when old.archived_at is null and new.archived_at is not null
        then v_entity_type || '.archived'
      when old.archived_at is not null and new.archived_at is null
        then v_entity_type || '.restored'
      else v_entity_type || '.updated'
    end;
  end if;

  insert into public.audit_events (
    workspace_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    changed_fields
  )
  values (
    v_workspace_id,
    v_actor_user_id,
    v_action,
    v_entity_type,
    new.id,
    v_changed_fields
  );

  return new;
end;
$$;

create trigger clients_set_updated_at
before update on public.clients
for each row execute function private.set_updated_at();
create trigger clients_set_updated_by
before update on public.clients
for each row execute function private.set_operational_updated_by();
create trigger clients_audit_change
after insert or update on public.clients
for each row execute function private.audit_operational_change();

create trigger client_contacts_set_updated_at
before update on public.client_contacts
for each row execute function private.set_updated_at();
create trigger client_contacts_set_updated_by
before update on public.client_contacts
for each row execute function private.set_operational_updated_by();
create trigger client_contacts_audit_change
after insert or update on public.client_contacts
for each row execute function private.audit_operational_change();

create trigger services_set_updated_at
before update on public.services
for each row execute function private.set_updated_at();
create trigger services_set_updated_by
before update on public.services
for each row execute function private.set_operational_updated_by();
create trigger services_audit_change
after insert or update on public.services
for each row execute function private.audit_operational_change();

create trigger vendors_set_updated_at
before update on public.vendors
for each row execute function private.set_updated_at();
create trigger vendors_set_updated_by
before update on public.vendors
for each row execute function private.set_operational_updated_by();
create trigger vendors_audit_change
after insert or update on public.vendors
for each row execute function private.audit_operational_change();

create trigger expense_categories_set_updated_at
before update on public.expense_categories
for each row execute function private.set_updated_at();
create trigger expense_categories_set_updated_by
before update on public.expense_categories
for each row execute function private.set_operational_updated_by();
create trigger expense_categories_audit_change
after insert or update on public.expense_categories
for each row execute function private.audit_operational_change();

alter table public.clients enable row level security;
alter table public.clients force row level security;
alter table public.client_contacts enable row level security;
alter table public.client_contacts force row level security;
alter table public.services enable row level security;
alter table public.services force row level security;
alter table public.vendors enable row level security;
alter table public.vendors force row level security;
alter table public.expense_categories enable row level security;
alter table public.expense_categories force row level security;
alter table public.audit_events enable row level security;
alter table public.audit_events force row level security;

revoke all privileges on table
  public.clients,
  public.client_contacts,
  public.services,
  public.vendors,
  public.expense_categories,
  public.audit_events
from public, anon, authenticated, service_role;

revoke all privileges on function private.are_valid_tags(text[])
from public, anon, authenticated, service_role;
revoke all privileges on function private.is_valid_client_address(jsonb)
from public, anon, authenticated, service_role;
revoke all privileges on function private.is_valid_vendor_contact(jsonb)
from public, anon, authenticated, service_role;
revoke all privileges on function private.set_operational_updated_by()
from public, anon, authenticated, service_role;
revoke all privileges on function private.audit_operational_change()
from public, anon, authenticated, service_role;

grant execute on function private.are_valid_tags(text[]) to authenticated;
grant execute on function private.is_valid_client_address(jsonb) to authenticated;
grant execute on function private.is_valid_vendor_contact(jsonb) to authenticated;

grant select on table
  public.clients,
  public.client_contacts,
  public.services,
  public.vendors,
  public.expense_categories,
  public.audit_events
to authenticated;

grant insert (
  workspace_id,
  kind,
  name,
  trade_name,
  tax_id,
  address_json,
  commercial_status,
  notes,
  tags,
  responsible_name
) on table public.clients to authenticated;

grant update (
  kind,
  name,
  trade_name,
  tax_id,
  address_json,
  commercial_status,
  notes,
  tags,
  responsible_name,
  archived_at
) on table public.clients to authenticated;

grant insert (
  workspace_id,
  client_id,
  name,
  email,
  phone,
  role,
  is_primary
) on table public.client_contacts to authenticated;

grant update (
  name,
  email,
  phone,
  role,
  is_primary,
  archived_at
) on table public.client_contacts to authenticated;

grant insert (
  workspace_id,
  name,
  description,
  default_component_kind,
  default_financial_nature,
  active
) on table public.services to authenticated;

grant update (
  name,
  description,
  default_component_kind,
  default_financial_nature,
  active,
  archived_at
) on table public.services to authenticated;

grant insert (
  workspace_id,
  name,
  tax_id,
  contact_json,
  notes
) on table public.vendors to authenticated;

grant update (
  name,
  tax_id,
  contact_json,
  notes,
  archived_at
) on table public.vendors to authenticated;

grant insert (
  workspace_id,
  name,
  default_nature,
  color,
  active
) on table public.expense_categories to authenticated;

grant update (
  name,
  default_nature,
  color,
  active,
  archived_at
) on table public.expense_categories to authenticated;

create policy clients_select_active_owner
on public.clients for select to authenticated
using ((select private.is_active_workspace_owner(workspace_id)));
create policy clients_insert_active_owner
on public.clients for insert to authenticated
with check (
  (select private.is_active_workspace_owner(workspace_id))
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
);
create policy clients_update_active_owner
on public.clients for update to authenticated
using ((select private.is_active_workspace_owner(workspace_id)))
with check (
  (select private.is_active_workspace_owner(workspace_id))
  and updated_by = (select auth.uid())
);

create policy client_contacts_select_active_owner
on public.client_contacts for select to authenticated
using ((select private.is_active_workspace_owner(workspace_id)));
create policy client_contacts_insert_active_owner
on public.client_contacts for insert to authenticated
with check (
  (select private.is_active_workspace_owner(workspace_id))
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
);
create policy client_contacts_update_active_owner
on public.client_contacts for update to authenticated
using ((select private.is_active_workspace_owner(workspace_id)))
with check (
  (select private.is_active_workspace_owner(workspace_id))
  and updated_by = (select auth.uid())
);

create policy services_select_active_owner
on public.services for select to authenticated
using ((select private.is_active_workspace_owner(workspace_id)));
create policy services_insert_active_owner
on public.services for insert to authenticated
with check (
  (select private.is_active_workspace_owner(workspace_id))
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
);
create policy services_update_active_owner
on public.services for update to authenticated
using ((select private.is_active_workspace_owner(workspace_id)))
with check (
  (select private.is_active_workspace_owner(workspace_id))
  and updated_by = (select auth.uid())
);

create policy vendors_select_active_owner
on public.vendors for select to authenticated
using ((select private.is_active_workspace_owner(workspace_id)));
create policy vendors_insert_active_owner
on public.vendors for insert to authenticated
with check (
  (select private.is_active_workspace_owner(workspace_id))
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
);
create policy vendors_update_active_owner
on public.vendors for update to authenticated
using ((select private.is_active_workspace_owner(workspace_id)))
with check (
  (select private.is_active_workspace_owner(workspace_id))
  and updated_by = (select auth.uid())
);

create policy expense_categories_select_active_owner
on public.expense_categories for select to authenticated
using ((select private.is_active_workspace_owner(workspace_id)));
create policy expense_categories_insert_active_owner
on public.expense_categories for insert to authenticated
with check (
  (select private.is_active_workspace_owner(workspace_id))
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
);
create policy expense_categories_update_active_owner
on public.expense_categories for update to authenticated
using ((select private.is_active_workspace_owner(workspace_id)))
with check (
  (select private.is_active_workspace_owner(workspace_id))
  and updated_by = (select auth.uid())
);

create policy audit_events_select_active_owner
on public.audit_events for select to authenticated
using ((select private.is_active_workspace_owner(workspace_id)));

comment on table public.audit_events is
  'Trilha imutável e redigida; cadastros operacionais registram apenas nomes dos campos alterados.';
