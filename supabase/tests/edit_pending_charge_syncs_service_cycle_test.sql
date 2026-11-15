begin;

select plan(12);

insert into auth.users (id, email)
values ('86868686-8686-4868-8868-868686868686', 'charge-edit@example.test');

select set_config('request.jwt.claim.sub', '86868686-8686-4868-8868-868686868686', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$select * from public.bootstrap_identity_workspace(
    'Owner Charge Edit', 'Workspace Charge Edit',
    array['20000000-0000-4000-8000-000000000001'::uuid, '20000000-0000-4000-8000-000000000002'::uuid]
  )$$,
  'Cria o workspace de teste'
);

select set_config(
  'test.workspace',
  (select id::text from public.workspaces
    where created_by = '86868686-8686-4868-8868-868686868686'::uuid),
  true
);

reset role;
insert into public.clients (id, workspace_id, kind, name, commercial_status)
values (
  '86868686-0001-4868-8868-868686868686',
  current_setting('test.workspace')::uuid,
  'company', 'Cliente Remarcação', 'active'
);

-- Cobrança avulsa, sem serviço, para provar que ela nunca mexe na agenda.
insert into public.charges (
  id, workspace_id, client_id, description, due_date, company_revenue, status
) values (
  '86868686-00bb-4868-8868-868686868686',
  current_setting('test.workspace')::uuid,
  '86868686-0001-4868-8868-868686868686',
  'Ajuste avulso', date '2026-02-10', 50, 'pending'
);
set local role authenticated;

select lives_ok(
  $$select public.apply_service_to_client(
    '86868686-0001-4868-8868-868686868686'::uuid, null,
    'Mensalidade', null,
    300, 'none', 0, 0, 0, true,
    'monthly', date '2026-01-10', date '2026-02-10', 1,
    null, null, null, null, null
  )$$,
  'Aplica um serviço mensal com vencimento em 10/02'
);

select set_config(
  'test.service',
  (select id::text from public.client_services
    where client_id = '86868686-0001-4868-8868-868686868686'::uuid limit 1),
  true
);
select set_config(
  'test.cycle',
  (select id::text from public.charges
    where client_service_id = current_setting('test.service')::uuid and status = 'pending'),
  true
);

-- 1. Editar a cobrança do ciclo atual (é o que a tela de edição faz) move a agenda junto.
select lives_ok(
  $$update public.charges
    set due_date = date '2026-02-15', description = 'Mensalidade de fevereiro',
        company_revenue = 320, additional_fee = 10, additional_fee_is_revenue = false,
        notes = 'Cliente pediu para pagar no dia 15'
    where id = current_setting('test.cycle')::uuid$$,
  'O dono edita vencimento, valores e natureza do adicional da cobrança pendente'
);

select results_eq(
  $$select next_due_date::text from public.client_services
    where id = current_setting('test.service')::uuid$$,
  $$values ('2026-02-15'::text)$$,
  'O próximo vencimento do serviço acompanha a cobrança remarcada'
);

select results_eq(
  $$select company_revenue, additional_fee, additional_fee_is_revenue from public.charges
    where id = current_setting('test.cycle')::uuid$$,
  $$values (320::numeric(15,2), 10::numeric(15,2), false)$$,
  'Os valores editados ficam gravados na cobrança'
);

-- 2. Remarcar a cobrança avulsa não toca na agenda do serviço.
select lives_ok(
  $$update public.charges set due_date = date '2026-02-28'
    where id = '86868686-00bb-4868-8868-868686868686'::uuid$$,
  'Remarca a cobrança avulsa'
);

select results_eq(
  $$select next_due_date::text from public.client_services
    where id = current_setting('test.service')::uuid$$,
  $$values ('2026-02-15'::text)$$,
  'Cobrança avulsa remarcada não altera o serviço'
);

-- 3. Editar o próximo vencimento no serviço leva a cobrança pendente para a data nova.
select results_eq(
  $$select public.update_client_service(
    current_setting('test.service')::uuid,
    'Mensalidade', null,
    300, 'none', 0, 0, 0, true,
    'monthly', date '2026-02-20',
    null, null, null, null, null
  )$$,
  $$values ('updated'::text)$$,
  'Edita o serviço com novo próximo vencimento'
);

select results_eq(
  $$select due_date::text from public.charges
    where client_service_id = current_setting('test.service')::uuid and status = 'pending'$$,
  $$values ('2026-02-20'::text)$$,
  'A única cobrança pendente do serviço foi para a data nova, sem duplicar o ciclo'
);

select results_eq(
  $$select next_due_date::text from public.client_services
    where id = current_setting('test.service')::uuid$$,
  $$values ('2026-02-20'::text)$$,
  'Serviço e cobrança terminam na mesma data'
);

-- 4. Pagar depois da remarcação agenda o ciclo seguinte a partir da data nova.
select results_eq(
  $$select public.settle_charge_and_schedule_next(
    current_setting('test.cycle')::uuid, 'Pix'
  )::text$$,
  $$values ('2026-03-20'::text)$$,
  'O ciclo seguinte nasce um mês depois do vencimento remarcado'
);

-- 5. Cobrança paga continua fora do alcance da edição: o update não encontra a linha
-- porque a tela filtra por pendente, e a agenda não volta para trás.
select results_eq(
  $$with edited as (
      update public.charges set due_date = date '2026-01-01'
      where id = current_setting('test.cycle')::uuid and status = 'pending'
      returning id
    )
    select count(*) from edited$$,
  array[0::bigint],
  'Cobrança já paga não é remarcada pelo filtro de pendência'
);

select * from finish();
rollback;
