-- Assistente com IA (ADR-0026): vínculo do lembrete com a cobrança, leitura agregada do mês,
-- criação idempotente de lembretes e aceite do envio de dados ao provedor.

alter table public.manual_alerts
  add column charge_id uuid;

-- FK composta: o banco recusa por construção uma cobrança de outro workspace. Excluir a
-- cobrança mantém o lembrete, apenas sem o vínculo.
alter table public.manual_alerts
  add constraint manual_alerts_charge_fk
    foreign key (workspace_id, charge_id)
    references public.charges (workspace_id, id)
    on delete set null (charge_id);

create index manual_alerts_charge_idx
  on public.manual_alerts (workspace_id, charge_id)
  where charge_id is not null;

-- Repetir uma aprovação não cria um segundo lembrete aberto para a mesma cobrança.
create unique index manual_alerts_open_charge_unique
  on public.manual_alerts (workspace_id, charge_id)
  where charge_id is not null and state = 'open';

grant insert (charge_id) on table public.manual_alerts to authenticated;

comment on column public.manual_alerts.charge_id is
  'Cobrança lembrada pelo assistente; opcional e sempre do mesmo workspace.';

-- Só receita própria (ADR-0001/0018): mídia e repasse nunca entram nestes totais.
create function public.assistant_month_summary(
  p_workspace_id uuid,
  p_start date,
  p_end date,
  p_today date
)
returns table (
  received numeric,
  received_count integer,
  pending numeric,
  pending_count integer,
  overdue numeric,
  overdue_count integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with scoped as (
    select
      charge.status,
      charge.due_date,
      (charge.paid_at at time zone workspace.timezone)::date as paid_day,
      charge.company_revenue
        + case when charge.additional_fee_is_revenue then charge.additional_fee else 0 end
        as own_revenue
    from public.charges as charge
    join public.workspaces as workspace on workspace.id = charge.workspace_id
    where charge.workspace_id = p_workspace_id
      and charge.status in ('paid', 'pending')
  )
  select
    coalesce(sum(own_revenue) filter (
      where status = 'paid' and paid_day between p_start and p_end
    ), 0)::numeric(15, 2),
    (count(*) filter (where status = 'paid' and paid_day between p_start and p_end))::integer,
    coalesce(sum(own_revenue) filter (
      where status = 'pending' and due_date >= p_today and due_date between p_start and p_end
    ), 0)::numeric(15, 2),
    (count(*) filter (
      where status = 'pending' and due_date >= p_today and due_date between p_start and p_end
    ))::integer,
    -- Vencido inclui meses anteriores: dívida antiga continua sendo dívida no mês consultado.
    coalesce(sum(own_revenue) filter (
      where status = 'pending' and due_date < p_today and due_date <= p_end
    ), 0)::numeric(15, 2),
    (count(*) filter (
      where status = 'pending' and due_date < p_today and due_date <= p_end
    ))::integer
  from scoped;
$$;

revoke all on function public.assistant_month_summary(uuid, date, date, date)
  from public, anon, service_role;
grant execute on function public.assistant_month_summary(uuid, date, date, date)
  to authenticated;

-- Revalida no banco o que foi aprovado: só cobrança pendente e vencida do workspace vira
-- lembrete. Security invoker mantém RLS e grants de coluna valendo para quem chamou.
create function public.create_assistant_reminders(
  p_workspace_id uuid,
  p_charge_ids uuid[],
  p_today date
)
returns table (charge_id uuid, client_name text, created boolean)
language plpgsql
security invoker
set search_path = ''
as $$
-- A coluna de saída `charge_id` tem o mesmo nome da coluna de `manual_alerts`.
#variable_conflict use_column
begin
  if coalesce(cardinality(p_charge_ids), 0) not between 1 and 20 then
    raise exception 'Informe de 1 a 20 cobranças.' using errcode = '22023';
  end if;

  return query
  with eligible as (
    select charge.id, charge.client_id, charge.description, client.name
    from public.charges as charge
    join public.clients as client
      on client.workspace_id = charge.workspace_id and client.id = charge.client_id
    where charge.workspace_id = p_workspace_id
      and charge.id = any (p_charge_ids)
      and charge.status = 'pending'
      and charge.due_date < p_today
  ),
  inserted as (
    insert into public.manual_alerts (
      workspace_id, client_id, charge_id, title, notes, due_on, severity
    )
    select
      p_workspace_id,
      eligible.client_id,
      eligible.id,
      left('Cobrar ' || eligible.name, 120),
      left(eligible.description, 1000),
      p_today,
      'danger'
    from eligible
    on conflict (workspace_id, charge_id) where charge_id is not null and state = 'open'
    do nothing
    returning manual_alerts.charge_id
  )
  select eligible.id, eligible.name, inserted.charge_id is not null
  from eligible
  left join inserted on inserted.charge_id = eligible.id;
end;
$$;

revoke all on function public.create_assistant_reminders(uuid, uuid[], date)
  from public, anon, service_role;
grant execute on function public.create_assistant_reminders(uuid, uuid[], date)
  to authenticated;

create table public.agent_consents (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  version text not null,
  accepted_by uuid not null default auth.uid(),
  accepted_at timestamptz not null default statement_timestamp(),
  constraint agent_consents_version_check check (char_length(version) between 1 and 40)
);

alter table public.agent_consents enable row level security;
alter table public.agent_consents force row level security;

revoke all on table public.agent_consents from public, anon, authenticated;
grant select on table public.agent_consents to authenticated;
grant insert (workspace_id, version) on table public.agent_consents to authenticated;
grant update (version, accepted_by, accepted_at) on table public.agent_consents to authenticated;

create policy agent_consents_select_owner on public.agent_consents
for select to authenticated
using ((select private.is_active_workspace_owner(workspace_id)));

create policy agent_consents_insert_owner on public.agent_consents
for insert to authenticated
with check (
  (select private.is_active_workspace_owner(workspace_id))
  and accepted_by = (select auth.uid())
);

create policy agent_consents_update_owner on public.agent_consents
for update to authenticated
using ((select private.is_active_workspace_owner(workspace_id)))
with check (
  (select private.is_active_workspace_owner(workspace_id))
  and accepted_by = (select auth.uid())
);

create function public.accept_agent_consent(p_workspace_id uuid, p_version text)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.agent_consents (workspace_id, version)
  values (p_workspace_id, p_version)
  on conflict (workspace_id) do update
    set version = excluded.version,
        accepted_by = auth.uid(),
        accepted_at = statement_timestamp();
$$;

revoke all on function public.accept_agent_consent(uuid, text)
  from public, anon, service_role;
grant execute on function public.accept_agent_consent(uuid, text) to authenticated;

comment on table public.agent_consents is
  'Aceite versionado do envio de dados mínimos ao provedor de IA (ADR-0026).';
