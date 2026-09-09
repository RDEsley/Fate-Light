begin;

select plan(18);

insert into auth.users (id, email)
values
  ('a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1', 'transfer-owner@example.test'),
  ('b2b2b2b2-b2b2-42b2-82b2-b2b2b2b2b2b2', 'transfer-other@example.test');

select set_config('request.jwt.claim.sub', 'a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$select * from public.bootstrap_identity_workspace(
    'Owner Transfer', 'Workspace Transfer A',
    array['20000000-0000-4000-8000-000000000001'::uuid, '20000000-0000-4000-8000-000000000002'::uuid]
  )$$,
  'Cria workspace A para transferência'
);

select set_config(
  'test.workspace_a',
  (select id::text from public.workspaces
    where created_by = 'a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1'::uuid),
  true
);

reset role;
select set_config('request.jwt.claim.sub', 'b2b2b2b2-b2b2-42b2-82b2-b2b2b2b2b2b2', true);
set local role authenticated;

select lives_ok(
  $$select * from public.bootstrap_identity_workspace(
    'Owner Other Transfer', 'Workspace Transfer B',
    array['20000000-0000-4000-8000-000000000001'::uuid, '20000000-0000-4000-8000-000000000002'::uuid]
  )$$,
  'Cria workspace B para transferência'
);

select set_config(
  'test.workspace_b',
  (select id::text from public.workspaces
    where created_by = 'b2b2b2b2-b2b2-42b2-82b2-b2b2b2b2b2b2'::uuid),
  true
);

reset role;
select set_config('request.jwt.claim.sub', 'a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1', true);

insert into public.clients (id, workspace_id, kind, name, commercial_status)
values
  (
    'a1a1a1a1-0001-41a1-81a1-a1a1a1a1a1a1',
    current_setting('test.workspace_a')::uuid,
    'person', 'Destino Transfer', 'active'
  ),
  (
    'a1a1a1a1-0002-41a1-81a1-a1a1a1a1a1a1',
    current_setting('test.workspace_a')::uuid,
    'company', 'Origem Transfer', 'active'
  );

-- Entity no destino com mesmo nome da origem (conflito) e metadata própria.
insert into public.client_entities (
  id, workspace_id, client_id, entity_type, display_name, tax_id, notes, status,
  created_by, updated_by
) values (
  'a1a1a1a1-00e1-41a1-81a1-a1a1a1a1a1a1',
  current_setting('test.workspace_a')::uuid,
  'a1a1a1a1-0001-41a1-81a1-a1a1a1a1a1a1',
  'company',
  'Marca Compartilhada',
  '11111111000111',
  'Metadata do destino',
  'active',
  'a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1',
  'a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1'
);

insert into public.client_entities (
  id, workspace_id, client_id, entity_type, display_name, tax_id, notes, status,
  created_by, updated_by
) values (
  'a1a1a1a1-00e2-41a1-81a1-a1a1a1a1a1a1',
  current_setting('test.workspace_a')::uuid,
  'a1a1a1a1-0002-41a1-81a1-a1a1a1a1a1a1',
  'brand',
  'Marca Compartilhada',
  '22222222000122',
  'Metadata da origem',
  'active',
  'a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1',
  'a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1'
);

insert into public.client_services (
  id, workspace_id, client_id, client_entity_id, name, company_revenue, media_budget,
  billing_type, start_date, next_due_date, status, created_by, updated_by
) values (
  'a1a1a1a1-00a1-41a1-81a1-a1a1a1a1a1a1',
  current_setting('test.workspace_a')::uuid,
  'a1a1a1a1-0002-41a1-81a1-a1a1a1a1a1a1',
  'a1a1a1a1-00e2-41a1-81a1-a1a1a1a1a1a1',
  'Gestão Transfer',
  400, 600, 'monthly', date '2026-01-01', date '2026-02-01', 'active',
  'a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1',
  'a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1'
);

insert into public.charges (
  id, workspace_id, client_id, client_entity_id, client_service_id, description, due_date,
  company_revenue, media_budget, additional_fee, status, paid_at, payment_method,
  created_by, updated_by
) values (
  'a1a1a1a1-00c1-41a1-81a1-a1a1a1a1a1a1',
  current_setting('test.workspace_a')::uuid,
  'a1a1a1a1-0002-41a1-81a1-a1a1a1a1a1a1',
  'a1a1a1a1-00e2-41a1-81a1-a1a1a1a1a1a1',
  'a1a1a1a1-00a1-41a1-81a1-a1a1a1a1a1a1',
  'Gestão Transfer paga',
  date '2026-01-15',
  400, 600, 0, 'paid', '2026-01-15 12:00:00+00', 'Pix',
  'a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1',
  'a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1'
);

