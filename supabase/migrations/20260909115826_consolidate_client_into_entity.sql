-- Consolidação explícita: cliente origem vira empresa/marca de outro cliente.
-- Não altera valores financeiros; só reassocia FKs e arquiva a origem.

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
  v_source_name text;
  v_target_name text;
  v_source_status text;
  v_target_status text;
begin
  if p_source_client_id is null or p_target_client_id is null then
    return jsonb_build_object('ok', false, 'reason', 'missing_ids');
  end if;

  if p_source_client_id = p_target_client_id then
    return jsonb_build_object('ok', false, 'reason', 'same_client');
  end if;

  select source.workspace_id, source.name, source.commercial_status
  into v_workspace_id, v_source_name, v_source_status
  from public.clients as source
  where source.id = p_source_client_id;

  if v_workspace_id is null then
    return jsonb_build_object('ok', false, 'reason', 'source_not_found');
  end if;

  if (select auth.uid()) is null
    or not (select private.is_active_workspace_owner(v_workspace_id)) then
    raise insufficient_privilege using message = 'active workspace owner required';
  end if;

  select target.name, target.commercial_status
  into v_target_name, v_target_status
  from public.clients as target
  where target.id = p_target_client_id
    and target.workspace_id = v_workspace_id;

  if v_target_name is null then
    return jsonb_build_object('ok', false, 'reason', 'target_not_found_or_cross_workspace');
  end if;

  if exists (
    select 1
    from public.client_entities as entity
    where entity.workspace_id = v_workspace_id
      and entity.client_id = p_source_client_id
      and entity.archived_at is null
  ) then
    return jsonb_build_object(
      'ok', false,
      'reason', 'source_has_entities',
      'message', 'O cliente de origem já possui empresas/marcas. Consolide-as antes ou mova manualmente.'
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'workspace_id', v_workspace_id,
    'source', jsonb_build_object(
      'id', p_source_client_id,
      'name', v_source_name,
      'status', v_source_status
    ),
    'target', jsonb_build_object(
      'id', p_target_client_id,
      'name', v_target_name,
      'status', v_target_status
    ),
    'counts', jsonb_build_object(
      'services', (select count(*) from public.client_services
        where workspace_id = v_workspace_id and client_id = p_source_client_id),
      'charges', (select count(*) from public.charges
        where workspace_id = v_workspace_id and client_id = p_source_client_id),
      'expenses', (select count(*) from public.expenses
        where workspace_id = v_workspace_id and client_id = p_source_client_id),
      'domains', (select count(*) from public.domains
        where workspace_id = v_workspace_id and client_id = p_source_client_id),
      'contacts', (select count(*) from public.client_contacts
        where workspace_id = v_workspace_id and client_id = p_source_client_id)
    ),
    'totals', jsonb_build_object(
      'own_received', coalesce((
        select sum(charge.company_revenue
          + case when charge.additional_fee_is_revenue then charge.additional_fee else 0 end)
        from public.charges as charge
        where charge.workspace_id = v_workspace_id
          and charge.client_id = p_source_client_id
          and charge.status = 'paid'
      ), 0),
      'media', coalesce((
        select sum(charge.media_budget
          + case when charge.additional_fee_is_revenue then 0 else charge.additional_fee end)
        from public.charges as charge
        where charge.workspace_id = v_workspace_id
          and charge.client_id = p_source_client_id
          and charge.status <> 'cancelled'
      ), 0),
      'expenses_paid', coalesce((
        select sum(expense.amount)
        from public.expenses as expense
        where expense.workspace_id = v_workspace_id
          and expense.client_id = p_source_client_id
          and expense.status = 'paid'
      ), 0)
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

  -- Trava origem e destino no mesmo workspace.
  perform 1 from public.clients
  where id = p_source_client_id and workspace_id = v_workspace_id
  for update;
  perform 1 from public.clients
  where id = p_target_client_id and workspace_id = v_workspace_id
  for update;

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
      workspace_id, client_id, entity_type, display_name, status, created_by, updated_by
    ) values (
      v_workspace_id, p_target_client_id, v_entity_type, v_entity_name, 'active', v_user_id, v_user_id
    )
    returning id into v_entity_id;
  end if;

  -- A FK composta charges↔client_services impede mudar client_id dos dois ao mesmo tempo.
  -- Solução: soltar o vínculo temporariamente, mover serviços, depois religar cobranças.
  create temporary table if not exists _consolidate_charge_services (
    charge_id uuid primary key,
    client_service_id uuid
  ) on commit drop;

  delete from _consolidate_charge_services;

  insert into _consolidate_charge_services (charge_id, client_service_id)
  select charge.id, charge.client_service_id
  from public.charges as charge
  where charge.workspace_id = v_workspace_id
    and charge.client_id = p_source_client_id
    and charge.client_service_id is not null;

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
    client_service_id = map.client_service_id,
    updated_by = v_user_id,
    updated_at = statement_timestamp()
  from _consolidate_charge_services as map
  where charge.id = map.charge_id
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

  -- Contatos da origem são removidos (não há FK de entity); evita órfãos no cliente arquivado.
  delete from public.client_contacts
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

  update public.activity_events
  set client_id = p_target_client_id
  where workspace_id = v_workspace_id
    and client_id = p_source_client_id;

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
        'domains', v_domains,
        'contacts_removed', v_contacts
      )
    )
  );

  select coalesce(sum(charge.company_revenue
    + case when charge.additional_fee_is_revenue then charge.additional_fee else 0 end), 0)
  into v_after_own
  from public.charges as charge
  where charge.workspace_id = v_workspace_id
    and charge.client_entity_id = v_entity_id
    and charge.status = 'paid';

  select coalesce(sum(charge.media_budget
    + case when charge.additional_fee_is_revenue then 0 else charge.additional_fee end), 0)
  into v_after_media
  from public.charges as charge
  where charge.workspace_id = v_workspace_id
    and charge.client_entity_id = v_entity_id
    and charge.status <> 'cancelled';

  select coalesce(sum(expense.amount), 0)
  into v_after_expenses
  from public.expenses as expense
  where expense.workspace_id = v_workspace_id
    and expense.client_entity_id = v_entity_id
    and expense.status = 'paid';

  select count(*)
  into v_after_charges
  from public.charges as charge
  where charge.workspace_id = v_workspace_id
    and charge.client_entity_id = v_entity_id;

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

revoke all on function public.preview_consolidate_client_into_entity(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.consolidate_client_into_entity(uuid, uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.preview_consolidate_client_into_entity(uuid, uuid)
  to authenticated;
grant execute on function public.consolidate_client_into_entity(uuid, uuid, text, text, text)
  to authenticated;

comment on function public.preview_consolidate_client_into_entity(uuid, uuid) is
  'Prévia segura da consolidação de cliente legado em empresa/marca.';
comment on function public.consolidate_client_into_entity(uuid, uuid, text, text, text) is
  'Move serviços, cobranças, despesas e domínios do cliente origem para uma entity no destino e arquiva a origem.';
