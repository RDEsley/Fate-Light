begin;

select plan(11);

insert into auth.users (id, email)
values ('85858585-8585-4858-8858-858585858585', 'manual-charge-schedule@example.test');

select set_config('request.jwt.claim.sub', '85858585-8585-4858-8858-858585858585', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$select * from public.bootstrap_identity_workspace(
    'Owner Manual Charge', 'Workspace Manual Charge',
    array['20000000-0000-4000-8000-000000000001'::uuid, '20000000-0000-4000-8000-000000000002'::uuid]
  )$$,
  'Cria o workspace de teste'
);

select set_config(
  'test.workspace',
  (select id::text from public.workspaces
    where created_by = '85858585-8585-4858-8858-858585858585'::uuid),
  true
);

reset role;
insert into public.clients (id, workspace_id, kind, name, commercial_status)
values (
  '85858585-0001-4858-8858-858585858585',
  current_setting('test.workspace')::uuid,
  'company',
  'Cliente Agenda',
  'active'
);

insert into public.client_services (
  id, workspace_id, client_id, name, company_revenue, billing_type, start_date, next_due_date, status
) values (
  '85858585-0002-4858-8858-858585858585',
  current_setting('test.workspace')::uuid,
  '85858585-0001-4858-8858-858585858585',
  'Mensalidade',
  100, 'monthly',
  date '2026-01-01', date '2026-02-01', 'active'
);

-- Cobrança automática A (vinculada ao serviço).
insert into public.charges (
  id, workspace_id, client_id, client_service_id, description, due_date,
  company_revenue, media_budget, additional_fee, status
) values (
  '85858585-00aa-4858-8858-858585858585',
  current_setting('test.workspace')::uuid,
  '85858585-0001-4858-8858-858585858585',
  '85858585-0002-4858-8858-858585858585',
  'Ciclo automático',
  date '2026-02-01',
  100, 0, 0, 'pending'
);

-- Cobrança manual B (sem vínculo — como createCharge contextual).
insert into public.charges (
  id, workspace_id, client_id, client_service_id, description, due_date,
  company_revenue, media_budget, additional_fee, status
) values (
  '85858585-00bb-4858-8858-858585858585',
  current_setting('test.workspace')::uuid,
  '85858585-0001-4858-8858-858585858585',
  null,
  'Ajuste manual',
  date '2026-02-01',
  50, 0, 0, 'pending'
);

select set_config('request.jwt.claim.sub', '85858585-8585-4858-8858-858585858585', true);
set local role authenticated;

select results_eq(
  $$select public.settle_charge_and_schedule_next(
    '85858585-00bb-4858-8858-858585858585'::uuid, 'Pix'
  ) is null$$,
  $$values (true)$$,
  'Pagar cobrança manual não agenda próximo ciclo'
);

select results_eq(
  $$select status, paid_at is not null
    from public.charges
    where id = '85858585-00bb-4858-8858-858585858585'::uuid$$,
  $$values ('paid'::text, true)$$,
  'Cobrança manual fica paga'
);

select results_eq(
  $$select next_due_date::text, promotional_cycles_used::integer
    from public.client_services
    where id = '85858585-0002-4858-8858-858585858585'::uuid$$,
  $$values ('2026-02-01'::text, 0)$$,
  'Agenda e promoção do serviço permanecem intactas após pagar manual'
);

select results_eq(
  $$select count(*) from public.charges
    where client_service_id = '85858585-0002-4858-8858-858585858585'::uuid$$,
  array[1::bigint],
  'Nenhum ciclo C nasce ao pagar a cobrança manual'
);

select results_eq(
  $$select status from public.charges
    where id = '85858585-00aa-4858-8858-858585858585'::uuid$$,
  $$values ('pending'::text)$$,
  'Cobrança automática A continua pendente'
);

select lives_ok(
  $$select public.settle_charge_and_schedule_next(
    '85858585-00aa-4858-8858-858585858585'::uuid, 'Pix'
  )$$,
  'Pagar a cobrança automática A avança a recorrência'
);

select results_eq(
  $$select next_due_date::text
    from public.client_services
    where id = '85858585-0002-4858-8858-858585858585'::uuid$$,
  $$values ('2026-03-01'::text)$$,
  'Após pagar A, next_due_date avança um mês'
);

select results_eq(
  $$select count(*) from public.charges
    where client_service_id = '85858585-0002-4858-8858-858585858585'::uuid
      and status = 'pending'$$,
  array[1::bigint],
  'Pagar A cria exatamente um próximo ciclo pendente'
);

select results_eq(
  $$select status from public.charges
    where id = '85858585-00aa-4858-8858-858585858585'::uuid$$,
  $$values ('paid'::text)$$,
  'Cobrança automática A fica paga'
);

select results_eq(
  $$select client_service_id is null from public.charges
    where id = '85858585-00bb-4858-8858-858585858585'::uuid$$,
  $$values (true)$$,
  'Manual permanece sem vínculo de serviço'
);

select * from finish();
rollback;
