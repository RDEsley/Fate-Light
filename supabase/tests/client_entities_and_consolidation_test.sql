begin;

select plan(18);

insert into auth.users (id, email)
values
  ('91919191-9191-4919-8919-919191919191', 'entities-owner@example.test'),
  ('92929292-9292-4929-8929-929292929292', 'entities-other@example.test');

select set_config('request.jwt.claim.sub', '91919191-9191-4919-8919-919191919191', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$select * from public.bootstrap_identity_workspace(
    'Owner Entities', 'Workspace Entities A',
    array['20000000-0000-4000-8000-000000000001'::uuid, '20000000-0000-4000-8000-000000000002'::uuid]
  )$$,
  'Cria workspace A'
);

select set_config(
  'test.workspace_a',
  (select id::text from public.workspaces
    where created_by = '91919191-9191-4919-8919-919191919191'::uuid),
  true
);

reset role;
select set_config('request.jwt.claim.sub', '92929292-9292-4929-8929-929292929292', true);
set local role authenticated;

select lives_ok(
  $$select * from public.bootstrap_identity_workspace(
    'Owner Other', 'Workspace Entities B',
    array['20000000-0000-4000-8000-000000000001'::uuid, '20000000-0000-4000-8000-000000000002'::uuid]
  )$$,
  'Cria workspace B'
);

select set_config(
  'test.workspace_b',
  (select id::text from public.workspaces
    where created_by = '92929292-9292-4929-8929-929292929292'::uuid),
  true
);

reset role;
insert into public.clients (id, workspace_id, kind, name, commercial_status)
values
  (
    '91919191-0001-4919-8919-919191919191',
    current_setting('test.workspace_a')::uuid,
    'person', 'Richard', 'active'
  ),
  (
    '91919191-0002-4919-8919-919191919191',
    current_setting('test.workspace_a')::uuid,
    'company', 'Richard — DX', 'active'
  ),
  (
    '92929292-0001-4929-8929-929292929292',
    current_setting('test.workspace_b')::uuid,
    'person', 'Outro', 'active'
  );

insert into public.client_entities (
  id, workspace_id, client_id, entity_type, display_name, status, created_by, updated_by
) values (
  '91919191-00e1-4919-8919-919191919191',
  current_setting('test.workspace_a')::uuid,
  '91919191-0001-4919-8919-919191919191',
  'company',
  'Fate Eight Tech',
  'active',
  '91919191-9191-4919-8919-919191919191',
  '91919191-9191-4919-8919-919191919191'
);

insert into public.client_services (
  id, workspace_id, client_id, client_entity_id, name, company_revenue, media_budget,
  billing_type, start_date, next_due_date, status
) values (
  '91919191-00s1-4919-8919-919191919191',
  current_setting('test.workspace_a')::uuid,
  '91919191-0001-4919-8919-919191919191',
  '91919191-00e1-4919-8919-919191919191',
  'Gestão Ads',
  500, 1000, 'monthly', date '2026-01-01', date '2026-02-01', 'active'
);

insert into public.charges (
  id, workspace_id, client_id, client_entity_id, client_service_id, description, due_date,
  company_revenue, media_budget, additional_fee, status
) values (
  '91919191-00c1-4919-8919-919191919191',
  current_setting('test.workspace_a')::uuid,
  '91919191-0001-4919-8919-919191919191',
  '91919191-00e1-4919-8919-919191919191',
  '91919191-00s1-4919-8919-919191919191',
  'Gestão Ads',
  date '2026-02-01',
  500, 1000, 0, 'pending'
);

-- Isolamento: workspace B não vê entity de A.
select set_config('request.jwt.claim.sub', '92929292-9292-4929-8929-929292929292', true);
set local role authenticated;

select is_empty(
  $$select id from public.client_entities
    where id = '91919191-00e1-4919-8919-919191919191'::uuid$$,
  'Entity de outro workspace é invisível'
);

select throws_ok(
  $$insert into public.client_entities (
      workspace_id, client_id, entity_type, display_name, status
    ) values (
      current_setting('test.workspace_a')::uuid,
      '91919191-0001-4919-8919-919191919191',
      'company', 'Invasora', 'active'
    )$$,
  '42501',
  null,
  'Não cria entity em workspace alheio'
);

reset role;
-- Integridade: entity de outro cliente no mesmo workspace é rejeitada.
select throws_ok(
  $$insert into public.charges (
      workspace_id, client_id, client_entity_id, description, due_date,
      company_revenue, media_budget, additional_fee, status
    ) values (
      current_setting('test.workspace_a')::uuid,
      '91919191-0002-4919-8919-919191919191',
      '91919191-00e1-4919-8919-919191919191',
      'Cross client',
      date '2026-03-01',
      10, 0, 0, 'pending'
    )$$,
  '23503',
  null,
  'Entity de outro cliente não pode ser ligada'
);

-- Nome ativo duplicado no mesmo cliente.
select set_config('request.jwt.claim.sub', '91919191-9191-4919-8919-919191919191', true);
set local role authenticated;

select throws_ok(
  $$insert into public.client_entities (
      workspace_id, client_id, entity_type, display_name, status
    ) values (
      current_setting('test.workspace_a')::uuid,
      '91919191-0001-4919-8919-919191919191',
      'brand', 'fate eight tech', 'active'
    )$$,
  '23505',
  null,
  'Display name ativo duplicado é bloqueado'
);

