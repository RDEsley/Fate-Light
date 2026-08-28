begin;

select plan(9);

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

insert into auth.users (id, email)
values
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'manual-a@example.test'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'manual-b@example.test');

select set_config('request.jwt.claim.sub', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
select lives_ok(
  $$select * from public.bootstrap_identity_workspace('Manual A', 'Manual A', array['10000000-0000-4000-8000-000000000001'::uuid, '10000000-0000-4000-8000-000000000002'::uuid])$$,
  'Cria o workspace A'
);
select lives_ok(
  $$insert into public.manual_alerts (workspace_id, title, due_on, severity) select workspace_id, 'Revisar campanha', current_date, 'warning' from public.workspace_members where user_id = auth.uid()$$,
  'Owner cria alerta no próprio workspace'
);
select results_eq(
  $$select count(*) from public.manual_alerts$$,
  array[1::bigint],
  'Owner enxerga seu alerta'
);
reset role;

select set_config('request.jwt.claim.sub', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
select lives_ok(
  $$select * from public.bootstrap_identity_workspace('Manual B', 'Manual B', array['10000000-0000-4000-8000-000000000001'::uuid, '10000000-0000-4000-8000-000000000002'::uuid])$$,
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

select * from finish();
rollback;
