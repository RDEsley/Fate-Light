-- v0.8.1: entidades seguem os mesmos controles de autoria, auditoria e privilégio
-- dos demais registros operacionais.

alter table public.audit_events
  drop constraint audit_events_entity_type_check,
  drop constraint audit_events_action_check;
alter table public.audit_events
  add constraint audit_events_entity_type_check check (
    entity_type in ('client','client_contact','client_entity','service','vendor','expense_category')
  ),
  add constraint audit_events_action_check check (
    action ~ '^(client|client_contact|client_entity|service|vendor|expense_category)\.(created|updated|archived|restored)$'
  );

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
    raise exception using errcode = '42501',
      message = 'An active workspace owner is required to change operational records.';
  end if;

  v_entity_type := case tg_table_name
    when 'clients' then 'client'
    when 'client_contacts' then 'client_contact'
    when 'client_entities' then 'client_entity'
    when 'services' then 'service'
    when 'vendors' then 'vendor'
    when 'expense_categories' then 'expense_category'
    else null
  end;
  if v_entity_type is null then
    raise exception using errcode = '22023', message = 'Unsupported operational audit source.';
  end if;

  if tg_op = 'INSERT' then
    v_action := v_entity_type || '.created';
    select coalesce(array_agg(field.key order by field.key), '{}'::text[])
      into v_changed_fields
    from jsonb_each(v_new_row) as field
    where field.key not in ('id','workspace_id','created_at','updated_at','created_by','updated_by')
      and field.value <> 'null'::jsonb;
  else
    select coalesce(array_agg(new_field.key order by new_field.key), '{}'::text[])
      into v_changed_fields
    from jsonb_each(v_new_row) as new_field
    join jsonb_each(v_old_row) as old_field using (key)
    where new_field.key not in ('updated_at','updated_by')
      and new_field.value is distinct from old_field.value;
    if cardinality(v_changed_fields) = 0 then return new; end if;
    v_action := case
      when old.archived_at is null and new.archived_at is not null then v_entity_type || '.archived'
      when old.archived_at is not null and new.archived_at is null then v_entity_type || '.restored'
      else v_entity_type || '.updated'
    end;
  end if;

  insert into public.audit_events
    (workspace_id, actor_user_id, action, entity_type, entity_id, changed_fields)
  values
    (v_workspace_id, v_actor_user_id, v_action, v_entity_type, new.id, v_changed_fields);
  return new;
end;
$$;

create trigger client_entities_set_updated_at
before update on public.client_entities
for each row execute function private.set_updated_at();
create trigger client_entities_set_updated_by
before update on public.client_entities
for each row execute function private.set_operational_updated_by();
create trigger client_entities_audit_change
after insert or update on public.client_entities
for each row execute function private.audit_operational_change();

revoke all on table public.client_entities from public, anon, authenticated;
grant select on table public.client_entities to authenticated;
grant insert (
  workspace_id, client_id, entity_type, display_name, legal_name, tax_id,
  website, email, phone, notes, status, archived_at
) on public.client_entities to authenticated;
grant update (
  entity_type, display_name, legal_name, tax_id, website, email, phone, notes,
  status, archived_at
) on public.client_entities to authenticated;

-- Índices que cobrem integralmente as FKs compostas e evitam varreduras na validação.
create index if not exists client_services_workspace_client_entity_idx
  on public.client_services (workspace_id, client_id, client_entity_id)
  where client_entity_id is not null;
create index if not exists charges_workspace_client_entity_idx
  on public.charges (workspace_id, client_id, client_entity_id)
  where client_entity_id is not null;
create index if not exists expenses_workspace_client_entity_idx
  on public.expenses (workspace_id, client_id, client_entity_id)
  where client_entity_id is not null;
create index if not exists domains_workspace_client_entity_idx
  on public.domains (workspace_id, client_id, client_entity_id)
  where client_entity_id is not null;

