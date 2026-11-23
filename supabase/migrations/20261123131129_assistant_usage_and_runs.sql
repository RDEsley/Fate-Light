-- Assistente com IA (ADR-0026): limite diário de uso e registro mínimo das execuções.

-- Fica em `private`: ninguém lê ou altera o contador pela API.
create table private.agent_usage_daily (
  scope text not null,
  day date not null,
  used integer not null default 0,
  primary key (scope, day),
  constraint agent_usage_daily_used_check check (used >= 0)
);

create index agent_usage_daily_day_idx on private.agent_usage_daily (day);

revoke all on table private.agent_usage_daily from public, anon, authenticated, service_role;

create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid default auth.uid(),
  is_guest boolean not null default false,
  question text not null,
  tools jsonb not null default '[]'::jsonb,
  outcome text not null,
  error_code text,
  duration_ms integer not null,
  model text not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint agent_runs_question_check check (char_length(question) <= 200),
  constraint agent_runs_tools_check check (jsonb_typeof(tools) = 'array'),
  constraint agent_runs_outcome_check check (outcome in ('ok', 'error')),
  constraint agent_runs_error_code_check check (error_code is null or char_length(error_code) <= 40),
  constraint agent_runs_duration_check check (duration_ms >= 0),
  constraint agent_runs_model_check check (char_length(model) between 1 and 80),
  constraint agent_runs_owner_check check (
    (is_guest and workspace_id is null and user_id is null)
    or (not is_guest and workspace_id is not null and user_id is not null)
  )
);

create index agent_runs_workspace_created_idx
  on public.agent_runs (workspace_id, created_at desc)
  where workspace_id is not null;
create index agent_runs_created_idx on public.agent_runs (created_at);

alter table public.agent_runs enable row level security;
alter table public.agent_runs force row level security;

revoke all on table public.agent_runs from public, anon, authenticated;
grant select on table public.agent_runs to authenticated;
grant insert (workspace_id, question, tools, outcome, error_code, duration_ms, model)
  on table public.agent_runs to authenticated;

create policy agent_runs_select_owner on public.agent_runs
for select to authenticated
using ((select private.is_active_workspace_owner(workspace_id)));

create policy agent_runs_insert_owner on public.agent_runs
for insert to authenticated
with check (
  (select private.is_active_workspace_owner(workspace_id))
  and user_id = (select auth.uid())
  and not is_guest
);

create function private.agent_usage_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (statement_timestamp() at time zone 'America/Sao_Paulo')::date;
$$;

create function private.purge_agent_data()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.agent_runs where created_at < statement_timestamp() - interval '30 days';
  delete from private.agent_usage_daily where day < private.agent_usage_today() - 2;
$$;

create function private.take_agent_quota(p_scope text, p_limit integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_used integer;
begin
  insert into private.agent_usage_daily as usage (scope, day, used)
  values (p_scope, private.agent_usage_today(), 1)
  on conflict (scope, day) do update
    set used = usage.used + 1
    where usage.used < p_limit
  returning usage.used into v_used;

  return v_used;
end;
$$;

-- Os limites ficam aqui, e não em parâmetros: esta função é alcançável pelo usuário.
create function private.consume_user_agent_quota(p_kind text)
returns table (allowed boolean, remaining integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_limit integer;
  v_used integer;
begin
  if v_user is null then
    raise exception 'Sessão obrigatória.' using errcode = '42501';
  end if;

  v_limit := case p_kind when 'message' then 10 when 'continuation' then 20 end;
  if v_limit is null then
    raise exception 'Tipo de uso inválido.' using errcode = '22023';
  end if;

  perform private.purge_agent_data();
  v_used := private.take_agent_quota('user:' || v_user::text || ':' || p_kind, v_limit);
  return query select v_used is not null, greatest(v_limit - coalesce(v_used, v_limit), 0);
end;
$$;

create function public.consume_agent_quota(p_kind text)
returns table (allowed boolean, remaining integer)
language sql
security invoker
set search_path = ''
as $$
  select quota.allowed, quota.remaining from private.consume_user_agent_quota(p_kind) as quota;
$$;

-- Visitante não tem sessão: só o servidor, com a chave secreta, chama estas funções.
create function public.consume_guest_agent_quota(
  p_ip_hash text,
  p_kind text,
  p_global_cap integer
)
returns table (allowed boolean, remaining integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer;
  v_scope text;
  v_used integer;
begin
  v_limit := case p_kind when 'message' then 10 when 'continuation' then 20 end;
  if v_limit is null or p_ip_hash !~ '^[a-f0-9]{64}$' or p_global_cap < 1 then
    raise exception 'Parâmetros de uso inválidos.' using errcode = '22023';
  end if;

  perform private.purge_agent_data();
  v_scope := 'guest:' || p_ip_hash || ':' || p_kind;
  v_used := private.take_agent_quota(v_scope, v_limit);
  if v_used is null then
    return query select false, 0;
    return;
  end if;

  if private.take_agent_quota('guest:global', p_global_cap) is null then
    -- O teto global recusou: devolve o uso individual, que não chegou a ser gasto.
    update private.agent_usage_daily
      set used = used - 1
      where scope = v_scope and day = private.agent_usage_today();
    return query select false, 0;
    return;
  end if;

  return query select true, v_limit - v_used;
end;
$$;

create function public.record_guest_agent_run(
  p_question text,
  p_tools jsonb,
  p_outcome text,
  p_error_code text,
  p_duration_ms integer,
  p_model text
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.agent_runs (
    workspace_id, user_id, is_guest, question, tools, outcome, error_code, duration_ms, model
  )
  values (
    null, null, true, p_question, p_tools, p_outcome, nullif(p_error_code, ''), p_duration_ms,
    p_model
  );
$$;

revoke all on function private.agent_usage_today() from public, anon, authenticated, service_role;
revoke all on function private.purge_agent_data() from public, anon, authenticated, service_role;
revoke all on function private.take_agent_quota(text, integer)
  from public, anon, authenticated, service_role;
revoke all on function private.consume_user_agent_quota(text)
  from public, anon, authenticated, service_role;
grant execute on function private.consume_user_agent_quota(text) to authenticated;

revoke all on function public.consume_agent_quota(text) from public, anon, service_role;
grant execute on function public.consume_agent_quota(text) to authenticated;

revoke all on function public.consume_guest_agent_quota(text, text, integer)
  from public, anon, authenticated;
grant execute on function public.consume_guest_agent_quota(text, text, integer) to service_role;

revoke all on function public.record_guest_agent_run(text, jsonb, text, text, integer, text)
  from public, anon, authenticated;
grant execute on function public.record_guest_agent_run(text, jsonb, text, text, integer, text)
  to service_role;

comment on table public.agent_runs is
  'Registro mínimo das execuções do assistente, mantido por 30 dias (ADR-0026).';
