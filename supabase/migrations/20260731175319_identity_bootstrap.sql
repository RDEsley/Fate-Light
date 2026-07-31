create table private.identity_bootstrap_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  action text not null,
  accepted_document_count smallint not null,
  occurred_at timestamptz not null default statement_timestamp(),
  constraint identity_bootstrap_audit_action_check
    check (action in ('bootstrap_created', 'bootstrap_reused')),
  constraint identity_bootstrap_audit_document_count_check
    check (accepted_document_count > 0)
);

create index identity_bootstrap_audit_actor_occurred_idx
  on private.identity_bootstrap_audit_events (actor_user_id, occurred_at desc);

create index identity_bootstrap_audit_workspace_occurred_idx
  on private.identity_bootstrap_audit_events (workspace_id, occurred_at desc);

create or replace function private.current_user_is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and account_status = 'active'
  );
$$;

create or replace function private.current_user_can_read_legal_documents()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and not exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and account_status <> 'active'
    );
$$;

create or replace function private.is_active_workspace_owner(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members as member
    join public.workspaces as workspace
      on workspace.id = member.workspace_id
    join public.profiles as profile
      on profile.id = member.user_id
    where member.workspace_id = p_workspace_id
      and member.user_id = (select auth.uid())
      and member.role = 'owner'
      and member.status = 'active'
      and workspace.status = 'active'
      and profile.account_status = 'active'
  );
$$;