insert into public.expenses (
  id, workspace_id, client_id, client_entity_id, description, category, amount, due_date,
  status, paid_at, expense_type, created_by, updated_by
) values (
  'a1a1a1a1-00b1-41a1-81a1-a1a1a1a1a1a1',
  current_setting('test.workspace_a')::uuid,
  'a1a1a1a1-0002-41a1-81a1-a1a1a1a1a1a1',
  'a1a1a1a1-00e2-41a1-81a1-a1a1a1a1a1a1',
  'Ferramenta Transfer',
  'software',
  80, date '2026-01-10', 'paid', '2026-01-10 12:00:00+00', 'variable',
  'a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1',
  'a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1'
);

insert into public.domains (
  id, workspace_id, client_id, client_entity_id, domain, expires_on, status,
  payment_responsibility, created_by, updated_by
) values (
  'a1a1a1a1-00d1-41a1-81a1-a1a1a1a1a1a1',
  current_setting('test.workspace_a')::uuid,
  'a1a1a1a1-0002-41a1-81a1-a1a1a1a1a1a1',
  'a1a1a1a1-00e2-41a1-81a1-a1a1a1a1a1a1',
  'origem-transfer.example',
  date '2026-12-01',
  'active',
  'Empresa',
  'a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1',
  'a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1'
);

insert into public.client_contacts (
  id, workspace_id, client_id, name, email, is_primary
) values (
  'a1a1a1a1-00f1-41a1-81a1-a1a1a1a1a1a1',
  current_setting('test.workspace_a')::uuid,
  'a1a1a1a1-0002-41a1-81a1-a1a1a1a1a1a1',
  'Contato Origem',
  'origem-transfer@example.test',
  true
);

insert into public.activity_events (
  id, workspace_id, client_id, entity_type, entity_id, action, summary
) values (
  'a1a1a1a1-00f2-41a1-81a1-a1a1a1a1a1a1',
  current_setting('test.workspace_a')::uuid,
  'a1a1a1a1-0002-41a1-81a1-a1a1a1a1a1a1',
  'client',
  'a1a1a1a1-0002-41a1-81a1-a1a1a1a1a1a1',
  'client.updated',
  'Evento anterior à transferência'
);

select set_config('request.jwt.claim.sub', 'b2b2b2b2-b2b2-42b2-82b2-b2b2b2b2b2b2', true);
insert into public.clients (id, workspace_id, kind, name, commercial_status)
values (
  'b2b2b2b2-0001-42b2-82b2-b2b2b2b2b2b2',
  current_setting('test.workspace_b')::uuid,
  'person', 'Outro Workspace', 'active'
);

-- Cross-workspace negado.
select set_config('request.jwt.claim.sub', 'b2b2b2b2-b2b2-42b2-82b2-b2b2b2b2b2b2', true);
set local role authenticated;

select throws_ok(
  $$select public.preview_transfer_client_data(
      'a1a1a1a1-0002-41a1-81a1-a1a1a1a1a1a1'::uuid,
      'b2b2b2b2-0001-42b2-82b2-b2b2b2b2b2b2'::uuid
    )$$,
  '42501',
  null,
  'Workspace B não transfere clientes de A'
);

select set_config('request.jwt.claim.sub', 'a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1', true);
set local role authenticated;

select results_eq(
  $$select (public.preview_transfer_client_data(
      'a1a1a1a1-0002-41a1-81a1-a1a1a1a1a1a1'::uuid,
      'a1a1a1a1-0001-41a1-81a1-a1a1a1a1a1a1'::uuid
    ) ->> 'ok')$$,
  $$select 'true'$$,
  'Prévia de transferência ok'
);

select results_eq(
  $$select (public.transfer_client_data(
      'a1a1a1a1-0002-41a1-81a1-a1a1a1a1a1a1'::uuid,
      'a1a1a1a1-0001-41a1-81a1-a1a1a1a1a1a1'::uuid,
      'TRANSFERIR'
    ) ->> 'ok')$$,
  $$select 'true'$$,
  'Transferência executa'
);

select results_eq(
  $$select coalesce(sum(company_revenue),0)::numeric from public.charges
    where id = 'a1a1a1a1-00c1-41a1-81a1-a1a1a1a1a1a1'::uuid
      and status = 'paid'$$,
  $$select 400::numeric$$,
  'Totais: receita própria preservada'
);

