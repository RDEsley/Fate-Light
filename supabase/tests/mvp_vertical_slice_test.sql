begin;

select plan(16);

create or replace function pg_temp.statement_fails(p_sql text)
returns boolean language plpgsql as $$
begin
  execute p_sql;
  return false;
exception when others then
  return true;
end;
$$;

insert into auth.users (id, email) values
  ('81818181-8181-4181-8181-818181818181', 'mvp-a@example.test'),
  ('92929292-9292-4292-8292-929292929292', 'mvp-b@example.test');

select results_eq(
  $$
    select count(*) from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('client_services', 'charges', 'expenses', 'domains')
      and c.relrowsecurity and c.relforcerowsecurity
  $$,
  array[4::bigint],
  'As quatro tabelas do MVP usam RLS e FORCE RLS'
);

select set_config('request.jwt.claim.sub', '81818181-8181-4181-8181-818181818181', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
select lives_ok(
  $$select * from public.bootstrap_identity_workspace(
    'Owner MVP A', 'Workspace MVP A',
    array['10000000-0000-4000-8000-000000000001'::uuid, '10000000-0000-4000-8000-000000000002'::uuid]
  )$$,
  'Cria o workspace A'
);

reset role;
select set_config('request.jwt.claim.sub', '92929292-9292-4292-8292-929292929292', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
select lives_ok(
  $$select * from public.bootstrap_identity_workspace(
    'Owner MVP B', 'Workspace MVP B',
    array['10000000-0000-4000-8000-000000000001'::uuid, '10000000-0000-4000-8000-000000000002'::uuid]
  )$$,
  'Cria o workspace B'
);

reset role;
select set_config('test.mvp_workspace_a', (select id::text from public.workspaces where created_by = '81818181-8181-4181-8181-818181818181'::uuid), true);
select set_config('test.mvp_workspace_b', (select id::text from public.workspaces where created_by = '92929292-9292-4292-8292-929292929292'::uuid), true);
select set_config('request.jwt.claim.sub', '81818181-8181-4181-8181-818181818181', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$insert into public.clients (workspace_id, kind, name, commercial_status, email)
    values (current_setting('test.mvp_workspace_a')::uuid, 'company', 'Cliente MVP A', 'active', 'cliente-a@example.test')$$,
  'Cadastra cliente no workspace A'
);

select lives_ok(
  $$insert into public.client_services (
      workspace_id, client_id, name, company_revenue, media_budget, additional_fee,
      billing_type, start_date, next_due_date
    ) select workspace_id, id, 'Gestão de Google Ads', 500, 1000, 50,
      'monthly', current_date, current_date + 7
    from public.clients where name = 'Cliente MVP A'$$,
  'Adiciona serviço ao cliente'
);

select results_eq(
  $$select company_revenue, media_budget, additional_fee from public.client_services where name = 'Gestão de Google Ads'$$,
  $$values (500.00::numeric, 1000.00::numeric, 50.00::numeric)$$,
  'Receita, mídia e adicional permanecem separados no serviço'
);

select lives_ok(
  $$insert into public.charges (
      workspace_id, client_id, client_service_id, description, due_date,
      company_revenue, media_budget, additional_fee
    ) select service.workspace_id, service.client_id, service.id, 'Mensalidade MVP', current_date - 1,
      500, 1000, 50 from public.client_services service where service.name = 'Gestão de Google Ads'$$,
  'Cria cobrança vinculada ao serviço'
);

select results_eq(
  $$select company_revenue, media_budget, additional_fee, gross_total, company_result_value
    from public.charges_overview where description = 'Mensalidade MVP'$$,
  $$values (500.00::numeric, 1000.00::numeric, 50.00::numeric, 1550.00::numeric, 550.00::numeric)$$,
  'Total bruto inclui mídia, mas resultado da empresa não'
);

select results_eq(
  $$select effective_status from public.charges_overview where description = 'Mensalidade MVP'$$,
  $$values ('overdue'::text)$$,
  'Atraso é calculado pela data sem Cron'
);

select lives_ok(
  $$insert into public.expenses (
      workspace_id, client_id, description, category, amount, due_date, status, paid_at, expense_type
    ) select workspace_id, id, 'Ferramenta MVP', 'tools', 200, current_date, 'paid', statement_timestamp(), 'fixed'
    from public.clients where name = 'Cliente MVP A'$$,
  'Registra despesa paga'
);

select lives_ok(
  $$insert into public.domains (
      workspace_id, client_id, domain, expires_on, payment_responsibility
    ) select workspace_id, id, 'mvp-a.example', current_date + 7, 'Fate Eight Tech'
    from public.clients where name = 'Cliente MVP A'$$,
  'Registra domínio com vencimento'
);

select results_eq(
  $$select company_result_value - (select amount from public.expenses where description = 'Ferramenta MVP')
    from public.charges_overview where description = 'Mensalidade MVP'$$,
  $$values (350.00::numeric)$$,
  'Resultado usa receita própria e adicional menos despesa, sem mídia'
);

select set_config('request.jwt.claim.sub', '92929292-9292-4292-8292-929292929292', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$select
      (select count(*) from public.client_services),
      (select count(*) from public.charges),
      (select count(*) from public.expenses),
      (select count(*) from public.domains)$$,
  $$values (0::bigint, 0::bigint, 0::bigint, 0::bigint)$$,
  'Usuário B não acessa dados do workspace A'
);

select ok(
  pg_temp.statement_fails($$insert into public.expenses (
      workspace_id, description, category, amount, due_date, expense_type
    ) values (current_setting('test.mvp_workspace_a')::uuid, 'Tentativa', 'other', 10, current_date, 'variable')$$),
  'Inserção com workspace de outro usuário falha'
);

select ok(
  pg_temp.statement_fails($$update public.domains
    set workspace_id = current_setting('test.mvp_workspace_b')::uuid
    where domain = 'mvp-a.example'$$),
  'Troca de workspace por update falha'
);

select set_config('request.jwt.claim.sub', '81818181-8181-4181-8181-818181818181', true);
select results_eq(
  $$update public.charges set status = 'paid', paid_at = statement_timestamp(), payment_method = 'Pix'
    where description = 'Mensalidade MVP' returning status, paid_at is not null$$,
  $$values ('paid'::text, true)$$,
  'Marcar como paga preserva timestamp real de pagamento'
);

select * from finish();
rollback;
