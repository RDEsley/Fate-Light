begin;

select plan(14);

insert into auth.users (id, email)
values
  ('81818181-8181-4818-8818-818181818181', 'corrective-a@example.test'),
  ('82828282-8282-4828-8828-828282828282', 'corrective-b@example.test');

-- Workspace A
select set_config('request.jwt.claim.sub', '81818181-8181-4818-8818-818181818181', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$select * from public.bootstrap_identity_workspace(
    'Owner Corrective A', 'Workspace Corrective A',
    array['20000000-0000-4000-8000-000000000001'::uuid, '20000000-0000-4000-8000-000000000002'::uuid]
  )$$,
  'Cria o workspace A'
);

select set_config(
  'test.corrective_workspace_a',
  (select id::text from public.workspaces
    where created_by = '81818181-8181-4818-8818-818181818181'::uuid),
  true
);

-- Workspace B (isolamento cruzado)
reset role;
select set_config('request.jwt.claim.sub', '82828282-8282-4828-8828-828282828282', true);
set local role authenticated;

select lives_ok(
  $$select * from public.bootstrap_identity_workspace(
    'Owner Corrective B', 'Workspace Corrective B',
    array['20000000-0000-4000-8000-000000000001'::uuid, '20000000-0000-4000-8000-000000000002'::uuid]
  )$$,
  'Cria o workspace B'
);

