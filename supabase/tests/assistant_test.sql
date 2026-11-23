begin;

select plan(22);

select ok(
  (select bool_and(relrowsecurity and relforcerowsecurity)
   from pg_catalog.pg_class
   where oid in ('public.agent_consents'::regclass, 'public.agent_runs'::regclass)),
  'Tabelas do assistente usam RLS e FORCE RLS'
);

insert into auth.users (id, email)
values
  ('c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1', 'agent-a@example.test'),
  ('d2d2d2d2-d2d2-4d2d-8d2d-d2d2d2d2d2d2', 'agent-b@example.test');

select set_config('request.jwt.claim.sub', 'd2d2d2d2-d2d2-4d2d-8d2d-d2d2d2d2d2d2', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
select lives_ok(
  $$select * from public.bootstrap_identity_workspace(
      'Agent B', 'Agent B',
      (select array_agg(id order by document_type) from public.legal_documents where status = 'published' and is_required)
    )$$,
  'Cria o workspace B'
);
reset role;

select set_config('request.jwt.claim.sub', 'c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1', true);
set local role authenticated;
select lives_ok(
  $$select * from public.bootstrap_identity_workspace(
      'Agent A', 'Agent A',
      (select array_agg(id order by document_type) from public.legal_documents where status = 'published' and is_required)
    )$$,
  'Cria o workspace A'
);
reset role;

create temporary table agent_ws on commit drop as
select
  (select workspace_id from public.workspace_members where user_id = 'c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1') as a,
  (select workspace_id from public.workspace_members where user_id = 'd2d2d2d2-d2d2-4d2d-8d2d-d2d2d2d2d2d2') as b;
grant select on agent_ws to authenticated;

insert into public.clients (id, workspace_id, kind, name, commercial_status)
select 'c1c1c1c1-0001-4c1c-8c1c-c1c1c1c1c1c1'::uuid, a, 'company', 'Cliente A', 'active' from agent_ws;

insert into public.charges (
  id, workspace_id, client_id, description, due_date, company_revenue, media_budget,
  additional_fee, additional_fee_is_revenue, status, paid_at
)
select v.id::uuid, agent_ws.a, 'c1c1c1c1-0001-4c1c-8c1c-c1c1c1c1c1c1', v.description,
  v.due_date::date, v.revenue, v.media, v.fee, v.fee_revenue, v.status, v.paid_at::timestamptz
from agent_ws,
  (values
    ('c1c1c1c1-0c01-4c1c-8c1c-c1c1c1c1c1c1', 'Vencida antiga', '2026-10-01', 100.10, 900.00, 10.00, true, 'pending', null),
    ('c1c1c1c1-0c02-4c1c-8c1c-c1c1c1c1c1c1', 'A vencer', '2026-11-25', 200.00, 0.00, 50.00, false, 'pending', null),
    ('c1c1c1c1-0c03-4c1c-8c1c-c1c1c1c1c1c1', 'Paga', '2026-11-05', 300.00, 0.00, 0.00, true, 'paid', '2026-11-06T12:00:00Z')
  ) as v (id, description, due_date, revenue, media, fee, fee_revenue, status, paid_at);

-- Os gatilhos operacionais exigem o dono do workspace: os dados de B entram com a sessão de B.
select set_config('request.jwt.claim.sub', 'd2d2d2d2-d2d2-4d2d-8d2d-d2d2d2d2d2d2', true);
insert into public.clients (id, workspace_id, kind, name, commercial_status)
select 'd2d2d2d2-0001-4d2d-8d2d-d2d2d2d2d2d2'::uuid, b, 'company', 'Cliente B', 'active' from agent_ws;
insert into public.charges (id, workspace_id, client_id, description, due_date, company_revenue, status)
select 'd2d2d2d2-0c01-4d2d-8d2d-d2d2d2d2d2d2', b, 'd2d2d2d2-0001-4d2d-8d2d-d2d2d2d2d2d2',
  'Outro workspace', '2026-10-01', 500, 'pending'
from agent_ws;
select set_config('request.jwt.claim.sub', 'c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1', true);

set local role authenticated;

select results_eq(
  $$select received, received_count, pending, pending_count, overdue, overdue_count
    from public.assistant_month_summary((select a from agent_ws), '2026-11-01', '2026-11-30', '2026-11-23')$$,
  $$values (300.00::numeric, 1, 200.00::numeric, 1, 110.10::numeric, 1)$$,
  'Resumo soma só receita própria e separa recebido, pendente e vencido'
);
select results_eq(
  $$select received, overdue_count
    from public.assistant_month_summary((select b from agent_ws), '2026-11-01', '2026-11-30', '2026-11-23')$$,
  $$values (0.00::numeric, 0)$$,
  'Resumo não enxerga outro workspace'
);

select results_eq(
  $$select client_name, created from public.create_assistant_reminders(
      (select a from agent_ws),
      array['c1c1c1c1-0c01-4c1c-8c1c-c1c1c1c1c1c1'::uuid, 'c1c1c1c1-0c02-4c1c-8c1c-c1c1c1c1c1c1'::uuid, 'c1c1c1c1-0c03-4c1c-8c1c-c1c1c1c1c1c1'::uuid],
      '2026-11-23')$$,
  $$values ('Cliente A'::text, true)$$,
  'Só cobrança pendente e vencida vira lembrete'
);
select is(
  (select count(*)::integer from public.manual_alerts where charge_id = 'c1c1c1c1-0c01-4c1c-8c1c-c1c1c1c1c1c1'),
  1,
  'Lembrete fica vinculado à cobrança'
);
select results_eq(
  $$select created from public.create_assistant_reminders(
      (select a from agent_ws), array['c1c1c1c1-0c01-4c1c-8c1c-c1c1c1c1c1c1'::uuid], '2026-11-23')$$,
  $$values (false)$$,
  'Repetir a aprovação não duplica o lembrete'
);
select is(
  (select count(*)::integer from public.manual_alerts where charge_id = 'c1c1c1c1-0c01-4c1c-8c1c-c1c1c1c1c1c1'),
  1,
  'Continua um único lembrete aberto'
);
select is_empty(
  $$select * from public.create_assistant_reminders(
      (select a from agent_ws), array['d2d2d2d2-0c01-4d2d-8d2d-d2d2d2d2d2d2'::uuid], '2026-11-23')$$,
  'Cobrança de outro workspace é ignorada'
);
select throws_ok(
  $$select * from public.create_assistant_reminders((select a from agent_ws), '{}'::uuid[], '2026-11-23')$$,
  '22023',
  null,
  'Lista vazia é recusada'
);
select throws_ok(
  $$select public.accept_agent_consent((select b from agent_ws), 'v1')$$,
  '42501',
  null,
  'Não aceita em nome de outro workspace'
);
select lives_ok(
  $$select public.accept_agent_consent((select a from agent_ws), 'v1')$$,
  'Owner registra o aceite'
);
select is(
  (select version from public.agent_consents where workspace_id = (select a from agent_ws)),
  'v1',
  'Aceite fica versionado'
);

select results_eq(
  $$select allowed, remaining from public.consume_agent_quota('message')$$,
  $$values (true, 9)$$,
  'Primeira mensagem consome a cota'
);
select lives_ok(
  $$select public.consume_agent_quota('message') from generate_series(1, 9)$$,
  'Consome o restante da cota'
);
select results_eq(
  $$select allowed, remaining from public.consume_agent_quota('message')$$,
  $$values (false, 0)$$,
  'A décima primeira mensagem é recusada'
);
select throws_ok(
  $$select * from private.agent_usage_daily$$,
  '42501',
  null,
  'Usuário não lê o contador'
);
select throws_ok(
  $$select * from public.consume_guest_agent_quota(repeat('a', 64), 'message', 100)$$,
  '42501',
  null,
  'Usuário não chama a cota de visitante'
);
select throws_ok(
  $$insert into public.agent_runs (workspace_id, question, outcome, duration_ms, model)
    select b, 'x', 'ok', 1, 'modelo' from agent_ws$$,
  '42501',
  null,
  'Não registra execução em outro workspace'
);
reset role;

set local role service_role;
select results_eq(
  $$select allowed, remaining from public.consume_guest_agent_quota(repeat('a', 64), 'message', 1)$$,
  $$values (true, 9)$$,
  'Servidor consome a cota do visitante'
);
select results_eq(
  $$select allowed from public.consume_guest_agent_quota(repeat('b', 64), 'message', 1)$$,
  $$values (false)$$,
  'Teto global recusa outro visitante'
);
reset role;

select * from finish();
rollback;