-- settle herda entity na próxima cobrança.
select results_eq(
  $$select public.settle_charge_and_schedule_next(
      '91919191-00c1-4919-8919-919191919191'::uuid, 'Pix'
    )$$,
  $$select date '2026-03-01'$$,
  'Settle agenda próximo ciclo'
);

select results_eq(
  $$select client_entity_id::text from public.charges
    where client_service_id = '91919191-00s1-4919-8919-919191919191'::uuid
      and due_date = date '2026-03-01'$$,
  $$select '91919191-00e1-4919-8919-919191919191'$$,
  'Próxima cobrança automática herda entity'
);

-- Consolidação: preparar origem com valores.
reset role;
insert into public.client_services (
  id, workspace_id, client_id, name, company_revenue, media_budget,
  billing_type, start_date, next_due_date, status
) values (
  '91919191-00s2-4919-8919-919191919191',
  current_setting('test.workspace_a')::uuid,
  '91919191-0002-4919-8919-919191919191',
  'SEO DX',
  200, 300, 'monthly', date '2026-01-01', date '2026-02-01', 'active'
);

insert into public.charges (
  id, workspace_id, client_id, client_service_id, description, due_date,
  company_revenue, media_budget, additional_fee, status, paid_at, payment_method
) values (
  '91919191-00c2-4919-8919-919191919191',
  current_setting('test.workspace_a')::uuid,
  '91919191-0002-4919-8919-919191919191',
  '91919191-00s2-4919-8919-919191919191',
  'SEO DX pago',
  date '2026-01-15',
  200, 300, 0, 'paid', '2026-01-15 12:00:00+00', 'Pix'
);

insert into public.expenses (
  id, workspace_id, client_id, description, category, amount, due_date, status, paid_at, expense_type
) values (
  '91919191-00x1-4919-8919-919191919191',
  current_setting('test.workspace_a')::uuid,
  '91919191-0002-4919-8919-919191919191',
  'Ferramenta DX',
  'software',
  50, date '2026-01-10', 'paid', '2026-01-10 12:00:00+00', 'variable'
);

insert into public.domains (
  id, workspace_id, client_id, domain, expires_on, status
) values (
  '91919191-00d1-4919-8919-919191919191',
  current_setting('test.workspace_a')::uuid,
  '91919191-0002-4919-8919-919191919191',
  'dx.example',
  date '2026-12-01',
  'active'
);

select set_config('request.jwt.claim.sub', '91919191-9191-4919-8919-919191919191', true);
set local role authenticated;

select results_eq(
  $$select (public.preview_consolidate_client_into_entity(
      '91919191-0002-4919-8919-919191919191'::uuid,
      '91919191-0001-4919-8919-919191919191'::uuid
    ) ->> 'ok')$$,
  $$select 'true'$$,
  'Prévia de consolidação ok'
);

select results_eq(
  $$select (public.consolidate_client_into_entity(
      '91919191-0002-4919-8919-919191919191'::uuid,
      '91919191-0001-4919-8919-919191919191'::uuid,
      'DX Dedetizadora',
      'company',
      'CONSOLIDAR'
    ) ->> 'ok')$$,
  $$select 'true'$$,
  'Consolidação executa'
);

select results_eq(
  $$select commercial_status from public.clients
    where id = '91919191-0002-4919-8919-919191919191'::uuid$$,
  $$select 'archived'$$,
  'Origem fica arquivada'
);

select results_eq(
  $$select count(*)::int from public.charges
    where client_id = '91919191-0001-4919-8919-919191919191'::uuid
      and client_entity_id = (
        select id from public.client_entities
        where client_id = '91919191-0001-4919-8919-919191919191'::uuid
          and display_name = 'DX Dedetizadora'
      )$$,
  $$select 1$$,
  'Cobranças movidas sem duplicar'
);

select results_eq(
  $$select coalesce(sum(company_revenue),0)::numeric from public.charges
    where client_entity_id = (
      select id from public.client_entities
      where display_name = 'DX Dedetizadora'
        and client_id = '91919191-0001-4919-8919-919191919191'::uuid
    )
    and status = 'paid'$$,
  $$select 200::numeric$$,
  'Receita própria preservada'
);

select results_eq(
  $$select coalesce(sum(media_budget),0)::numeric from public.charges
    where client_entity_id = (
      select id from public.client_entities
      where display_name = 'DX Dedetizadora'
        and client_id = '91919191-0001-4919-8919-919191919191'::uuid
    )
    and status <> 'cancelled'$$,
  $$select 300::numeric$$,
  'Verba de mídia preservada'
);

select results_eq(
  $$select coalesce(sum(amount),0)::numeric from public.expenses
    where client_entity_id = (
      select id from public.client_entities
      where display_name = 'DX Dedetizadora'
        and client_id = '91919191-0001-4919-8919-919191919191'::uuid
    )
    and status = 'paid'$$,
  $$select 50::numeric$$,
  'Despesas preservadas'
);

select results_eq(
  $$select client_service_id is not null from public.charges
    where id = '91919191-00c2-4919-8919-919191919191'::uuid$$,
  $$select true$$,
  'Vínculo cobrança↔serviço preservado'
);

-- Outro workspace não consolida clientes de A.
select set_config('request.jwt.claim.sub', '92929292-9292-4929-8929-929292929292', true);
set local role authenticated;

select throws_ok(
  $$select public.preview_consolidate_client_into_entity(
      '91919191-0002-4919-8919-919191919191'::uuid,
      '92929292-0001-4929-8929-929292929292'::uuid
    )$$,
  '42501',
  null,
  'Workspace B não consolida clientes de A'
);

select * from finish();
rollback;
