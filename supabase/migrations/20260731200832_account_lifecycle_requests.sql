create table private.account_lifecycle_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete restrict,
  workspace_id uuid references public.workspaces (id) on delete restrict,
  request_type text not null,
  status text not null default 'requested',
  requested_at timestamptz not null default statement_timestamp(),
  verified_at timestamptz,
  scheduled_for timestamptz,
  completed_at timestamptz,
  artifact_expires_at timestamptz,
  correlation_id uuid not null default gen_random_uuid(),
  error_code text,
  constraint account_lifecycle_requests_type_check
    check (request_type in ('export', 'deletion')),
  constraint account_lifecycle_requests_status_check
    check (status in ('requested', 'verified', 'scheduled', 'processing', 'completed', 'failed', 'cancelled')),
  constraint account_lifecycle_requests_correlation_id_key unique (correlation_id),
  constraint account_lifecycle_requests_error_code_check
    check (error_code is null or error_code ~ '^[a-z0-9_]{1,64}$'),
  constraint account_lifecycle_requests_completed_at_check
    check ((status = 'completed') = (completed_at is not null)),
  constraint account_lifecycle_requests_artifact_expiry_check
    check (artifact_expires_at is null or completed_at is not null)
);

comment on table private.account_lifecycle_requests is
  'Registra pedidos de exportacao e exclusao. Jobs, artefatos, retencao e exclusao efetiva ficam para a Fase 11.';

create index account_lifecycle_requests_user_requested_idx
  on private.account_lifecycle_requests (user_id, requested_at desc);

create index account_lifecycle_requests_workspace_idx
  on private.account_lifecycle_requests (workspace_id)
  where workspace_id is not null;

create index account_lifecycle_requests_scheduled_idx
  on private.account_lifecycle_requests (scheduled_for)
  where scheduled_for is not null;

create unique index account_lifecycle_requests_one_active_idx
  on private.account_lifecycle_requests (user_id, request_type)
  where status in ('requested', 'verified', 'scheduled', 'processing');

revoke all privileges on table private.account_lifecycle_requests from public, anon, authenticated;

create or replace function private.request_current_account_lifecycle(p_request_type text)
returns table (
  request_id uuid,
  request_type text,
  status text,
  requested_at timestamptz,
  request_created boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_workspace_id uuid;
  v_request private.account_lifecycle_requests%rowtype;
begin
  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication is required to request an account lifecycle operation.';
  end if;

  if p_request_type is null or p_request_type not in ('export', 'deletion') then
    raise exception using
      errcode = '22023',
      message = 'Unsupported account lifecycle request type.';
  end if;

  select member.workspace_id
  into v_workspace_id
  from public.workspace_members as member
  join public.workspaces as workspace
    on workspace.id = member.workspace_id
  join public.profiles as profile
    on profile.id = member.user_id
  where member.user_id = v_user_id
    and member.role = 'owner'
    and member.status = 'active'
    and workspace.status = 'active'
    and profile.account_status = 'active';

  if v_workspace_id is null then
    raise exception using
      errcode = '42501',
      message = 'An active workspace owner is required.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || ':' || p_request_type, 0)
  );

  select request.*
  into v_request
  from private.account_lifecycle_requests as request
  where request.user_id = v_user_id
    and request.request_type = p_request_type
    and request.status in ('requested', 'verified', 'scheduled', 'processing')
  order by request.requested_at desc
  limit 1;

  if found then
    return query
    select
      v_request.id,
      v_request.request_type,
      v_request.status,
      v_request.requested_at,
      false;
    return;
  end if;

  insert into private.account_lifecycle_requests (user_id, workspace_id, request_type)
  values (v_user_id, v_workspace_id, p_request_type)
  returning * into v_request;

  return query
  select
    v_request.id,
    v_request.request_type,
    v_request.status,
    v_request.requested_at,
    true;
end;
$$;

create or replace function public.request_current_account_lifecycle(p_request_type text)
returns table (
  request_id uuid,
  request_type text,
  status text,
  requested_at timestamptz,
  request_created boolean
)
language sql
security invoker
set search_path = ''
as $$
  select *
  from private.request_current_account_lifecycle(p_request_type);
$$;

create or replace function private.get_current_account_lifecycle_requests()
returns table (
  request_id uuid,
  request_type text,
  status text,
  requested_at timestamptz,
  verified_at timestamptz,
  scheduled_for timestamptz,
  completed_at timestamptz,
  artifact_expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    request.id,
    request.request_type,
    request.status,
    request.requested_at,
    request.verified_at,
    request.scheduled_for,
    request.completed_at,
    request.artifact_expires_at
  from private.account_lifecycle_requests as request
  where request.user_id = (select auth.uid())
  order by request.requested_at desc;
$$;

create or replace function public.get_current_account_lifecycle_requests()
returns table (
  request_id uuid,
  request_type text,
  status text,
  requested_at timestamptz,
  verified_at timestamptz,
  scheduled_for timestamptz,
  completed_at timestamptz,
  artifact_expires_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select *
  from private.get_current_account_lifecycle_requests();
$$;

comment on function public.request_current_account_lifecycle(text) is
  'Registra de forma idempotente um pedido proprio sem executar exportacao ou exclusao.';

comment on function public.get_current_account_lifecycle_requests() is
  'Lista somente estados sanitizados dos pedidos do usuario autenticado.';

revoke all privileges on function private.request_current_account_lifecycle(text)
from public, anon, authenticated;
revoke all privileges on function public.request_current_account_lifecycle(text)
from public, anon, authenticated;
revoke all privileges on function private.get_current_account_lifecycle_requests()
from public, anon, authenticated;
revoke all privileges on function public.get_current_account_lifecycle_requests()
from public, anon, authenticated;

grant execute on function private.request_current_account_lifecycle(text) to authenticated;
grant execute on function public.request_current_account_lifecycle(text) to authenticated;
grant execute on function private.get_current_account_lifecycle_requests() to authenticated;
grant execute on function public.get_current_account_lifecycle_requests() to authenticated;