reset role;
-- JWT precisa ser o owner A: inserts operacionais disparam auditoria que exige
-- is_active_workspace_owner do workspace alvo (não o owner B do bootstrap anterior).
select set_config('request.jwt.claim.sub', '81818181-8181-4818-8818-818181818181', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

insert into public.clients (id, workspace_id, kind, name, commercial_status)
values (
  '81818181-0001-4818-8818-818181818181',
  current_setting('test.corrective_workspace_a')::uuid,
  'company', 'Cliente corretivo', 'active'
);

insert into public.charges (
  id, workspace_id, client_id, description, due_date, company_revenue,
  status, paid_at, payment_method, notes
) values (
  '81818181-0002-4818-8818-818181818181',
  current_setting('test.corrective_workspace_a')::uuid,
  '81818181-0001-4818-8818-818181818181',
  'Cobrança paga com NF', current_date, 900, 'paid', now(), 'Pix', null
), (
  '81818181-0003-4818-8818-818181818181',
  current_setting('test.corrective_workspace_a')::uuid,
  '81818181-0001-4818-8818-818181818181',
  'Cobrança pendente', current_date, 100, 'pending', null, null, null
), (
  '81818181-0004-4818-8818-818181818181',
  current_setting('test.corrective_workspace_a')::uuid,
  '81818181-0001-4818-8818-818181818181',
  'Histórico anterior ao sistema', current_date, 12000, 'paid', now(), 'Histórico',
  'Valor consolidado informado no cadastro do cliente.'
);

insert into public.expenses (
  id, workspace_id, description, category, amount, due_date,
  expense_type, status, paid_at
) values (
  '81818181-0005-4818-8818-818181818181',
  current_setting('test.corrective_workspace_a')::uuid,
  'Despesa paga com NF', 'tools', 250, current_date,
  'variable', 'paid', now()
);

select set_config('request.jwt.claim.sub', '81818181-8181-4818-8818-818181818181', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  format(
    $$insert into public.fiscal_documents (
      workspace_id, charge_id, object_path, safe_filename, mime_type, size_bytes, checksum_sha256
    ) values (%L::uuid, '81818181-0002-4818-8818-818181818181', %L, 'nota-fiscal.pdf',
      'application/pdf', 2048, repeat('e', 64))$$,
    current_setting('test.corrective_workspace_a'),
    current_setting('test.corrective_workspace_a') ||
      '/fiscal/charge/81818181-0002-4818-8818-818181818181/document/nota-fiscal.pdf'
  ),
  'Anexa NF à cobrança paga'
);

select lives_ok(
  format(
    $$insert into public.fiscal_documents (
      workspace_id, expense_id, object_path, safe_filename, mime_type, size_bytes, checksum_sha256
    ) values (%L::uuid, '81818181-0005-4818-8818-818181818181', %L, 'nota-fiscal.pdf',
      'application/pdf', 1024, repeat('f', 64))$$,
    current_setting('test.corrective_workspace_a'),
    current_setting('test.corrective_workspace_a') ||
      '/fiscal/expense/81818181-0005-4818-8818-818181818181/document/nota-fiscal.pdf'
  ),
  'Anexa NF à despesa paga'
);

select results_eq(
  $$select public.delete_paid_financial_record(
    'charge', '81818181-0002-4818-8818-818181818181'::uuid
  ) ->> 'status'$$,
  $$values ('deleted'::text)$$,
  'Owner exclui cobrança paga'
);

select results_eq(
  $$select count(*) from public.charges
    where id = '81818181-0002-4818-8818-818181818181'::uuid$$,
  array[0::bigint],
  'A cobrança paga deixa de existir'
);

select results_eq(
  $$select count(*) from public.fiscal_documents
    where charge_id = '81818181-0002-4818-8818-818181818181'::uuid$$,
  array[0::bigint],
  'Metadados fiscais da cobrança são removidos'
);

select results_eq(
  $$
    with deleted as (
      select public.delete_paid_financial_record(
        'expense', '81818181-0005-4818-8818-818181818181'::uuid
      ) as payload
    )
    select payload ->> 'status', payload -> 'object_paths' ->> 0
    from deleted
  $$,
  format(
    $$select 'deleted'::text, %L::text$$,
    current_setting('test.corrective_workspace_a') ||
      '/fiscal/expense/81818181-0005-4818-8818-818181818181/document/nota-fiscal.pdf'
  ),
  'Owner exclui despesa paga e recebe object_paths'
);

select results_eq(
  $$select count(*) from public.fiscal_documents
    where expense_id = '81818181-0005-4818-8818-818181818181'::uuid$$,
  array[0::bigint],
  'Metadados fiscais da despesa são removidos'
);

select results_eq(
  $$select public.delete_workspace_record(
    'charge', '81818181-0003-4818-8818-818181818181'::uuid
  )$$,
  $$values ('deleted'::text)$$,
  'Cobrança pendente continua deletável pelo caminho existente'
);

select results_eq(
  $$select public.delete_workspace_record(
    'charge', '81818181-0004-4818-8818-818181818181'::uuid
  )$$,
  $$values ('deleted'::text)$$,
  'Histórico anterior ao sistema (ADR-0017) continua excluível'
);

select results_eq(
  $$select public.delete_paid_financial_record(
    'charge', '81818181-0002-4818-8818-818181818181'::uuid
  ) ->> 'status'$$,
  $$values ('not_found'::text)$$,
  'Segunda chamada na cobrança já excluída devolve not_found'
);

reset role;
insert into public.charges (
  id, workspace_id, client_id, description, due_date, company_revenue,
  status, paid_at, payment_method
) values (
  '81818181-0006-4818-8818-818181818181',
  current_setting('test.corrective_workspace_a')::uuid,
  '81818181-0001-4818-8818-818181818181',
  'Cobrança cruzada', current_date, 50, 'paid', now(), 'Pix'
);

select set_config('request.jwt.claim.sub', '82828282-8282-4828-8828-828282828282', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select throws_ok(
  $$select public.delete_paid_financial_record(
    'charge', '81818181-0006-4818-8818-818181818181'::uuid
  )$$,
  '42501',
  'active workspace owner required',
  'Owner de outro workspace não exclui registro pago'
);

reset role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);
set local role anon;

select ok(
  not has_function_privilege(
    'anon',
    'public.delete_paid_financial_record(text, uuid)',
    'EXECUTE'
  ),
  'Anon não executa exclusão corretiva'
);

select * from finish();
rollback;
