begin;

select plan(16);

select ok(
  (select relrowsecurity and relforcerowsecurity
   from pg_catalog.pg_class
   where oid = 'public.manual_alerts'::regclass),
  'Alertas avulsos usam RLS e FORCE RLS'
);

set local role anon;
select results_eq(
  $$select count(*) from public.legal_documents$$,
  array[2::bigint],
  'Visitante lê somente os dois documentos legais publicados e vigentes'
);
select throws_ok(
  $$insert into public.legal_documents (document_type, version, content_markdown, content_hash) values ('terms_of_use', 'x', 'conteudo', repeat('a', 64))$$,
  '42501',
  null,
  'Visitante não altera documentos legais'
);
reset role;

select results_eq(
  $$select version from public.legal_documents where document_type = 'terms_of_use' and status = 'published'$$,
  array['2026.08.1'::text],
  'Termos oficiais estão publicados na versão esperada'
);
select results_eq(
  $$select version from public.legal_documents where document_type = 'privacy_policy' and status = 'published'$$,
  array['2026.08.1'::text],
  'Política oficial está publicada na versão esperada'
);

insert into auth.users (id, email)
values
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'manual-a@example.test'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'manual-b@example.test');

select set_config('request.jwt.claim.sub', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
select lives_ok(
  $$select * from public.bootstrap_identity_workspace(
      'Manual A', 'Manual A',
      (select array_agg(id order by document_type) from public.legal_documents where status = 'published' and is_required)
    )$$,
  'Cria o workspace A'
);
select lives_ok(
  $$insert into public.manual_alerts (workspace_id, title, due_on, severity) select workspace_id, 'Revisar campanha', current_date, 'warning' from public.workspace_members where user_id = auth.uid()$$,
  'Owner cria alerta no próprio workspace'
);
select results_eq(
  $select count(*) from public.manual_alerts$,
  array[1::bigint],
  'Owner enxerga seu alerta'
);
reset role;

-- auth.uid() continua sendo o owner do workspace A mesmo com a role postgres.
insert into public.clients (id, workspace_id, kind, name, commercial_status)
select 'dddddddd-0001-4ddd-8ddd-dddddddddddd', workspace_id, 'company', 'Cliente do lembrete', 'active'
from public.workspace_members
where user_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

set local role authenticated;
select lives_ok(
  $insert into public.manual_alerts (workspace_id, title, due_on, severity, client_id, recurrence) select workspace_id, 'Enviar relatório', current_date, 'warning', 'dddddddd-0001-4ddd-8ddd-dddddddddddd', 'monthly' from public.workspace_members where user_id = auth.uid()$,
  'Owner cria lembrete mensal vinculado a um cliente do próprio workspace'
);
select throws_ok(
  $insert into public.manual_alerts (workspace_id, title, due_on, severity, recurrence) select workspace_id, 'Repetição inválida', current_date, 'warning', 'daily' from public.workspace_members where user_id = auth.uid()$,
  '23514',
  null,
  'Repetição fora das opções é recusada'
);
select throws_ok(
  $update public.manual_alerts set recurrence = 'none'$,
  '42501',
  null,
  'Vínculo e repetição não mudam depois de criados'
);
reset role;

select set_config('request.jwt.claim.sub', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
select lives_ok(
  $$select * from public.bootstrap_identity_workspace(
      'Manual B', 'Manual B',
      (select array_agg(id order by document_type) from public.legal_documents where status = 'published' and is_required)
    )$$,
  'Cria o workspace B'
);
select results_eq(
  $$select count(*) from public.manual_alerts$$,
  array[0::bigint],
  'Workspace B não enxerga alertas do workspace A'
);
select results_eq(
  $$with changed as (
      update public.manual_alerts
      set state = 'resolved', resolved_at = statement_timestamp()
      returning 1
    ) select count(*) from changed$$,
  array[0::bigint],
  'Workspace B não altera alertas do workspace A'
);
select throws_ok(
  $insert into public.manual_alerts (workspace_id, title, due_on, severity, client_id) select workspace_id, 'Cliente alheio', current_date, 'warning', 'dddddddd-0001-4ddd-8ddd-dddddddddddd' from public.workspace_members where user_id = auth.uid()$,
  '23503',
  null,
  'Lembrete não aponta para cliente de outro workspace'
);
reset role;

select set_config('request.jwt.claim.sub', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', true);
delete from public.clients where id = 'dddddddd-0001-4ddd-8ddd-dddddddddddd';
select results_eq(
  $select count(*) from public.manual_alerts where title = 'Enviar relatório' and client_id is null and recurrence = 'monthly'$,
  array[1::bigint],
  'Excluir o cliente mantém o lembrete, apenas sem o vínculo'
);

select * from finish();
rollback;