select results_eq(
  $$select coalesce(sum(media_budget),0)::numeric from public.charges
    where id = 'a1a1a1a1-00c1-41a1-81a1-a1a1a1a1a1a1'::uuid
      and status <> 'cancelled'$$,
  $$select 600::numeric$$,
  'Totais: verba de mídia preservada'
);

select results_eq(
  $$select coalesce(sum(amount),0)::numeric from public.expenses
    where id = 'a1a1a1a1-00b1-41a1-81a1-a1a1a1a1a1a1'::uuid
      and status = 'paid'$$,
  $$select 80::numeric$$,
  'Totais: despesas preservadas'
);

select results_eq(
  $$select client_id::text, client_service_id::text, client_entity_id::text
    from public.charges
    where id = 'a1a1a1a1-00c1-41a1-81a1-a1a1a1a1a1a1'::uuid$$,
  $$select
      'a1a1a1a1-0001-41a1-81a1-a1a1a1a1a1a1',
      'a1a1a1a1-00a1-41a1-81a1-a1a1a1a1a1a1',
      'a1a1a1a1-00e2-41a1-81a1-a1a1a1a1a1a1'$$,
  'Vínculo cobrança↔serviço e entity preservados no destino'
);

select results_eq(
  $$select client_id::text, display_name, tax_id, notes
    from public.client_entities
    where id = 'a1a1a1a1-00e2-41a1-81a1-a1a1a1a1a1a1'::uuid$$,
  $$select
      'a1a1a1a1-0001-41a1-81a1-a1a1a1a1a1a1',
      'Marca Compartilhada (transferido)',
      '22222222000122',
      'Metadata da origem'$$,
  'Entity da origem moveu e foi renomeada no conflito'
);

select results_eq(
  $$select tax_id, notes from public.client_entities
    where id = 'a1a1a1a1-00e1-41a1-81a1-a1a1a1a1a1a1'::uuid$$,
  $$select '11111111000111', 'Metadata do destino'$$,
  'Entity do destino não foi sobrescrita'
);

select results_eq(
  $$select client_id::text from public.client_contacts
    where id = 'a1a1a1a1-00f1-41a1-81a1-a1a1a1a1a1a1'::uuid$$,
  $$select 'a1a1a1a1-0001-41a1-81a1-a1a1a1a1a1a1'$$,
  'Contatos movidos para o destino'
);

select results_eq(
  $$select client_id::text, client_entity_id::text from public.domains
    where id = 'a1a1a1a1-00d1-41a1-81a1-a1a1a1a1a1a1'::uuid$$,
  $$select
      'a1a1a1a1-0001-41a1-81a1-a1a1a1a1a1a1',
      'a1a1a1a1-00e2-41a1-81a1-a1a1a1a1a1a1'$$,
  'Domínios movidos com entity preservada'
);

select results_eq(
  $$select client_id::text from public.activity_events
    where id = 'a1a1a1a1-00f2-41a1-81a1-a1a1a1a1a1a1'::uuid$$,
  $$select 'a1a1a1a1-0002-41a1-81a1-a1a1a1a1a1a1'$$,
  'Transferência não reescreve eventos históricos'
);

select results_eq(
  $$select count(*)::int from public.activity_events
    where action = 'client.data_transferred'
      and client_id = 'a1a1a1a1-0001-41a1-81a1-a1a1a1a1a1a1'::uuid
      and event_data->>'source_client_id' = 'a1a1a1a1-0002-41a1-81a1-a1a1a1a1a1a1'$$,
  $$select 1$$,
  'Cria evento client.data_transferred no destino'
);

select results_eq(
  $$select commercial_status, archived_at is not null
    from public.clients
    where id = 'a1a1a1a1-0002-41a1-81a1-a1a1a1a1a1a1'::uuid$$,
  $$select 'archived', true$$,
  'Origem vazia fica arquivada'
);

select results_eq(
  $$select count(*)::int from public.client_services
    where client_id = 'a1a1a1a1-0002-41a1-81a1-a1a1a1a1a1a1'::uuid$$,
  $$select 0$$,
  'Origem sem serviços após transferência'
);

select results_eq(
  $$select count(*)::int from public.charges
    where id = 'a1a1a1a1-00c1-41a1-81a1-a1a1a1a1a1a1'::uuid$$,
  $$select 1$$,
  'Não duplica cobranças na transferência'
);

select * from finish();
rollback;
