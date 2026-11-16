begin;

select plan(14);

insert into auth.users (id, email)
values
  ('c3c3c3c3-c3c3-4c3c-8c3c-c3c3c3c3c3c3', 'proof-a@example.test'),
  ('d4d4d4d4-d4d4-4d4d-8d4d-d4d4d4d4d4d4', 'proof-b@example.test');

select set_config('request.jwt.claim.sub', 'c3c3c3c3-c3c3-4c3c-8c3c-c3c3c3c3c3c3', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
select lives_ok(
  $$select * from public.bootstrap_identity_workspace(
      'Proof A', 'Proof A',
      (select array_agg(id order by document_type) from public.legal_documents where status = 'published' and is_required)
    )$$,
  'Cria o workspace A'
);
select set_config(
  'test.proof_workspace',
  (select id::text from public.workspaces where created_by = 'c3c3c3c3-c3c3-4c3c-8c3c-c3c3c3c3c3c3'::uuid),
  true
);
reset role;

insert into public.clients (id, workspace_id, kind, name, commercial_status)
values
  ('c3c3c3c3-0001-4c3c-8c3c-c3c3c3c3c3c3', current_setting('test.proof_workspace')::uuid, 'company', 'Com pagamentos', 'active'),
  ('c3c3c3c3-0002-4c3c-8c3c-c3c3c3c3c3c3', current_setting('test.proof_workspace')::uuid, 'company', 'So pendente', 'active'),
  ('c3c3c3c3-0003-4c3c-8c3c-c3c3c3c3c3c3', current_setting('test.proof_workspace')::uuid, 'company', 'Sem cobranca', 'active');

-- O primeiro pagamento (jan/2025) é gravado depois do segundo, para provar que vale a data
-- do pagamento e não a ordem de criação.
insert into public.charges (id, workspace_id, client_id, description, due_date, company_revenue, status, paid_at, payment_method)
select v.id::uuid, current_setting('test.proof_workspace')::uuid, v.client_id::uuid, v.description,
  v.due_date::date, v.amount, v.status, v.paid_at::timestamptz, v.method
from (values
  ('c3c3c3c3-0c01-4c3c-8c3c-c3c3c3c3c3c3', 'c3c3c3c3-0001-4c3c-8c3c-c3c3c3c3c3c3', 'Março', '2025-03-10', 300, 'paid', '2025-03-10 12:00+00', 'Pix'),
  ('c3c3c3c3-0c02-4c3c-8c3c-c3c3c3c3c3c3', 'c3c3c3c3-0001-4c3c-8c3c-c3c3c3c3c3c3', 'Janeiro', '2025-01-15', 200, 'paid', '2025-01-15 12:00+00', 'Pix'),
  ('c3c3c3c3-0c03-4c3c-8c3c-c3c3c3c3c3c3', 'c3c3c3c3-0001-4c3c-8c3c-c3c3c3c3c3c3', 'Aberta', '2026-12-01', 100, 'pending', null, null),
  ('c3c3c3c3-0c04-4c3c-8c3c-c3c3c3c3c3c3', 'c3c3c3c3-0002-4c3c-8c3c-c3c3c3c3c3c3', 'So pendente', '2026-12-01', 100, 'pending', null, null)
) as v (id, client_id, description, due_date, amount, status, paid_at, method);

insert into public.expenses (id, workspace_id, description, category, amount, due_date, expense_type, status, paid_at)
values ('c3c3c3c3-0e01-4c3c-8c3c-c3c3c3c3c3c3', current_setting('test.proof_workspace')::uuid,
  'Despesa paga', 'other', 50, current_date, 'variable', 'paid', now());

select set_config('request.jwt.claim.sub', 'c3c3c3c3-c3c3-4c3c-8c3c-c3c3c3c3c3c3', true);
set local role authenticated;

select lives_ok(
  format(
    $$insert into public.fiscal_documents (workspace_id, charge_id, kind, object_path, safe_filename, mime_type, size_bytes, checksum_sha256)
      values (%L::uuid, 'c3c3c3c3-0c02-4c3c-8c3c-c3c3c3c3c3c3', 'payment_proof', %L, 'comprovante.pdf', 'application/pdf', 2048, repeat('b', 64))$$,
    current_setting('test.proof_workspace'),
    current_setting('test.proof_workspace') || '/fiscal/charge/c3c3c3c3-0c02-4c3c-8c3c-c3c3c3c3c3c3/p1/comprovante.pdf'
  ),
  'Owner anexa comprovante a uma cobrança paga'
);

select results_eq(
  $$select kind from public.fiscal_documents where safe_filename = 'comprovante.pdf'$$,
  array['payment_proof'::text],
  'O anexo fica registrado como comprovante'
);

select lives_ok(
  format(
    $$insert into public.fiscal_documents (workspace_id, charge_id, object_path, safe_filename, mime_type, size_bytes, checksum_sha256)
      values (%L::uuid, 'c3c3c3c3-0c02-4c3c-8c3c-c3c3c3c3c3c3', %L, 'nota-fiscal.pdf', 'application/pdf', 2048, repeat('c', 64))$$,
    current_setting('test.proof_workspace'),
    current_setting('test.proof_workspace') || '/fiscal/charge/c3c3c3c3-0c02-4c3c-8c3c-c3c3c3c3c3c3/n1/nota-fiscal.pdf'
  ),
  'Sem informar o tipo, o anexo continua sendo nota fiscal'
);

select throws_ok(
  format(
    $$insert into public.fiscal_documents (workspace_id, charge_id, kind, object_path, safe_filename, mime_type, size_bytes, checksum_sha256)
      values (%L::uuid, 'c3c3c3c3-0c02-4c3c-8c3c-c3c3c3c3c3c3', 'payment_proof', %L, 'nota-fiscal.pdf', 'application/pdf', 2048, repeat('d', 64))$$,
    current_setting('test.proof_workspace'),
    current_setting('test.proof_workspace') || '/fiscal/charge/c3c3c3c3-0c02-4c3c-8c3c-c3c3c3c3c3c3/x1/nota-fiscal.pdf'
  ),
  '23514', null,
  'Comprovante não aceita o nome de arquivo da nota fiscal'
);

select throws_ok(
  format(
    $$insert into public.fiscal_documents (workspace_id, charge_id, kind, object_path, safe_filename, mime_type, size_bytes, checksum_sha256)
      values (%L::uuid, 'c3c3c3c3-0c02-4c3c-8c3c-c3c3c3c3c3c3', 'invoice', %L, 'comprovante.pdf', 'application/pdf', 2048, repeat('e', 64))$$,
    current_setting('test.proof_workspace'),
    current_setting('test.proof_workspace') || '/fiscal/charge/c3c3c3c3-0c02-4c3c-8c3c-c3c3c3c3c3c3/x2/comprovante.pdf'
  ),
  '23514', null,
  'Nota fiscal não aceita o nome de arquivo do comprovante'
);

select throws_ok(
  format(
    $$insert into public.fiscal_documents (workspace_id, charge_id, kind, object_path, safe_filename, mime_type, size_bytes, checksum_sha256)
      values (%L::uuid, 'c3c3c3c3-0c02-4c3c-8c3c-c3c3c3c3c3c3', 'recibo', %L, 'comprovante.pdf', 'application/pdf', 2048, repeat('f', 64))$$,
    current_setting('test.proof_workspace'),
    current_setting('test.proof_workspace') || '/fiscal/charge/c3c3c3c3-0c02-4c3c-8c3c-c3c3c3c3c3c3/x3/comprovante.pdf'
  ),
  '23514', null,
  'Tipo fora da lista é recusado'
);

select throws_ok(
  format(
    $$insert into public.fiscal_documents (workspace_id, expense_id, kind, object_path, safe_filename, mime_type, size_bytes, checksum_sha256)
      values (%L::uuid, 'c3c3c3c3-0e01-4c3c-8c3c-c3c3c3c3c3c3', 'payment_proof', %L, 'comprovante.pdf', 'application/pdf', 2048, repeat('a', 64))$$,
    current_setting('test.proof_workspace'),
    current_setting('test.proof_workspace') || '/fiscal/expense/c3c3c3c3-0e01-4c3c-8c3c-c3c3c3c3c3c3/x4/comprovante.pdf'
  ),
  '23514', null,
  'Despesa paga não recebe comprovante, só nota fiscal'
);

select throws_ok(
  format(
    $$insert into public.fiscal_documents (workspace_id, charge_id, kind, object_path, safe_filename, mime_type, size_bytes, checksum_sha256)
      values (%L::uuid, 'c3c3c3c3-0c03-4c3c-8c3c-c3c3c3c3c3c3', 'payment_proof', %L, 'comprovante.pdf', 'application/pdf', 2048, repeat('a', 64))$$,
    current_setting('test.proof_workspace'),
    current_setting('test.proof_workspace') || '/fiscal/charge/c3c3c3c3-0c03-4c3c-8c3c-c3c3c3c3c3c3/x5/comprovante.pdf'
  ),
  '23514', null,
  'Cobrança pendente não recebe comprovante'
);

select results_eq(
  $$select (first_paid_at = '2025-01-15 12:00+00'::timestamptz)
    from public.client_directory where name = 'Com pagamentos'$$,
  array[true],
  'O início da parceria é o primeiro pagamento, não o último nem a cobrança aberta'
);

select results_eq(
  $$select first_paid_at is null from public.client_directory where name = 'So pendente'$$,
  array[true],
  'Cliente só com cobrança pendente ainda não começou a parceria'
);

select results_eq(
  $$select first_paid_at is null from public.client_directory where name = 'Sem cobranca'$$,
  array[true],
  'Cliente sem cobranças não tem início de parceria'
);
reset role;

select set_config('request.jwt.claim.sub', 'd4d4d4d4-d4d4-4d4d-8d4d-d4d4d4d4d4d4', true);
set local role authenticated;
select lives_ok(
  $$select * from public.bootstrap_identity_workspace(
      'Proof B', 'Proof B',
      (select array_agg(id order by document_type) from public.legal_documents where status = 'published' and is_required)
    )$$,
  'Cria o workspace B'
);
select results_eq(
  $$select (select count(*) from public.client_directory) + (select count(*) from public.fiscal_documents)$$,
  array[0::bigint],
  'Workspace B não enxerga clientes nem anexos do A'
);
reset role;

select * from finish();
rollback;
