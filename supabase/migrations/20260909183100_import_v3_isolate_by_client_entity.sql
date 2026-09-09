-- v0.8.2: importação v3 isola registros por client_entity_id;
-- consolidação não inventa legal_name a partir do nome do cliente.

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

create or replace function public.consolidate_client_into_entity(
  p_source_client_id uuid,
  p_target_client_id uuid,
  p_entity_display_name text,
  p_entity_type text default 'company',
  p_confirmation text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_preview jsonb;
  v_workspace_id uuid;
  v_entity_id uuid;
  v_entity_name text := btrim(coalesce(p_entity_display_name, ''));
  v_entity_type text := coalesce(nullif(btrim(p_entity_type), ''), 'company');
  v_user_id uuid := (select auth.uid());
  v_source public.clients%rowtype;
  v_before_own numeric(15,2);
  v_before_media numeric(15,2);
  v_before_expenses numeric(15,2);
  v_before_charges bigint;
  v_after_own numeric(15,2);
  v_after_media numeric(15,2);
  v_after_expenses numeric(15,2);
  v_after_charges bigint;
  v_services bigint;
  v_expenses bigint;
  v_domains bigint;
  v_contacts bigint;
  v_service_links jsonb := '[]'::jsonb;
  v_moved_charge_ids uuid[] := array[]::uuid[];
  v_moved_expense_ids uuid[] := array[]::uuid[];
begin
  if coalesce(p_confirmation, '') is distinct from 'CONSOLIDAR' then
    return jsonb_build_object('ok', false, 'reason', 'confirmation_required');
  end if;

  if v_entity_type not in ('company', 'brand', 'project', 'other') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_entity_type');
  end if;

  if char_length(v_entity_name) < 2 or char_length(v_entity_name) > 160 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_display_name');
  end if;

  v_preview := public.preview_consolidate_client_into_entity(p_source_client_id, p_target_client_id);
  if coalesce((v_preview ->> 'ok')::boolean, false) is not true then
    return v_preview;
  end if;

  v_workspace_id := (v_preview ->> 'workspace_id')::uuid;
  v_before_own := (v_preview #>> '{totals,own_received}')::numeric;
  v_before_media := (v_preview #>> '{totals,media}')::numeric;
  v_before_expenses := (v_preview #>> '{totals,expenses_paid}')::numeric;
  v_before_charges := (v_preview #>> '{counts,charges}')::bigint;
  v_services := (v_preview #>> '{counts,services}')::bigint;
  v_expenses := (v_preview #>> '{counts,expenses}')::bigint;
  v_domains := (v_preview #>> '{counts,domains}')::bigint;
  v_contacts := (v_preview #>> '{counts,contacts}')::bigint;

  perform 1 from public.clients
  where id = p_source_client_id and workspace_id = v_workspace_id
  for update;
  perform 1 from public.clients
  where id = p_target_client_id and workspace_id = v_workspace_id
  for update;

  select * into strict v_source
  from public.clients
  where id = p_source_client_id and workspace_id = v_workspace_id;

  select entity.id
  into v_entity_id
  from public.client_entities as entity
  where entity.workspace_id = v_workspace_id
    and entity.client_id = p_target_client_id
    and lower(btrim(entity.display_name)) = lower(v_entity_name)
    and entity.archived_at is null
    and entity.status <> 'archived'
  limit 1;

  if v_entity_id is null then
    insert into public.client_entities (
      workspace_id, client_id, entity_type, display_name, legal_name, tax_id,
      website, email, phone, notes, status, created_by, updated_by
    ) values (
      v_workspace_id, p_target_client_id, v_entity_type, v_entity_name,
      null,
      v_source.tax_id, v_source.website, v_source.email, v_source.phone,
      nullif(concat_ws(E'\n', nullif(v_source.trade_name, ''), nullif(v_source.notes, '')), ''),
      'active', v_user_id, v_user_id
    )
    returning id into v_entity_id;
  else
    update public.client_entities
    set
      tax_id = coalesce(tax_id, v_source.tax_id),
      website = coalesce(website, v_source.website),
      email = coalesce(email, v_source.email),
      phone = coalesce(phone, v_source.phone),
      notes = coalesce(notes,
        nullif(concat_ws(E'\n', nullif(v_source.trade_name, ''), nullif(v_source.notes, '')), ''))
    where id = v_entity_id and workspace_id = v_workspace_id;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'charge_id', charge.id,
        'client_service_id', charge.client_service_id
      )
    ),
    '[]'::jsonb
  )
  into v_service_links
  from public.charges as charge
  where charge.workspace_id = v_workspace_id
    and charge.client_id = p_source_client_id
    and charge.client_service_id is not null;

  select coalesce(array_agg(charge.id), array[]::uuid[])
  into v_moved_charge_ids
  from public.charges as charge
  where charge.workspace_id = v_workspace_id
    and charge.client_id = p_source_client_id;

  select coalesce(array_agg(expense.id), array[]::uuid[])
  into v_moved_expense_ids
  from public.expenses as expense
  where expense.workspace_id = v_workspace_id
    and expense.client_id = p_source_client_id;

  update public.charges
  set
    client_service_id = null,
    updated_by = v_user_id,
    updated_at = statement_timestamp()
  where workspace_id = v_workspace_id
    and client_id = p_source_client_id
    and client_service_id is not null;

  update public.client_services
  set
    client_id = p_target_client_id,
    client_entity_id = v_entity_id,
    updated_by = v_user_id,
    updated_at = statement_timestamp()
  where workspace_id = v_workspace_id
    and client_id = p_source_client_id;

  update public.charges as charge
  set
    client_id = p_target_client_id,
    client_entity_id = v_entity_id,
    client_service_id = (link.item ->> 'client_service_id')::uuid,
    updated_by = v_user_id,
    updated_at = statement_timestamp()
  from jsonb_array_elements(v_service_links) as link(item)
  where charge.id = (link.item ->> 'charge_id')::uuid
    and charge.workspace_id = v_workspace_id;

  update public.charges
  set
    client_id = p_target_client_id,
    client_entity_id = v_entity_id,
    updated_by = v_user_id,
    updated_at = statement_timestamp()
  where workspace_id = v_workspace_id
    and client_id = p_source_client_id;

  update public.expenses
  set
    client_id = p_target_client_id,
    client_entity_id = v_entity_id,
    updated_by = v_user_id,
    updated_at = statement_timestamp()
  where workspace_id = v_workspace_id
    and client_id = p_source_client_id;

  update public.domains
  set
    client_id = p_target_client_id,
    client_entity_id = v_entity_id,
    updated_by = v_user_id,
    updated_at = statement_timestamp()
  where workspace_id = v_workspace_id
    and client_id = p_source_client_id;

  update public.clients
  set
    commercial_status = 'archived',
    archived_at = statement_timestamp(),
    updated_by = v_user_id,
    updated_at = statement_timestamp(),
    notes = concat_ws(
      E'\n',
      nullif(notes, ''),
      format(
        'Consolidado em %s como empresa/marca "%s" em %s.',
        (v_preview #>> '{target,name}'),
        v_entity_name,
        statement_timestamp()::date
      )
    )
  where workspace_id = v_workspace_id
    and id = p_source_client_id;

  insert into public.activity_events (
    workspace_id, client_id, actor_user_id, entity_type, entity_id, action, summary, event_data
  ) values (
    v_workspace_id,
    p_target_client_id,
    v_user_id,
    'client',
    p_target_client_id,
    'client.consolidated',
    format(
      'Cliente "%s" consolidado como %s "%s".',
      (v_preview #>> '{source,name}'),
      v_entity_type,
      v_entity_name
    ),
    jsonb_build_object(
      'source_client_id', p_source_client_id,
      'target_client_id', p_target_client_id,
      'client_entity_id', v_entity_id,
      'entity_display_name', v_entity_name,
      'moved', jsonb_build_object(
        'services', v_services,
        'charges', v_before_charges,
        'expenses', v_expenses,
        'domains', v_domains
      ),
      'preserved', jsonb_build_object(
        'contacts', v_contacts,
        'activity_events', (select count(*) from public.activity_events
          where workspace_id = v_workspace_id and client_id = p_source_client_id)
      ),
      'copied_fields', jsonb_strip_nulls(jsonb_build_object(
        'trade_name', v_source.trade_name,
        'tax_id', v_source.tax_id,
        'website', v_source.website,
        'email', v_source.email,
        'phone', v_source.phone,
        'notes', v_source.notes
      ))
    )
  );

  select coalesce(sum(charge.company_revenue
    + case when charge.additional_fee_is_revenue then charge.additional_fee else 0 end), 0)
  into v_after_own
  from public.charges as charge
  where charge.workspace_id = v_workspace_id
    and charge.id = any (v_moved_charge_ids)
    and charge.status = 'paid';

  select coalesce(sum(charge.media_budget
    + case when charge.additional_fee_is_revenue then 0 else charge.additional_fee end), 0)
  into v_after_media
  from public.charges as charge
  where charge.workspace_id = v_workspace_id
    and charge.id = any (v_moved_charge_ids)
    and charge.status <> 'cancelled';

  select coalesce(sum(expense.amount), 0)
  into v_after_expenses
  from public.expenses as expense
  where expense.workspace_id = v_workspace_id
    and expense.id = any (v_moved_expense_ids)
    and expense.status = 'paid';

  select count(*)
  into v_after_charges
  from public.charges as charge
  where charge.workspace_id = v_workspace_id
    and charge.id = any (v_moved_charge_ids);

  if exists (
    select 1 from public.charges
    where workspace_id = v_workspace_id and client_id = p_source_client_id
  ) or exists (
    select 1 from public.client_services
    where workspace_id = v_workspace_id and client_id = p_source_client_id
  ) or exists (
    select 1 from public.expenses
    where workspace_id = v_workspace_id and client_id = p_source_client_id
  ) or exists (
    select 1 from public.domains
    where workspace_id = v_workspace_id and client_id = p_source_client_id
  ) then
    raise exception 'consolidation left records on source client'
      using errcode = 'P0001';
  end if;

  if v_after_own is distinct from v_before_own
    or v_after_media is distinct from v_before_media
    or v_after_expenses is distinct from v_before_expenses
    or v_after_charges is distinct from v_before_charges then
    raise exception 'consolidation totals mismatch'
      using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'ok', true,
    'client_entity_id', v_entity_id,
    'source_client_id', p_source_client_id,
    'target_client_id', p_target_client_id,
    'totals', jsonb_build_object(
      'own_received', v_after_own,
      'media', v_after_media,
      'expenses_paid', v_after_expenses,
      'charges', v_after_charges
    )
  );
end;
$$;

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
  v_base_payload jsonb;
  v_client_id uuid;
  v_entity_id uuid;
  v_service_id uuid;
  v_entities integer := 0;
  v_services integer := 0;
  v_charges integer := 0;
  v_expenses integer := 0;
  v_domains integer := 0;
begin
  if jsonb_typeof(p_payload) <> 'object' then
    raise invalid_parameter_value using message = 'invalid import contract';
  end if;

  -- Planilhas sem Empresa/Marca seguem o caminho v2 intacto.
  v_base_payload := jsonb_build_object(
    'clients', coalesce(p_payload -> 'clients', '[]'::jsonb),
    'services', coalesce((
      select jsonb_agg(value)
      from jsonb_array_elements(coalesce(p_payload -> 'services', '[]'::jsonb))
      where nullif(btrim(value ->> 'clientEntityName'), '') is null
    ), '[]'::jsonb),
    'charges', coalesce((
      select jsonb_agg(value)
      from jsonb_array_elements(coalesce(p_payload -> 'charges', '[]'::jsonb))
      where nullif(btrim(value ->> 'clientEntityName'), '') is null
    ), '[]'::jsonb),
    'expenses', coalesce((
      select jsonb_agg(value)
      from jsonb_array_elements(coalesce(p_payload -> 'expenses', '[]'::jsonb))
      where nullif(btrim(value ->> 'clientEntityName'), '') is null
    ), '[]'::jsonb),
    'domains', coalesce((
      select jsonb_agg(value)
      from jsonb_array_elements(coalesce(p_payload -> 'domains', '[]'::jsonb))
      where nullif(btrim(value ->> 'clientEntityName'), '') is null
    ), '[]'::jsonb)
  );

  v_result := public.import_workspace_spreadsheet_v2(
    p_workspace_id, p_source_checksum, p_source_type, v_base_payload
  );
  if v_result ->> 'status' <> 'imported' then
    return v_result;
  end if;

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

  for v_record in
    select value from jsonb_array_elements(coalesce(p_payload -> 'services', '[]'::jsonb))
    where nullif(btrim(value ->> 'clientEntityName'), '') is not null
  loop
    select client.id into strict v_client_id
    from public.clients as client
    where client.workspace_id = p_workspace_id
      and client.archived_at is null
      and lower(btrim(client.name)) = lower(btrim(v_record ->> 'clientName'));

    select entity.id into strict v_entity_id
    from public.client_entities as entity
    where entity.workspace_id = p_workspace_id
      and entity.client_id = v_client_id
      and entity.archived_at is null
      and entity.status = 'active'
      and lower(btrim(entity.display_name)) = lower(btrim(v_record ->> 'clientEntityName'));

    select service.id into v_service_id
    from public.client_services as service
    where service.workspace_id = p_workspace_id
      and service.client_id = v_client_id
      and service.client_entity_id = v_entity_id
      and lower(service.name) = lower(v_record ->> 'name')
      and service.start_date = (v_record ->> 'startDate')::date
    limit 1;

    if v_service_id is null then
      insert into public.client_services (
        workspace_id, client_id, client_entity_id, name, description, company_revenue, media_budget,
        additional_fee, billing_type, start_date, next_due_date, status, notes
      ) values (
        p_workspace_id, v_client_id, v_entity_id, v_record ->> 'name',
        nullif(v_record ->> 'description', ''),
        (v_record ->> 'companyRevenue')::numeric, (v_record ->> 'mediaBudget')::numeric,
        (v_record ->> 'additionalFee')::numeric, v_record ->> 'billingType',
        (v_record ->> 'startDate')::date, nullif(v_record ->> 'nextDueDate', '')::date,
        'active', nullif(v_record ->> 'notes', '')
      );
      v_services := v_services + 1;
    end if;
  end loop;

  for v_record in
    select value from jsonb_array_elements(coalesce(p_payload -> 'charges', '[]'::jsonb))
    where nullif(btrim(value ->> 'clientEntityName'), '') is not null
  loop
    select client.id into strict v_client_id
    from public.clients as client
    where client.workspace_id = p_workspace_id
      and client.archived_at is null
      and lower(btrim(client.name)) = lower(btrim(v_record ->> 'clientName'));

    select entity.id into strict v_entity_id
    from public.client_entities as entity
    where entity.workspace_id = p_workspace_id
      and entity.client_id = v_client_id
      and entity.archived_at is null
      and entity.status = 'active'
      and lower(btrim(entity.display_name)) = lower(btrim(v_record ->> 'clientEntityName'));

    v_service_id := null;
    if nullif(v_record ->> 'serviceName', '') is not null then
      select service.id into strict v_service_id
      from public.client_services as service
      where service.workspace_id = p_workspace_id
        and service.client_id = v_client_id
        and service.client_entity_id = v_entity_id
        and service.status = 'active'
        and lower(service.name) = lower(v_record ->> 'serviceName');
    end if;

    if exists (
      select 1 from public.charges as charge
      where charge.workspace_id = p_workspace_id
        and charge.client_id = v_client_id
        and charge.client_entity_id = v_entity_id
        and charge.due_date = (v_record ->> 'dueDate')::date
        and lower(charge.description) = lower(v_record ->> 'description')
        and charge.status <> 'cancelled'
    ) then
      continue;
    end if;

    insert into public.charges (
      workspace_id, client_id, client_entity_id, client_service_id, description, due_date,
      company_revenue, media_budget, additional_fee, status, paid_at, payment_method, notes
    ) values (
      p_workspace_id, v_client_id, v_entity_id, v_service_id, v_record ->> 'description',
      (v_record ->> 'dueDate')::date, (v_record ->> 'companyRevenue')::numeric,
      (v_record ->> 'mediaBudget')::numeric, (v_record ->> 'additionalFee')::numeric,
      v_record ->> 'status', nullif(v_record ->> 'paidAt', '')::timestamptz,
      nullif(v_record ->> 'paymentMethod', ''), nullif(v_record ->> 'notes', '')
    );
    v_charges := v_charges + 1;
  end loop;

  for v_record in
    select value from jsonb_array_elements(coalesce(p_payload -> 'expenses', '[]'::jsonb))
    where nullif(btrim(value ->> 'clientEntityName'), '') is not null
  loop
    select client.id into strict v_client_id
    from public.clients as client
    where client.workspace_id = p_workspace_id
      and client.archived_at is null
      and lower(btrim(client.name)) = lower(btrim(v_record ->> 'clientName'));

    select entity.id into strict v_entity_id
    from public.client_entities as entity
    where entity.workspace_id = p_workspace_id
      and entity.client_id = v_client_id
      and entity.archived_at is null
      and entity.status = 'active'
      and lower(btrim(entity.display_name)) = lower(btrim(v_record ->> 'clientEntityName'));

    if exists (
      select 1 from public.expenses as expense
      where expense.workspace_id = p_workspace_id
        and expense.client_id = v_client_id
        and expense.client_entity_id = v_entity_id
        and expense.due_date = (v_record ->> 'dueDate')::date
        and expense.amount = (v_record ->> 'amount')::numeric
        and lower(expense.description) = lower(v_record ->> 'description')
    ) then
      continue;
    end if;

    insert into public.expenses (
      workspace_id, client_id, client_entity_id, description, category, amount, due_date,
      status, paid_at, expense_type, notes
    ) values (
      p_workspace_id, v_client_id, v_entity_id, v_record ->> 'description',
      v_record ->> 'category', (v_record ->> 'amount')::numeric, (v_record ->> 'dueDate')::date,
      v_record ->> 'status', nullif(v_record ->> 'paidAt', '')::timestamptz,
      v_record ->> 'expenseType', nullif(v_record ->> 'notes', '')
    );
    v_expenses := v_expenses + 1;
  end loop;

  for v_record in
    select value from jsonb_array_elements(coalesce(p_payload -> 'domains', '[]'::jsonb))
    where nullif(btrim(value ->> 'clientEntityName'), '') is not null
  loop
    select client.id into strict v_client_id
    from public.clients as client
    where client.workspace_id = p_workspace_id
      and client.archived_at is null
      and lower(btrim(client.name)) = lower(btrim(v_record ->> 'clientName'));

    select entity.id into strict v_entity_id
    from public.client_entities as entity
    where entity.workspace_id = p_workspace_id
      and entity.client_id = v_client_id
      and entity.archived_at is null
      and entity.status = 'active'
      and lower(btrim(entity.display_name)) = lower(btrim(v_record ->> 'clientEntityName'));

    if exists (
      select 1 from public.domains as domain_record
      where domain_record.workspace_id = p_workspace_id
        and domain_record.client_id = v_client_id
        and domain_record.client_entity_id = v_entity_id
        and domain_record.status = 'active'
        and lower(domain_record.domain) = lower(v_record ->> 'domain')
    ) then
      continue;
    end if;

    insert into public.domains (
      workspace_id, client_id, client_entity_id, domain, registrar, expires_on, auto_renew,
      cost, payment_responsibility, status, notes
    ) values (
      p_workspace_id, v_client_id, v_entity_id, lower(v_record ->> 'domain'),
      nullif(v_record ->> 'registrar', ''), (v_record ->> 'expiresOn')::date,
      (v_record ->> 'autoRenew')::boolean, nullif(v_record ->> 'cost', '')::numeric,
      v_record ->> 'paymentResponsibility', 'active', nullif(v_record ->> 'notes', '')
    );
    v_domains := v_domains + 1;
  end loop;

  v_result := jsonb_set(v_result, '{counts,entities}', to_jsonb(v_entities), true);
  v_result := jsonb_set(
    v_result, '{counts,services}',
    to_jsonb(coalesce((v_result #>> '{counts,services}')::integer, 0) + v_services), true
  );
  v_result := jsonb_set(
    v_result, '{counts,charges}',
    to_jsonb(coalesce((v_result #>> '{counts,charges}')::integer, 0) + v_charges), true
  );
  v_result := jsonb_set(
    v_result, '{counts,expenses}',
    to_jsonb(coalesce((v_result #>> '{counts,expenses}')::integer, 0) + v_expenses), true
  );
  v_result := jsonb_set(
    v_result, '{counts,domains}',
    to_jsonb(coalesce((v_result #>> '{counts,domains}')::integer, 0) + v_domains), true
  );

  update public.import_jobs
    set entity_counts = v_result -> 'counts'
    where id = (v_result ->> 'jobId')::uuid and workspace_id = p_workspace_id;
  return v_result;
exception
  when no_data_found then
    raise invalid_parameter_value using message = 'unresolved import relation';
  when too_many_rows then
    raise invalid_parameter_value using message = 'ambiguous import relation';
end;
$$;

comment on function public.preview_consolidate_client_into_entity(uuid, uuid) is
  'Prévia segura da consolidação de cliente legado em empresa/marca.';
comment on function public.consolidate_client_into_entity(uuid, uuid, text, text, text) is
  'Move serviços, cobranças, despesas e domínios do cliente origem para uma entity no destino e arquiva a origem.';
comment on function public.import_workspace_spreadsheet_v3(uuid, text, text, jsonb) is
  'Importa planilha com empresas/marcas e isola serviços, cobranças, despesas e domínios por client_entity_id.';
