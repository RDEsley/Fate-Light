begin;

select plan(9);

insert into auth.users (id, email)
values
  ('71717171-7171-4171-8171-717171717171', 'dashboard-a@example.test'),
  ('72727272-7272-4272-8272-727272727272', 'dashboard-b@example.test');

select set_config('request.jwt.claim.sub', '71717171-7171-4171-8171-717171717171', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
select lives_ok(
  $$select * from public.bootstrap_identity_workspace('Dashboard A', 'Dashboard A', array['20000000-0000-4000-8000-000000000001'::uuid, '20000000-0000-4000-8000-000000000002'::uuid])$$,
  'Cria workspace A'
);
reset role;

select set_config('test.dashboard_workspace', (select id::text from public.workspaces where created_by = '71717171-7171-4171-8171-717171717171'::uuid), true);
select set_config('request.jwt.claim.sub', '71717171-7171-4171-8171-717171717171', true);
set local role authenticated;
select lives_ok(
  $$insert into public.clients (workspace_id, kind, name, commercial_status)
    values (current_setting('test.dashboard_workspace')::uuid, 'company', 'Cliente de volume', 'active')$$,
  'Cria cliente de teste'
);

select lives_ok(
  $$insert into public.charges (
      workspace_id, client_id, description, due_date, company_revenue,
      media_budget, additional_fee, additional_fee_is_revenue, status, paid_at, payment_method
    )
    select client.workspace_id, client.id, 'Recebimento ' || series.n, current_date,
      1, 2, 1, false, 'paid', (current_date + time '12:00') at time zone 'America/Sao_Paulo', 'Pix'
    from public.clients as client
    cross join generate_series(1, 1001) as series(n)
    where client.name = 'Cliente de volume'$$,
  'Cria mais de mil cobranças pagas'
);

select lives_ok(
  $$insert into public.expenses (
      workspace_id, description, category, amount, due_date, status, paid_at, expense_type
    ) values (
      current_setting('test.dashboard_workspace')::uuid, 'Despesa do período', 'tools', 200,
      current_date, 'paid', (current_date + time '12:00') at time zone 'America/Sao_Paulo', 'fixed'
    )$$,
  'Cria despesa paga'
);

select results_eq(
  $$select own_received, media_period, expenses_paid, active_clients
    from public.dashboard_financial_summary(
      current_setting('test.dashboard_workspace')::uuid,
      current_date, current_date, current_date, current_date, current_date + 7, current_date + 30
    )$$,
  $$values (1001::numeric, 3003::numeric, 200::numeric, 1::bigint)$$,
  'Agregação usa todas as 1001 linhas sem misturar repasse na receita'
);

select lives_ok(
  $$insert into public.domains (
      workspace_id, client_id, domain, expires_on, status, payment_responsibility, cost
    )
    select client.workspace_id, client.id, 'volume-' || series.n || '.example',
      current_date, 'active', 'Empresa', 1
    from public.clients as client
    cross join generate_series(1, 1001) as series(n)
    where client.name = 'Cliente de volume'$$,
  'Cria mais de mil domínios ativos'
);

select results_eq(
  $$select due_today, active_cost
    from public.domain_operational_summary(
      current_setting('test.dashboard_workspace')::uuid,
      current_date, current_date + 7
    )$$,
  $$values (1001::bigint, 1001::numeric)$$,
  'Resumo de domínios usa todas as 1001 linhas'
);

reset role;
select set_config('request.jwt.claim.sub', '72727272-7272-4272-8272-727272727272', true);
set local role authenticated;
select results_eq(
  $$select count(*) from public.dashboard_financial_summary(
      current_setting('test.dashboard_workspace')::uuid,
      current_date, current_date, current_date, current_date, current_date + 7, current_date + 30
    )$$,
  array[0::bigint],
  'Outro usuário não consulta o resumo financeiro do workspace'
);
select results_eq(
  $$select count(*) from public.domain_operational_summary(
      current_setting('test.dashboard_workspace')::uuid,
      current_date, current_date + 7
    )$$,
  array[0::bigint],
  'Outro usuário não consulta o resumo de domínios do workspace'
);

select * from finish();
rollback;
