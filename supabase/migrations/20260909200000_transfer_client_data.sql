-- Transferência de dados operacionais entre clientes do mesmo workspace.
-- Move entidades, contatos, serviços, cobranças, despesas e domínios sem recalcular
-- valores e sem converter o cliente origem em empresa/marca.

create or replace function public.preview_transfer_client_data(
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
  if v_source.id is null then
    return jsonb_build_object('ok', false, 'reason', 'source_not_found');
  end if;
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

  return jsonb_build_object(
    'ok', true,
    'workspace_id', v_workspace_id,
    'source', jsonb_build_object(
      'id', v_source.id,
      'name', v_source.name,
      'status', v_source.commercial_status
    ),
    'target', jsonb_build_object(
      'id', v_target.id,
      'name', v_target.name,
      'status', v_target.commercial_status
    ),
    'counts', jsonb_build_object(
      'entities', (
        select count(*) from public.client_entities
        where workspace_id = v_workspace_id and client_id = p_source_client_id
      ),
      'services', (
        select count(*) from public.client_services
        where workspace_id = v_workspace_id and client_id = p_source_client_id
      ),
      'charges', (
        select count(*) from public.charges
        where workspace_id = v_workspace_id and client_id = p_source_client_id
      ),
      'expenses', (
        select count(*) from public.expenses
        where workspace_id = v_workspace_id and client_id = p_source_client_id
      ),
      'domains', (
        select count(*) from public.domains
        where workspace_id = v_workspace_id and client_id = p_source_client_id
      ),
      'contacts', (
        select count(*) from public.client_contacts
        where workspace_id = v_workspace_id and client_id = p_source_client_id
      )
    ),
    'entity_renames', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', source_entity.id,
          'from', source_entity.display_name,
          'to', case
            when char_length(btrim(source_entity.display_name) || ' (transferido)') <= 160
              then btrim(source_entity.display_name) || ' (transferido)'
            else left(btrim(source_entity.display_name), 146) || ' (transferido)'
          end
        )
        order by source_entity.display_name
      )
      from public.client_entities as source_entity
      where source_entity.workspace_id = v_workspace_id
        and source_entity.client_id = p_source_client_id
        and source_entity.archived_at is null
        and source_entity.status <> 'archived'
        and exists (
          select 1
          from public.client_entities as target_entity
          where target_entity.workspace_id = v_workspace_id
            and target_entity.client_id = p_target_client_id
            and target_entity.archived_at is null
            and target_entity.status <> 'archived'
            and lower(btrim(target_entity.display_name))
              = lower(btrim(source_entity.display_name))
        )
    ), '[]'::jsonb),
    'preserved', jsonb_build_object('activity_events', true),
    'totals', jsonb_build_object(
      'own_received', coalesce((
        select sum(
          company_revenue
          + case when additional_fee_is_revenue then additional_fee else 0 end
        )
        from public.charges
        where workspace_id = v_workspace_id
          and client_id = p_source_client_id
          and status = 'paid'
      ), 0),
      'media', coalesce((
        select sum(
          media_budget
          + case when additional_fee_is_revenue then 0 else additional_fee end
        )
        from public.charges
        where workspace_id = v_workspace_id
          and client_id = p_source_client_id
          and status <> 'cancelled'
      ), 0),
      'expenses_paid', coalesce((
        select sum(amount)
        from public.expenses
        where workspace_id = v_workspace_id
          and client_id = p_source_client_id
          and status = 'paid'
      ), 0)
    )
  );
end;
$$;