create or replace function public.preview_consolidate_client_into_entity(
  p_source_client_id uuid,
  p_target_client_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_source public.clients%rowtype;
  v_target public.clients%rowtype;
begin
  if p_source_client_id is null or p_target_client_id is null then
    return jsonb_build_object('ok', false, 'reason', 'missing_ids');
  end if;
  if p_source_client_id = p_target_client_id then
    return jsonb_build_object('ok', false, 'reason', 'same_client');
  end if;

  select * into v_source from public.clients where id = p_source_client_id;
  if v_source.id is null then return jsonb_build_object('ok', false, 'reason', 'source_not_found'); end if;
  v_workspace_id := v_source.workspace_id;
  if (select auth.uid()) is null
    or not (select private.is_active_workspace_owner(v_workspace_id)) then
    raise insufficient_privilege using message = 'active workspace owner required';
  end if;
  select * into v_target from public.clients
  where id = p_target_client_id and workspace_id = v_workspace_id;
  if v_target.id is null then
    return jsonb_build_object('ok', false, 'reason', 'target_not_found_or_cross_workspace');
  end if;
  if exists (select 1 from public.client_entities
    where workspace_id = v_workspace_id and client_id = p_source_client_id
      and archived_at is null) then
    return jsonb_build_object('ok', false, 'reason', 'source_has_entities',
      'message', 'O cliente de origem já possui empresas/marcas. Consolide-as antes ou mova manualmente.');
  end if;

  return jsonb_build_object(
    'ok', true, 'workspace_id', v_workspace_id,
    'source', jsonb_build_object('id',v_source.id,'name',v_source.name,'status',v_source.commercial_status),
    'target', jsonb_build_object('id',v_target.id,'name',v_target.name,'status',v_target.commercial_status),
    'counts', jsonb_build_object(
      'services',(select count(*) from public.client_services where workspace_id=v_workspace_id and client_id=p_source_client_id),
      'charges',(select count(*) from public.charges where workspace_id=v_workspace_id and client_id=p_source_client_id),
      'expenses',(select count(*) from public.expenses where workspace_id=v_workspace_id and client_id=p_source_client_id),
      'domains',(select count(*) from public.domains where workspace_id=v_workspace_id and client_id=p_source_client_id),
      'contacts',(select count(*) from public.client_contacts where workspace_id=v_workspace_id and client_id=p_source_client_id)
    ),
    'preserved', jsonb_build_object('contacts', true, 'activity_events', true),
    'copied_fields', jsonb_strip_nulls(jsonb_build_object(
      'legal_name', case when v_source.kind='company' then v_source.name end,
      'trade_name', v_source.trade_name, 'tax_id', v_source.tax_id,
      'website', v_source.website, 'email', v_source.email, 'phone', v_source.phone,
      'notes', v_source.notes
    )),
    'totals', jsonb_build_object(
      'own_received',coalesce((select sum(company_revenue + case when additional_fee_is_revenue then additional_fee else 0 end) from public.charges where workspace_id=v_workspace_id and client_id=p_source_client_id and status='paid'),0),
      'media',coalesce((select sum(media_budget + case when additional_fee_is_revenue then 0 else additional_fee end) from public.charges where workspace_id=v_workspace_id and client_id=p_source_client_id and status<>'cancelled'),0),
      'expenses_paid',coalesce((select sum(amount) from public.expenses where workspace_id=v_workspace_id and client_id=p_source_client_id and status='paid'),0)
    )
  );
end;
$$;

-- v3 inclui empresas/marcas e seus vínculos na mesma transação da importação v2.
create or replace function public.import_workspace_spreadsheet_v3(
  p_workspace_id uuid,
  p_source_checksum text,
  p_source_type text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
  v_record jsonb;
  v_client_id uuid;
  v_entity_id uuid;
  v_entities integer := 0;
begin
  if jsonb_typeof(p_payload) <> 'object' then
    raise invalid_parameter_value using message = 'invalid import contract';
  end if;

  -- Uma chamada de função não abre outra transação: qualquer falha abaixo também desfaz v2.
  v_result := public.import_workspace_spreadsheet_v2(
    p_workspace_id, p_source_checksum, p_source_type, p_payload
  );
  if v_result ->> 'status' <> 'imported' then return v_result; end if;

  for v_record in
    select value from jsonb_array_elements(coalesce(p_payload -> 'entities', '[]'::jsonb))
  loop
    select client.id into strict v_client_id
    from public.clients as client
    where client.workspace_id = p_workspace_id
      and client.archived_at is null
      and lower(btrim(client.name)) = lower(btrim(v_record ->> 'clientName'));

    select entity.id into v_entity_id
    from public.client_entities as entity
    where entity.workspace_id = p_workspace_id
      and entity.client_id = v_client_id
      and entity.archived_at is null
      and lower(btrim(entity.display_name)) = lower(btrim(v_record ->> 'displayName'));

    if v_entity_id is null then
      insert into public.client_entities (
        workspace_id, client_id, entity_type, display_name, notes
      ) values (
        p_workspace_id, v_client_id, coalesce(nullif(v_record ->> 'entityType',''),'company'),
        btrim(v_record ->> 'displayName'), nullif(btrim(v_record ->> 'notes'),'')
      ) returning id into v_entity_id;
      v_entities := v_entities + 1;
    end if;
  end loop;

  -- Resolve cada vínculo explicitamente. SELECT INTO STRICT bloqueia nome ausente ou ambíguo.
  for v_record in select value from jsonb_array_elements(coalesce(p_payload -> 'services','[]'::jsonb))
    where nullif(btrim(value ->> 'clientEntityName'),'') is not null
  loop
    select client.id into strict v_client_id from public.clients client
      where client.workspace_id=p_workspace_id and client.archived_at is null
        and lower(btrim(client.name))=lower(btrim(v_record ->> 'clientName'));
    select entity.id into strict v_entity_id from public.client_entities entity
      where entity.workspace_id=p_workspace_id and entity.client_id=v_client_id
        and entity.archived_at is null and entity.status='active'
        and lower(btrim(entity.display_name))=lower(btrim(v_record ->> 'clientEntityName'));
    update public.client_services set client_entity_id=v_entity_id
      where workspace_id=p_workspace_id and client_id=v_client_id
        and lower(name)=lower(v_record ->> 'name')
        and start_date=(v_record ->> 'startDate')::date;
    if not found then raise invalid_parameter_value using message='unresolved imported service'; end if;
  end loop;

  for v_record in select value from jsonb_array_elements(coalesce(p_payload -> 'charges','[]'::jsonb))
    where nullif(btrim(value ->> 'clientEntityName'),'') is not null
  loop
    select client.id into strict v_client_id from public.clients client
      where client.workspace_id=p_workspace_id and client.archived_at is null
        and lower(btrim(client.name))=lower(btrim(v_record ->> 'clientName'));
    select entity.id into strict v_entity_id from public.client_entities entity
      where entity.workspace_id=p_workspace_id and entity.client_id=v_client_id
        and entity.archived_at is null and entity.status='active'
        and lower(btrim(entity.display_name))=lower(btrim(v_record ->> 'clientEntityName'));
    update public.charges set client_entity_id=v_entity_id
      where workspace_id=p_workspace_id and client_id=v_client_id
        and due_date=(v_record ->> 'dueDate')::date
        and lower(description)=lower(v_record ->> 'description') and status<>'cancelled';
    if not found then raise invalid_parameter_value using message='unresolved imported charge'; end if;
  end loop;

  for v_record in select value from jsonb_array_elements(coalesce(p_payload -> 'expenses','[]'::jsonb))
    where nullif(btrim(value ->> 'clientEntityName'),'') is not null
  loop
    select client.id into strict v_client_id from public.clients client
      where client.workspace_id=p_workspace_id and client.archived_at is null
        and lower(btrim(client.name))=lower(btrim(v_record ->> 'clientName'));
    select entity.id into strict v_entity_id from public.client_entities entity
      where entity.workspace_id=p_workspace_id and entity.client_id=v_client_id
        and entity.archived_at is null and entity.status='active'
        and lower(btrim(entity.display_name))=lower(btrim(v_record ->> 'clientEntityName'));
    update public.expenses set client_entity_id=v_entity_id
      where workspace_id=p_workspace_id and client_id=v_client_id
        and due_date=(v_record ->> 'dueDate')::date and amount=(v_record ->> 'amount')::numeric
        and lower(description)=lower(v_record ->> 'description');
    if not found then raise invalid_parameter_value using message='unresolved imported expense'; end if;
  end loop;

  for v_record in select value from jsonb_array_elements(coalesce(p_payload -> 'domains','[]'::jsonb))
    where nullif(btrim(value ->> 'clientEntityName'),'') is not null
  loop
    select client.id into strict v_client_id from public.clients client
      where client.workspace_id=p_workspace_id and client.archived_at is null
        and lower(btrim(client.name))=lower(btrim(v_record ->> 'clientName'));
    select entity.id into strict v_entity_id from public.client_entities entity
      where entity.workspace_id=p_workspace_id and entity.client_id=v_client_id
        and entity.archived_at is null and entity.status='active'
        and lower(btrim(entity.display_name))=lower(btrim(v_record ->> 'clientEntityName'));
    update public.domains set client_entity_id=v_entity_id
      where workspace_id=p_workspace_id and client_id=v_client_id and status='active'
        and lower(domain)=lower(v_record ->> 'domain');
    if not found then raise invalid_parameter_value using message='unresolved imported domain'; end if;
  end loop;

  v_result := jsonb_set(v_result, '{counts,entities}', to_jsonb(v_entities), true);
  update public.import_jobs
    set entity_counts = v_result -> 'counts', mapping_version = 'v3'
    where id = (v_result ->> 'jobId')::uuid and workspace_id = p_workspace_id;
  return v_result;
exception
  when no_data_found then
    raise invalid_parameter_value using message = 'unresolved import relation';
  when too_many_rows then
    raise invalid_parameter_value using message = 'ambiguous import relation';
end;
$$;

revoke all on function public.import_workspace_spreadsheet_v3(uuid,text,text,jsonb)
from public, anon;
grant execute on function public.import_workspace_spreadsheet_v3(uuid,text,text,jsonb)
to authenticated;
