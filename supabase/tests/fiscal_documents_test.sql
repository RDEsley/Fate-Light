begin;

select plan(12);

insert into auth.users (id, email)
values ('96969696-9696-4696-8696-969696969696', 'fiscal-documents@example.test');

select set_config('request.jwt.claim.sub', '96969696-9696-4696-8696-969696969696', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$select * from public.bootstrap_identity_workspace(
    'Owner Fiscal Documents', 'Workspace Fiscal Documents',
    array['20000000-0000-4000-8000-000000000001'::uuid, '20000000-0000-4000-8000-000000000002'::uuid]
  )$$,
  'Cria o workspace de teste'
);

select set_config(
  'test.fiscal_workspace',
  (select id::text from public.workspaces
    where created_by = '96969696-9696-4696-8696-969696969696'::uuid),
  true
);

reset role;

insert into public.clients (id, workspace_id, kind, name, commercial_status)
values (
  '96969696-0001-4696-8696-969696969696',
  current_setting('test.fiscal_workspace')::uuid,
  'company', 'Cliente Fiscal', 'active'
);

insert into public.charges (
  id, workspace_id, client_id, description, due_date, company_revenue,
  status, paid_at, payment_method
) values (
  '96969696-0002-4696-8696-969696969696',
  current_setting('test.fiscal_workspace')::uuid,
  '96969696-0001-4696-8696-969696969696',
  'Cobrança quitada', current_date, 500, 'paid', now(), 'Pix'
);

insert into public.expenses (
  id, workspace_id, description, category, amount, due_date, expense_type, status
) values (
  '96969696-0003-4696-8696-969696969696',
  current_setting('test.fiscal_workspace')::uuid,
  'Despesa pendente', 'other', 100, current_date, 'variable', 'pending'
);

set local role authenticated;

reset role;
select results_eq(
  $$select public from storage.buckets where id = 'workspace-documents'$$,
  array[false],
  'O bucket de documentos é privado'
);
set local role authenticated;

select lives_ok(
  format(
    $$insert into public.fiscal_documents (
      workspace_id, charge_id, object_path, safe_filename, mime_type, size_bytes, checksum_sha256
    ) values (%L::uuid, '96969696-0002-4696-8696-969696969696', %L, 'nota-fiscal.pdf',
      'application/pdf', 1024, repeat('a', 64))$$,
    current_setting('test.fiscal_workspace'),
    current_setting('test.fiscal_workspace') ||
      '/fiscal/charge/96969696-0002-4696-8696-969696969696/document/nota-fiscal.pdf'
  ),
  'O dono anexa uma nota fiscal à cobrança paga'
);

select results_eq(
  $$select count(*) from public.fiscal_documents$$,
  array[1::bigint],
  'A nota anexada fica visível ao dono'
);

select throws_like(
  format(
    $$insert into public.fiscal_documents (
      workspace_id, expense_id, object_path, safe_filename, mime_type, size_bytes, checksum_sha256
    ) values (%L::uuid, '96969696-0003-4696-8696-969696969696', %L, 'nota-fiscal.pdf',
      'application/pdf', 1024, repeat('b', 64))$$,
    current_setting('test.fiscal_workspace'),
    current_setting('test.fiscal_workspace') ||
      '/fiscal/expense/96969696-0003-4696-8696-969696969696/document/nota-fiscal.pdf'
  ),
  '%paid%',
  'Uma conta pendente não aceita nota fiscal'
);

select throws_like(
  format(
    $$insert into public.fiscal_documents (
      workspace_id, charge_id, object_path, safe_filename, mime_type, size_bytes, checksum_sha256
    ) values (%L::uuid, '96969696-0002-4696-8696-969696969696', %L, 'nota-fiscal.exe',
      'application/octet-stream', 1024, repeat('c', 64))$$,
    current_setting('test.fiscal_workspace'),
    current_setting('test.fiscal_workspace') ||
      '/fiscal/charge/96969696-0002-4696-8696-969696969696/document/nota-fiscal.exe'
  ),
  '%fiscal_documents_filename_check%',
  'Formato não permitido também é bloqueado no banco'
);

select ok(
  not has_table_privilege('anon', 'public.fiscal_documents', 'SELECT'),
  'Visitantes não podem listar documentos fiscais'
);

select ok(
  not has_table_privilege('authenticated', 'public.fiscal_documents', 'UPDATE'),
  'Documentos fiscais não podem ser alterados silenciosamente'
);

select lives_ok(
  $$delete from public.fiscal_documents$$,
  'O dono pode remover o próprio documento'
);

select lives_ok(
  format(
    $$insert into public.fiscal_documents (
      workspace_id, charge_id, object_path, safe_filename, mime_type, size_bytes, checksum_sha256
    ) values (%L::uuid, '96969696-0002-4696-8696-969696969696', %L, 'nota-fiscal.pdf',
      'application/pdf', 1024, repeat('d', 64))$$,
    current_setting('test.fiscal_workspace'),
    current_setting('test.fiscal_workspace') ||
      '/fiscal/charge/96969696-0002-4696-8696-969696969696/reset/nota-fiscal.pdf'
  ),
  'Prepara um documento para a limpeza total'
);

select results_eq(
  $$select cardinality(public.reset_current_workspace_operational_data_with_documents('EXCLUIR TUDO'))$$,
  array[1],
  'A limpeza devolve o caminho do objeto privado'
);

select results_eq(
  $$select count(*) from public.fiscal_documents$$,
  array[0::bigint],
  'A limpeza total também remove os metadados fiscais'
);

select * from finish();
rollback;