create or replace function public.transfer_client_data(
  p_source_client_id uuid,
  p_target_client_id uuid,
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
  v_entities bigint;
  v_services bigint;
  v_expenses bigint;
  v_domains bigint;
  v_contacts bigint;
  v_service_links jsonb := '[]'::jsonb;
  v_service_entity_links jsonb := '[]'::jsonb;
  v_charge_entity_links jsonb := '[]'::jsonb;
  v_expense_entity_links jsonb := '[]'::jsonb;
  v_domain_entity_links jsonb := '[]'::jsonb;
  v_moved_charge_ids uuid[] := array[]::uuid[];
  v_moved_expense_ids uuid[] := array[]::uuid[];
  v_entity record;
  v_new_name text;
  v_suffix text;
  v_source_archived boolean := false;
  v_renamed_count bigint := 0;
begin
  if coalesce(p_confirmation, '') is distinct from 'TRANSFERIR' then
    return jsonb_build_object('ok', false, 'reason', 'confirmation_required');
  end if;

  v_preview := public.preview_transfer_client_data(p_source_client_id, p_target_client_id);
  if coalesce((v_preview ->> 'ok')::boolean, false) is not true then
    return v_preview;
  end if;

  v_workspace_id := (v_preview ->> 'workspace_id')::uuid;
  v_before_own := (v_preview #>> '{totals,own_received}')::numeric;
  v_before_media := (v_preview #>> '{totals,media}')::numeric;
  v_before_expenses := (v_preview #>> '{totals,expenses_paid}')::numeric;
  v_before_charges := (v_preview #>> '{counts,charges}')::bigint;
  v_entities := (v_preview #>> '{counts,entities}')::bigint;
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

  select coalesce(
    jsonb_agg(jsonb_build_object('id', service.id, 'client_entity_id', service.client_entity_id)),
    '[]'::jsonb
  )
  into v_service_entity_links
  from public.client_services as service
  where service.workspace_id = v_workspace_id
    and service.client_id = p_source_client_id
    and service.client_entity_id is not null;

  select coalesce(
    jsonb_agg(jsonb_build_object('id', charge.id, 'client_entity_id', charge.client_entity_id)),
    '[]'::jsonb
  )
  into v_charge_entity_links
  from public.charges as charge
  where charge.workspace_id = v_workspace_id
    and charge.client_id = p_source_client_id
    and charge.client_entity_id is not null;

  select coalesce(
    jsonb_agg(jsonb_build_object('id', expense.id, 'client_entity_id', expense.client_entity_id)),
    '[]'::jsonb
  )
  into v_expense_entity_links
  from public.expenses as expense
  where expense.workspace_id = v_workspace_id
    and expense.client_id = p_source_client_id
    and expense.client_entity_id is not null;

  select coalesce(
    jsonb_agg(jsonb_build_object('id', domain_row.id, 'client_entity_id', domain_row.client_entity_id)),
    '[]'::jsonb
  )
  into v_domain_entity_links
  from public.domains as domain_row
  where domain_row.workspace_id = v_workspace_id
    and domain_row.client_id = p_source_client_id
    and domain_row.client_entity_id is not null;

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

  -- FK composta charges↔services: desvincula antes de mudar client_id.
  update public.charges
  set
    client_service_id = null,
    updated_by = v_user_id,
    updated_at = statement_timestamp()
  where workspace_id = v_workspace_id
    and client_id = p_source_client_id
    and client_service_id is not null;

  -- FK composta (workspace, client, entity): anula entity nos filhos antes de mover entities.
  update public.client_services
  set
    client_entity_id = null,
    updated_by = v_user_id,
    updated_at = statement_timestamp()
  where workspace_id = v_workspace_id
    and client_id = p_source_client_id
    and client_entity_id is not null;

  update public.charges
  set
    client_entity_id = null,
    updated_by = v_user_id,
    updated_at = statement_timestamp()
  where workspace_id = v_workspace_id
    and client_id = p_source_client_id
    and client_entity_id is not null;

  update public.expenses
  set
    client_entity_id = null,
    updated_by = v_user_id,
    updated_at = statement_timestamp()
  where workspace_id = v_workspace_id
    and client_id = p_source_client_id
    and client_entity_id is not null;

  update public.domains
  set
    client_entity_id = null,
    updated_by = v_user_id,
    updated_at = statement_timestamp()
  where workspace_id = v_workspace_id
    and client_id = p_source_client_id
    and client_entity_id is not null;

  -- Conflito de nome ativo no destino: renomeia a origem, nunca sobrescreve o destino.
  for v_entity in
    select entity.id, entity.display_name
    from public.client_entities as entity
    where entity.workspace_id = v_workspace_id
      and entity.client_id = p_source_client_id
      and entity.archived_at is null
      and entity.status <> 'archived'
      and exists (
        select 1
        from public.client_entities as target_entity
        where target_entity.workspace_id = v_workspace_id
          and target_entity.client_id = p_target_client_id
          and target_entity.archived_at is null
          and target_entity.status <> 'archived'
          and lower(btrim(target_entity.display_name)) = lower(btrim(entity.display_name))
      )
    order by entity.id
    for update
  loop
    v_new_name := btrim(v_entity.display_name) || ' (transferido)';
    if char_length(v_new_name) > 160 then
      v_new_name := left(btrim(v_entity.display_name), 146) || ' (transferido)';
    end if;

    if exists (
      select 1 from public.client_entities as target_entity
      where target_entity.workspace_id = v_workspace_id
        and target_entity.client_id = p_target_client_id
        and target_entity.archived_at is null
        and target_entity.status <> 'archived'
        and lower(btrim(target_entity.display_name)) = lower(btrim(v_new_name))
    ) or exists (
      select 1 from public.client_entities as sibling
      where sibling.workspace_id = v_workspace_id
        and sibling.client_id = p_source_client_id
        and sibling.id <> v_entity.id
        and sibling.archived_at is null
        and sibling.status <> 'archived'
        and lower(btrim(sibling.display_name)) = lower(btrim(v_new_name))
    ) then
      v_suffix := format(' (de %s)', btrim(v_source.name));
      if char_length(btrim(v_entity.display_name) || v_suffix) <= 160 then
        v_new_name := btrim(v_entity.display_name) || v_suffix;
      else
        v_new_name := left(btrim(v_entity.display_name), greatest(2, 160 - char_length(v_suffix)))
          || v_suffix;
      end if;
    end if;

    if exists (
      select 1 from public.client_entities as target_entity
      where target_entity.workspace_id = v_workspace_id
        and target_entity.client_id = p_target_client_id
        and target_entity.archived_at is null
        and target_entity.status <> 'archived'
        and lower(btrim(target_entity.display_name)) = lower(btrim(v_new_name))
    ) or exists (
      select 1 from public.client_entities as sibling
      where sibling.workspace_id = v_workspace_id
        and sibling.client_id = p_source_client_id
        and sibling.id <> v_entity.id
        and sibling.archived_at is null
        and sibling.status <> 'archived'
        and lower(btrim(sibling.display_name)) = lower(btrim(v_new_name))
    ) then
      v_suffix := ' (t' || left(replace(v_entity.id::text, '-', ''), 8) || ')';
      v_new_name := left(btrim(v_entity.display_name), greatest(2, 160 - char_length(v_suffix)))
        || v_suffix;
    end if;

    update public.client_entities
    set
      display_name = v_new_name,
      updated_by = v_user_id,
      updated_at = statement_timestamp()
    where id = v_entity.id
      and workspace_id = v_workspace_id;

    v_renamed_count := v_renamed_count + 1;
  end loop;

  update public.client_entities
  set
    client_id = p_target_client_id,
    updated_by = v_user_id,
    updated_at = statement_timestamp()
  where workspace_id = v_workspace_id
    and client_id = p_source_client_id;

  update public.client_services as service
  set
    client_id = p_target_client_id,
    client_entity_id = (link.item ->> 'client_entity_id')::uuid,
    updated_by = v_user_id,
    updated_at = statement_timestamp()
  from jsonb_array_elements(v_service_entity_links) as link(item)
  where service.id = (link.item ->> 'id')::uuid
    and service.workspace_id = v_workspace_id;

  update public.client_services
  set
    client_id = p_target_client_id,
    updated_by = v_user_id,
    updated_at = statement_timestamp()
  where workspace_id = v_workspace_id
    and client_id = p_source_client_id;

  update public.charges as charge
  set
    client_id = p_target_client_id,
    client_service_id = (link.item ->> 'client_service_id')::uuid,
    client_entity_id = coalesce(
      (
        select (entity_link.item ->> 'client_entity_id')::uuid
        from jsonb_array_elements(v_charge_entity_links) as entity_link(item)
        where (entity_link.item ->> 'id')::uuid = charge.id
        limit 1
      ),
      charge.client_entity_id
    ),
    updated_by = v_user_id,
    updated_at = statement_timestamp()
  from jsonb_array_elements(v_service_links) as link(item)
  where charge.id = (link.item ->> 'charge_id')::uuid
    and charge.workspace_id = v_workspace_id;

  update public.charges as charge
  set
    client_id = p_target_client_id,
    client_entity_id = (link.item ->> 'client_entity_id')::uuid,
    updated_by = v_user_id,
    updated_at = statement_timestamp()
  from jsonb_array_elements(v_charge_entity_links) as link(item)
  where charge.id = (link.item ->> 'id')::uuid
    and charge.workspace_id = v_workspace_id
    and charge.client_id = p_source_client_id;

  update public.charges
  set
    client_id = p_target_client_id,
    updated_by = v_user_id,
    updated_at = statement_timestamp()
  where workspace_id = v_workspace_id
    and client_id = p_source_client_id;

  update public.expenses as expense
  set
    client_id = p_target_client_id,
    client_entity_id = (link.item ->> 'client_entity_id')::uuid,
    updated_by = v_user_id,
    updated_at = statement_timestamp()
  from jsonb_array_elements(v_expense_entity_links) as link(item)
  where expense.id = (link.item ->> 'id')::uuid
    and expense.workspace_id = v_workspace_id;

  update public.expenses
  set
    client_id = p_target_client_id,
    updated_by = v_user_id,
    updated_at = statement_timestamp()
  where workspace_id = v_workspace_id
    and client_id = p_source_client_id;

  update public.domains as domain_row
  set
    client_id = p_target_client_id,
    client_entity_id = (link.item ->> 'client_entity_id')::uuid,
    updated_by = v_user_id,
    updated_at = statement_timestamp()
  from jsonb_array_elements(v_domain_entity_links) as link(item)
  where domain_row.id = (link.item ->> 'id')::uuid
    and domain_row.workspace_id = v_workspace_id;

  update public.domains
  set
    client_id = p_target_client_id,
    updated_by = v_user_id,
    updated_at = statement_timestamp()
  where workspace_id = v_workspace_id
    and client_id = p_source_client_id;

  -- No máximo um contato principal ativo por cliente.
  if exists (
    select 1 from public.client_contacts
    where workspace_id = v_workspace_id
      and client_id = p_target_client_id
      and is_primary
      and archived_at is null
  ) then
    update public.client_contacts
    set
      is_primary = false,
      updated_by = v_user_id,
      updated_at = statement_timestamp()
    where workspace_id = v_workspace_id
      and client_id = p_source_client_id
      and is_primary
      and archived_at is null;
  end if;

  update public.client_contacts
  set
    client_id = p_target_client_id,
    updated_by = v_user_id,
    updated_at = statement_timestamp()
  where workspace_id = v_workspace_id
    and client_id = p_source_client_id;

  if not exists (
    select 1 from public.client_services
    where workspace_id = v_workspace_id and client_id = p_source_client_id
  ) and not exists (
    select 1 from public.charges
    where workspace_id = v_workspace_id and client_id = p_source_client_id
  ) and not exists (
    select 1 from public.expenses
    where workspace_id = v_workspace_id and client_id = p_source_client_id
  ) and not exists (
    select 1 from public.domains
    where workspace_id = v_workspace_id and client_id = p_source_client_id
  ) and not exists (
    select 1 from public.client_entities
    where workspace_id = v_workspace_id and client_id = p_source_client_id
  ) then
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
          'Dados transferidos para %s em %s.',
          (v_preview #>> '{target,name}'),
          statement_timestamp()::date
        )
      )
    where workspace_id = v_workspace_id
      and id = p_source_client_id;
    v_source_archived := true;
  end if;

  insert into public.activity_events (
    workspace_id, client_id, actor_user_id, entity_type, entity_id, action, summary, event_data
  ) values (
    v_workspace_id,
    p_target_client_id,
    v_user_id,
    'client',
    p_target_client_id,
    'client.data_transferred',
    format(
      'Dados de "%s" transferidos para "%s".',
      (v_preview #>> '{source,name}'),
      (v_preview #>> '{target,name}')
    ),
    jsonb_build_object(
      'source_client_id', p_source_client_id,
      'target_client_id', p_target_client_id,
      'source_archived', v_source_archived,
      'renamed_entities', v_renamed_count,
      'moved', jsonb_build_object(
        'entities', v_entities,
        'services', v_services,
        'charges', v_before_charges,
        'expenses', v_expenses,
        'domains', v_domains,
        'contacts', v_contacts
      ),
      'preserved', jsonb_build_object(
        'activity_events', (
          select count(*) from public.activity_events
          where workspace_id = v_workspace_id and client_id = p_source_client_id
        )
      )
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
  ) or exists (
    select 1 from public.client_entities
    where workspace_id = v_workspace_id and client_id = p_source_client_id
  ) or exists (
    select 1 from public.client_contacts
    where workspace_id = v_workspace_id and client_id = p_source_client_id
  ) then
    raise exception 'transfer left records on source client'
      using errcode = 'P0001';
  end if;

  if v_after_own is distinct from v_before_own
    or v_after_media is distinct from v_before_media
    or v_after_expenses is distinct from v_before_expenses
    or v_after_charges is distinct from v_before_charges then
    raise exception 'transfer totals mismatch'
      using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'ok', true,
    'source_client_id', p_source_client_id,
    'target_client_id', p_target_client_id,
    'source_archived', v_source_archived,
    'renamed_entities', v_renamed_count,
    'totals', jsonb_build_object(
      'own_received', v_after_own,
      'media', v_after_media,
      'expenses_paid', v_after_expenses,
      'charges', v_after_charges
    )
  );
end;
$$;

revoke all on function public.preview_transfer_client_data(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.transfer_client_data(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.preview_transfer_client_data(uuid, uuid)
  to authenticated;
grant execute on function public.transfer_client_data(uuid, uuid, text)
  to authenticated;

comment on function public.preview_transfer_client_data(uuid, uuid) is
  'Prévia segura da transferência de dados operacionais entre clientes do mesmo workspace.';
comment on function public.transfer_client_data(uuid, uuid, text) is
  'Move entidades, contatos, serviços, cobranças, despesas e domínios do cliente origem para o destino sem recalcular valores.';
