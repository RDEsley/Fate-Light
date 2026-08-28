create or replace function public.domain_operational_summary(
  p_workspace_id uuid,
  p_today date,
  p_next_week date
)
returns table (
  overdue bigint,
  due_today bigint,
  due_this_week bigint,
  active_cost numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    count(*) filter (where domain_record.expires_on < p_today),
    count(*) filter (where domain_record.expires_on = p_today),
    count(*) filter (
      where domain_record.expires_on > p_today
        and domain_record.expires_on <= p_next_week
    ),
    coalesce(sum(domain_record.cost), 0)
  from public.domains as domain_record
  where domain_record.workspace_id = p_workspace_id
    and domain_record.status = 'active'
  having (select private.is_active_workspace_owner(p_workspace_id));
$$;

revoke all on function public.domain_operational_summary(uuid, date, date)
from public, anon, authenticated;
grant execute on function public.domain_operational_summary(uuid, date, date)
to authenticated;

comment on function public.domain_operational_summary(uuid, date, date) is
  'Calcula indicadores completos de domínios sem depender do limite do PostgREST.';
