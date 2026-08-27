create or replace function public.dashboard_financial_summary(
  p_workspace_id uuid,
  p_start date,
  p_end date,
  p_due_end date,
  p_today date,
  p_next_week date,
  p_next_month date
)
returns table (
  own_received numeric,
  own_pending numeric,
  media_period numeric,
  expenses_paid numeric,
  overdue_charges bigint,
  due_soon_charges bigint,
  overdue_expenses bigint,
  expired_domains bigint,
  upcoming_domains bigint,
  active_clients bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    coalesce((
      select sum(charge.company_revenue + case when charge.additional_fee_is_revenue then charge.additional_fee else 0 end)
      from public.charges as charge
      where charge.workspace_id = p_workspace_id
        and charge.status = 'paid'
        and charge.paid_at >= (p_start::timestamp at time zone (
          select workspace.timezone from public.workspaces as workspace where workspace.id = p_workspace_id
        ))
        and charge.paid_at < ((p_end + 1)::timestamp at time zone (
          select workspace.timezone from public.workspaces as workspace where workspace.id = p_workspace_id
        ))
    ), 0),
    coalesce((
      select sum(charge.company_revenue + case when charge.additional_fee_is_revenue then charge.additional_fee else 0 end)
      from public.charges as charge
      where charge.workspace_id = p_workspace_id
        and charge.status = 'pending'
        and charge.due_date between p_start and p_due_end
    ), 0),
    coalesce((
      select sum(charge.media_budget + case when charge.additional_fee_is_revenue then 0 else charge.additional_fee end)
      from public.charges as charge
      where charge.workspace_id = p_workspace_id
        and charge.status <> 'cancelled'
        and charge.due_date between p_start and p_due_end
    ), 0),
    coalesce((
      select sum(expense.amount)
      from public.expenses as expense
      where expense.workspace_id = p_workspace_id
        and expense.status = 'paid'
        and expense.paid_at >= (p_start::timestamp at time zone (
          select workspace.timezone from public.workspaces as workspace where workspace.id = p_workspace_id
        ))
        and expense.paid_at < ((p_end + 1)::timestamp at time zone (
          select workspace.timezone from public.workspaces as workspace where workspace.id = p_workspace_id
        ))
    ), 0),
    (select count(*) from public.charges where workspace_id = p_workspace_id and status = 'pending' and due_date < p_today),
    (select count(*) from public.charges where workspace_id = p_workspace_id and status = 'pending' and due_date between p_today and p_next_week),
    (select count(*) from public.expenses where workspace_id = p_workspace_id and status = 'pending' and due_date < p_today),
    (select count(*) from public.domains where workspace_id = p_workspace_id and status = 'active' and expires_on < p_today),
    (select count(*) from public.domains where workspace_id = p_workspace_id and status = 'active' and expires_on between p_today and p_next_month),
    (select count(*) from public.clients where workspace_id = p_workspace_id and commercial_status = 'active' and archived_at is null)
  where (select private.is_active_workspace_owner(p_workspace_id));
$$;

revoke all on function public.dashboard_financial_summary(uuid, date, date, date, date, date, date)
  from public, anon, authenticated;
grant execute on function public.dashboard_financial_summary(uuid, date, date, date, date, date, date)
  to authenticated;

comment on function public.dashboard_financial_summary(uuid, date, date, date, date, date, date) is
  'Agrega o dashboard no banco sem depender do limite de linhas do PostgREST.';
