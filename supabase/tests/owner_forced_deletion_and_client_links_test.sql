begin;

select plan(12);

insert into auth.users (id, email)
values ('65656565-6565-4565-8565-656565656565', 'forced@example.test');

select set_config('request.jwt.claim.sub', '65656565-6565-4565-8565-656565656565', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$select * from public.bootstrap_identity_workspace(
    'Owner Forced', 'Workspace Forced',
    array['20000000-0000-4000-8000-000000000001'::uuid, '20000000-0000-4000-8000-000000000002'::uuid]
  )$$,
  'Cria o workspace de teste'
);

select set_config(
  'test.forced_workspace',
  (select id::text from public.workspaces
    where created_by = '65656565-6565-4565-8565-656565656565'::uuid),
  true
);

reset role;
insert into public.clients (id, workspace_id, kind, name, commercial_status)
values (
  '65656565-0001-4565-8565-656565656565',
  current_setting('test.forced_workspace')::uuid,
  'company', 'Cliente com histórico', 'active'
);
set local role authenticated;

-- Links extras do cliente: até três, host em minúsculas sem protocolo.
select lives_ok(
  $$update public.clients
    set links = '[{"label":"Painel","url":"painel.exemplo.com.br"},
                  {"label":"Drive","url":"drive.exemplo.com.br/pasta"}]'::jsonb
    where id = '65656565-0001-4565-8565-656565656565'$$,
  'Aceita até três links nomeados no cliente'
);

select throws_ok(
  $$update public.clients
    set links = '[{"label":"A","url":"a.com"},{"label":"B","url":"b.com"},
                  {"label":"C","url":"c.com"},{"label":"D","url":"d.com"}]'::jsonb
    where id = '65656565-0001-4565-8565-656565656565'$$,
  '23514',
  null,
  'Recusa mais de três links no cliente'
);

select throws_ok(
  $$update public.clients
    set links = '[{"label":"Site","url":"https://COM-PROTOCOLO.com"}]'::jsonb
    where id = '65656565-0001-4565-8565-656565656565'$$,
  '23514',
  null,
  'Recusa link com protocolo ou letra maiúscula'
);

-- Serviço com cobrança já paga.
select lives_ok(
  $$select public.apply_service_to_client(
    '65656565-0001-4565-8565-656565656565'::uuid, null,
    'Serviço cadastrado errado', null,
    800, 'none', 0, 0, 0, true,
    'monthly', current_date, current_date, 1,
    null, null, null, null, null
  )$$,
  'Aplica o serviço que será excluído'
);

select lives_ok(
  $$select public.settle_charge_and_schedule_next(
    (select id from public.charges
      where client_id = '65656565-0001-4565-8565-656565656565'::uuid
      order by due_date limit 1),
    'Pix'
  )$$,
  'Liquida a primeira cobrança do serviço'
);

-- Sem força, a regra da ADR-0015 continua valendo.
select results_eq(
  $$select public.delete_client_service_cascade(
    (select id from public.client_services
      where client_id = '65656565-0001-4565-8565-656565656565'::uuid limit 1),
    false
  )$$,
  $$values ('blocked'::text)$$,
  'Sem força, cobrança paga bloqueia a exclusão do serviço'
);

-- Liquidação em lote não recria cobrança nem toca no que já estava pago.
select set_config(
  'test.forced_service',
  (select id::text from public.client_services
    where client_id = '65656565-0001-4565-8565-656565656565'::uuid limit 1),
  true
);

-- settle_charge_and_schedule_next já agendou o próximo ciclo mensal, com vencimento no
-- futuro: liquidação em lote não deve tocar nele.
select results_eq(
  $$select public.settle_client_service_charges(
    current_setting('test.forced_service')::uuid, 'Boleto')$$,
  $$values (0)$$,
  'Não liquida cobrança futura ainda não vencida'
);

insert into public.charges (
  workspace_id, client_id, client_service_id, description, due_date, company_revenue, status
) values (
  current_setting('test.forced_workspace')::uuid,
  '65656565-0001-4565-8565-656565656565',
  current_setting('test.forced_service')::uuid,
  'Cobrança vencida do serviço', current_date - 5, 100, 'pending'
);

select results_eq(
  $$select public.settle_client_service_charges(
    current_setting('test.forced_service')::uuid, 'Boleto')$$,
  $$values (1)$$,
  'Liquida a cobrança já vencida do serviço'
);

select results_eq(
  $$select count(*) from public.charges
    where client_service_id = current_setting('test.forced_service')::uuid
      and status = 'pending'$$,
  array[1::bigint],
  'O ciclo futuro auto-agendado segue pendente depois da liquidação'
);

-- Com força, o dono remove serviço e cobranças pagas.
select results_eq(
  $$select public.delete_client_service_cascade(
    current_setting('test.forced_service')::uuid,
    true
  )$$,
  $$values ('deleted'::text)$$,
  'Com força, o serviço é removido mesmo com cobrança paga'
);

select results_eq(
  $$select count(*) from public.charges
    where client_id = '65656565-0001-4565-8565-656565656565'::uuid$$,
  array[0::bigint],
  'As cobranças pagas do serviço saem junto na exclusão forçada'
);

select * from finish();
rollback;
