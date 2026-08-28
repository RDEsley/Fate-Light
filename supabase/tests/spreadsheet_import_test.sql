begin;

select plan(14);

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
  ('31313131-3131-4131-8131-313131313131', 'import-a@example.test'),
  ('42424242-4242-4242-8242-424242424242', 'import-b@example.test');

select results_eq(
  $$select count(*) from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'import_jobs'
      and c.relrowsecurity and c.relforcerowsecurity$$,
  array[1::bigint],
  'Lotes de importação usam RLS e FORCE RLS'
);

select results_eq(
  $$select prosecdef from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'import_workspace_spreadsheet'$$,
  array[false],
  'A função de importação é SECURITY INVOKER'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.import_workspace_spreadsheet(uuid,text,text,jsonb)',
    'EXECUTE'
  ) and not has_function_privilege(
    'anon',
    'public.import_workspace_spreadsheet(uuid,text,text,jsonb)',
    'EXECUTE'
  ) and has_function_privilege(
    'authenticated',
    'public.import_workspace_spreadsheet_v2(uuid,text,text,jsonb)',
    'EXECUTE'
  ) and not has_function_privilege(
    'anon',
    'public.import_workspace_spreadsheet_v2(uuid,text,text,jsonb)',
    'EXECUTE'
  ),
  'Somente authenticated pode executar a importação'
);

select set_config('request.jwt.claim.sub', '31313131-3131-4131-8131-313131313131', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
select lives_ok(
  $$select * from public.bootstrap_identity_workspace(
    'Owner Import A', 'Workspace Import A',
    array['10000000-0000-4000-8000-000000000001'::uuid, '10000000-0000-4000-8000-000000000002'::uuid]
  )$$,
  'Cria o workspace A'
);

reset role;
select set_config('request.jwt.claim.sub', '42424242-4242-4242-8242-424242424242', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
select lives_ok(
  $$select * from public.bootstrap_identity_workspace(
    'Owner Import B', 'Workspace Import B',
    array['10000000-0000-4000-8000-000000000001'::uuid, '10000000-0000-4000-8000-000000000002'::uuid]
  )$$,
  'Cria o workspace B'
);

reset role;
select set_config(
  'test.import_workspace_a',
  (select id::text from public.workspaces where created_by = '31313131-3131-4131-8131-313131313131'::uuid),
  true
);
select set_config(
  'test.import_workspace_b',
  (select id::text from public.workspaces where created_by = '42424242-4242-4242-8242-424242424242'::uuid),
  true
);
select set_config('request.jwt.claim.sub', '31313131-3131-4131-8131-313131313131', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$select public.import_workspace_spreadsheet_v2(
    current_setting('test.import_workspace_a')::uuid,
    repeat('a', 64),
    'csv',
    '{
      "clients":[{"companyName":"Empresa Teste","email":"financeiro@example.test","name":"Cliente Importado","notes":"","phone":"11999999999","status":"active","website":"cliente.example"}],
      "services":[{"additionalFee":"25.00","billingType":"monthly","clientName":"Cliente Importado","companyRevenue":"500.00","description":"Serviço mensal","mediaBudget":"1000.00","name":"Gestão","nextDueDate":"2026-09-01","notes":"","startDate":"2026-08-01"}],
      "charges":[{"additionalFee":"25.00","clientName":"Cliente Importado","companyRevenue":"500.00","description":"Mensalidade","dueDate":"2026-09-01","mediaBudget":"1000.00","notes":"","paidAt":"","paymentMethod":"","serviceName":"Gestão","status":"pending"}],
      "expenses":[{"amount":"120.00","category":"software","clientName":"Cliente Importado","description":"Ferramenta","dueDate":"2026-09-02","expenseType":"fixed","notes":"","paidAt":"","status":"pending"}],
      "domains":[{"autoRenew":true,"clientName":"Cliente Importado","cost":"80.00","domain":"cliente.example","expiresOn":"2027-08-01","notes":"","paymentResponsibility":"Empresa","registrar":"Registrador"}]
    }'::jsonb
  )$$,
  'Importa o lote válido em uma transação'
);

select results_eq(
  $$select
      (select count(*) from public.clients where name = 'Cliente Importado'),
      (select count(*) from public.client_services where name = 'Gestão'),
      (select count(*) from public.charges where description = 'Mensalidade'),
      (select count(*) from public.expenses where description = 'Ferramenta'),
      (select count(*) from public.domains where domain = 'cliente.example')$$,
  $$values (1::bigint, 1::bigint, 1::bigint, 1::bigint, 1::bigint)$$,
  'O lote cria todas as entidades esperadas'
);

select results_eq(
  $$select website from public.clients where name = 'Cliente Importado'$$,
  $$values ('cliente.example'::text)$$,
  'O site do cliente é confirmado dentro da mesma transação'
);

select results_eq(
  $$select gross_total, company_result_value from public.charges_overview
    where description = 'Mensalidade'$$,
  $$values (1525.00::numeric, 525.00::numeric)$$,
  'A importação preserva a separação da verba de mídia'
);

select ok(
  exists (
    select 1 from public.import_jobs
    where source_checksum = repeat('a', 64)
      and row_count = 5
      and entity_counts ->> 'clients' = '1'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'import_jobs'
      and column_name in ('payload', 'file', 'contents')
  ),
  'O histórico guarda somente metadados mínimos'
);

select results_eq(
  $$select public.import_workspace_spreadsheet_v2(
      current_setting('test.import_workspace_a')::uuid,
      repeat('a', 64), 'csv',
      '{"clients":[{"name":"Nunca duplicar"}],"services":[],"charges":[],"expenses":[],"domains":[]}'::jsonb
    ) ->> 'status'$$,
  $$values ('duplicate'::text)$$,
  'O checksum torna a confirmação idempotente'
);

select set_config('request.jwt.claim.sub', '42424242-4242-4242-8242-424242424242', true);
select ok(
  pg_temp.statement_fails(
    format(
      'select public.import_workspace_spreadsheet_v2(%L::uuid,%L,%L,%L::jsonb)',
      current_setting('test.import_workspace_a'), repeat('b', 64), 'csv',
      '{"clients":[{"name":"Tentativa"}],"services":[],"charges":[],"expenses":[],"domains":[]}'
    )
  ),
  'Owner B não importa no workspace A'
);

select results_eq(
  $$select count(*) from public.import_jobs$$,
  array[0::bigint],
  'Owner B não lê os lotes do workspace A'
);

reset role;
select ok(
  not has_table_privilege('authenticated', 'public.import_jobs', 'DELETE')
  and not has_table_privilege('anon', 'public.import_jobs', 'SELECT'),
  'Lotes não podem ser excluídos e permanecem invisíveis para anon'
);

select * from finish();
rollback;