create or replace function private.bootstrap_identity_workspace(
  p_full_name text,
  p_workspace_name text,
  p_accepted_legal_document_ids uuid[],
  p_phone text default null,
  p_locale text default 'pt-BR',
  p_timezone text default 'America/Sao_Paulo',
  p_theme text default 'system',
  p_currency text default 'BRL',
  p_legal_name text default null,
  p_trade_name text default null,
  p_tax_id text default null,
  p_date_format text default 'DD/MM/YYYY',
  p_accounting_basis text default 'cash',
  p_default_alert_offsets smallint[] default array[30, 15, 7, 1]::smallint[]
)
returns table (
  profile_id uuid,
  workspace_id uuid,
  workspace_created boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_workspace_id uuid;
  v_workspace_status text;
  v_workspace_created boolean := false;
  v_required_document_count integer;
  v_requested_document_count integer;
begin
  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication is required to bootstrap identity.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  if p_accepted_legal_document_ids is null
    or cardinality(p_accepted_legal_document_ids) = 0
    or exists (
      select 1
      from unnest(p_accepted_legal_document_ids) as requested_document_id
      where requested_document_id is null
    )
  then
    raise exception using
      errcode = '22023',
      message = 'All current required legal documents must be accepted.';
  end if;

  select count(*)
  into v_required_document_count
  from public.legal_documents
  where status = 'published'
    and is_required
    and effective_at <= statement_timestamp();

  select count(distinct requested_document_id)
  into v_requested_document_count
  from unnest(p_accepted_legal_document_ids) as requested_document_id;

  if v_required_document_count = 0
    or v_requested_document_count <> v_required_document_count
    or exists (
      select 1
      from public.legal_documents as required_document
      where required_document.status = 'published'
        and required_document.is_required
        and required_document.effective_at <= statement_timestamp()
        and not (required_document.id = any(p_accepted_legal_document_ids))
    )
    or exists (
      select 1
      from unnest(p_accepted_legal_document_ids) as requested_document_id
      where not exists (
        select 1
        from public.legal_documents as required_document
        where required_document.id = requested_document_id
          and required_document.status = 'published'
          and required_document.is_required
          and required_document.effective_at <= statement_timestamp()
      )
    )
  then
    raise exception using
      errcode = '22023',
      message = 'Accepted legal documents do not match the current required set.';
  end if;

  insert into public.profiles (
    id,
    full_name,
    phone,
    locale,
    timezone,
    theme
  ) values (
    v_user_id,
    btrim(p_full_name),
    nullif(btrim(p_phone), ''),
    p_locale,
    p_timezone,
    p_theme
  )
  on conflict (id) do nothing;

  if not exists (
    select 1
    from public.profiles
    where id = v_user_id
      and account_status = 'active'
  ) then
    raise exception using
      errcode = '42501',
      message = 'The authenticated account is not active.';
  end if;

  insert into public.workspaces (
    name,
    currency,
    timezone,
    created_by
  ) values (
    btrim(p_workspace_name),
    upper(p_currency),
    p_timezone,
    v_user_id
  )
  on conflict (created_by) do nothing
  returning id into v_workspace_id;

  if v_workspace_id is not null then
    v_workspace_created := true;
  else
    select id, status
    into v_workspace_id, v_workspace_status
    from public.workspaces
    where created_by = v_user_id;
  end if;

  if v_workspace_id is null then
    raise exception using
      errcode = '23514',
      message = 'Unable to resolve the authenticated user workspace.';
  end if;

  if not v_workspace_created and v_workspace_status <> 'active' then
    raise exception using
      errcode = '42501',
      message = 'The workspace is not active.';
  end if;

  insert into public.workspace_members (
    workspace_id,
    user_id,
    role,
    status
  ) values (
    v_workspace_id,
    v_user_id,
    'owner',
    'active'
  )
  on conflict on constraint workspace_members_pkey do nothing;

  if not exists (
    select 1
    from public.workspace_members as member
    where member.workspace_id = v_workspace_id
      and member.user_id = v_user_id
      and member.role = 'owner'
      and member.status = 'active'
  ) then
    raise exception using
      errcode = '42501',
      message = 'The workspace owner membership is not active.';
  end if;

  insert into public.workspace_settings (
    workspace_id,
    legal_name,
    trade_name,
    tax_id,
    date_format,
    accounting_basis,
    default_alert_offsets
  ) values (
    v_workspace_id,
    coalesce(nullif(btrim(p_legal_name), ''), btrim(p_workspace_name)),
    nullif(btrim(p_trade_name), ''),
    nullif(btrim(p_tax_id), ''),
    p_date_format,
    p_accounting_basis,
    p_default_alert_offsets
  )
  on conflict on constraint workspace_settings_pkey do nothing;

  insert into public.legal_acceptances (
    user_id,
    legal_document_id,
    document_version,
    source
  )
  select
    v_user_id,
    document.id,
    document.version,
    'onboarding'
  from public.legal_documents as document
  where document.id = any(p_accepted_legal_document_ids)
  on conflict on constraint legal_acceptances_user_document_unique do nothing;

  insert into private.identity_bootstrap_audit_events (
    actor_user_id,
    workspace_id,
    action,
    accepted_document_count
  ) values (
    v_user_id,
    v_workspace_id,
    case
      when v_workspace_created then 'bootstrap_created'
      else 'bootstrap_reused'
    end,
    v_required_document_count::smallint
  );

  return query
  select v_user_id, v_workspace_id, v_workspace_created;
end;
$$;

create or replace function public.bootstrap_identity_workspace(
  p_full_name text,
  p_workspace_name text,
  p_accepted_legal_document_ids uuid[],
  p_phone text default null,
  p_locale text default 'pt-BR',
  p_timezone text default 'America/Sao_Paulo',
  p_theme text default 'system',
  p_currency text default 'BRL',
  p_legal_name text default null,
  p_trade_name text default null,
  p_tax_id text default null,
  p_date_format text default 'DD/MM/YYYY',
  p_accounting_basis text default 'cash',
  p_default_alert_offsets smallint[] default array[30, 15, 7, 1]::smallint[]
)
returns table (
  profile_id uuid,
  workspace_id uuid,
  workspace_created boolean
)
language sql
security invoker
set search_path = ''
as $$
  select *
  from private.bootstrap_identity_workspace(
    p_full_name,
    p_workspace_name,
    p_accepted_legal_document_ids,
    p_phone,
    p_locale,
    p_timezone,
    p_theme,
    p_currency,
    p_legal_name,
    p_trade_name,
    p_tax_id,
    p_date_format,
    p_accounting_basis,
    p_default_alert_offsets
  );
$$;

comment on function public.bootstrap_identity_workspace(
  text, text, uuid[], text, text, text, text, text, text, text, text, text, text, smallint[]
) is
  'RPC invoker: cria/reutiliza somente a identidade derivada de auth.uid().' ;
