begin;

select plan(28);

select ok(
  (select bool_and(relrowsecurity and relforcerowsecurity)
   from pg_catalog.pg_class
   where oid in (
     'public.whatsapp_reminder_settings'::regclass,
     'public.client_whatsapp_preferences'::regclass,
     'public.whatsapp_reminder_deliveries'::regclass
   )),
  'Tabelas do WhatsApp usam RLS e FORCE RLS'
);

insert into auth.users (id, email)
values
  ('a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1', 'whats-a@example.test'),
  ('b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2', 'whats-b@example.test');

select set_config('request.jwt.claim.sub', 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
select lives_ok(
  $$select * from public.bootstrap_identity_workspace(
      'Whats A', 'Whats A',
      (select array_agg(id order by document_type) from public.legal_documents where status = 'published' and is_required)
    )$$,
  'Cria o workspace A'
);
reset role;

update public.workspaces set timezone = 'America/Sao_Paulo'
where id = (select workspace_id from public.workspace_members
            where user_id = 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1');

insert into public.clients (id, workspace_id, kind, name, commercial_status, phone)
select 'a1a1a1a1-0001-4a1a-8a1a-a1a1a1a1a1a1', workspace_id, 'company', 'Padaria Sol', 'active',
  '(61) 99999-1234'
from public.workspace_members where user_id = 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1';

-- Vencimentos relativos a 2026-12-10 (09:00 em Brasília = 12:00 UTC).
insert into public.charges (id, workspace_id, client_id, description, due_date, company_revenue, status)
select v.id::uuid, member.workspace_id, 'a1a1a1a1-0001-4a1a-8a1a-a1a1a1a1a1a1', v.description,
  v.due_date::date, 150, 'pending'
from public.workspace_members as member,
  (values
    ('a1a1a1a1-0c01-4a1a-8a1a-a1a1a1a1a1a1', 'Gestão de tráfego', '2026-12-10'),
    ('a1a1a1a1-0c02-4a1a-8a1a-a1a1a1a1a1a1', 'Hospedagem', '2026-12-13'),
    ('a1a1a1a1-0c03-4a1a-8a1a-a1a1a1a1a1a1', 'Manutenção', '2026-12-08'),
    ('a1a1a1a1-0c04-4a1a-8a1a-a1a1a1a1a1a1', 'Site', '2026-12-20')
  ) as v (id, description, due_date)
where member.user_id = 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1';

set local role authenticated;
select throws_ok(
  $$insert into public.whatsapp_reminder_settings (workspace_id, enabled) select workspace_id, true from public.workspace_members where user_id = auth.uid()$$,
  '23514',
  null,
  'Não liga a automação sem número e template do vencimento'
);
select lives_ok(
  $$insert into public.whatsapp_reminder_settings (
      workspace_id, enabled, phone_number_id, template_before, template_due, template_overdue,
      days_before, days_after, pix_key
    ) select workspace_id, true, '1234567890', 'lembrete_antes', 'cobranca_hoje', 'cobranca_atraso',
      3, 2, 'financeiro@example.test'
    from public.workspace_members where user_id = auth.uid()$$,
  'Owner configura a automação'
);
select throws_ok(
  $$select * from private.whatsapp_credentials$$,
  '42501',
  null,
  'Owner não lê o token diretamente'
);
select results_eq(
  $$select public.set_whatsapp_access_token('EAAG-token-de-teste-bem-longo')$$,
  array[true],
  'Owner grava o token pelo RPC'
);
select results_eq(
  $$select public.has_whatsapp_access_token()$$,
  array[true],
  'Tela só sabe que existe token salvo'
);
select throws_ok(
  $$select * from public.claim_whatsapp_reminders('2026-12-10 12:00+00')$$,
  '42501',
  null,
  'Usuário comum não aciona o agendador'
);
select throws_ok(
  $$insert into public.whatsapp_reminder_deliveries (workspace_id, charge_id, client_id, kind, due_date, scheduled_on, recipient_phone, contact_name) select workspace_id, 'a1a1a1a1-0c01-4a1a-8a1a-a1a1a1a1a1a1', 'a1a1a1a1-0001-4a1a-8a1a-a1a1a1a1a1a1', 'due', '2026-12-10', '2026-12-10', '5561999991234', 'X' from public.workspace_members where user_id = auth.uid()$$,
  '42501',
  null,
  'Usuário não grava histórico de envios'
);
reset role;

set local role service_role;
select results_eq(
  $$select count(*) from public.claim_whatsapp_reminders('2026-12-10 12:00+00')$$,
  array[0::bigint],
  'Cliente sem opt-in não recebe lembrete'
);
reset role;

set local role authenticated;
select lives_ok(
  $$insert into public.client_whatsapp_preferences (workspace_id, client_id, enabled, contact_name)
    select workspace_id, 'a1a1a1a1-0001-4a1a-8a1a-a1a1a1a1a1a1', true, 'Marina'
    from public.workspace_members where user_id = auth.uid()$$,
  'Owner ativa o cliente com nome de contato'
);
select throws_ok(
  $$update public.client_whatsapp_preferences set phone = '61 9999'$$,
  '23514',
  null,
  'Telefone de preferência aceita só dígitos com DDI/DDD'
);
reset role;

set local role service_role;
select results_eq(
  $$select array_agg(kind || ':' || template_name || ':' || contact_name || ':' || recipient_phone order by kind)
    from public.claim_whatsapp_reminders('2026-12-10 12:00+00')$$,
  $$select array[
    'before:lembrete_antes:Marina:61999991234',
    'due:cobranca_hoje:Marina:61999991234',
    'overdue:cobranca_atraso:Marina:61999991234'
  ]$$,
  'Agendador separa antes, no dia e atraso com nome e telefone do cliente'
);
select results_eq(
  $$select count(*) from public.claim_whatsapp_reminders('2026-12-10 18:00+00')$$,
  array[0::bigint],
  'Rodar de novo no mesmo dia não duplica envios'
);
select lives_ok(
  $$select public.record_whatsapp_send_result(id, 'wamid.due', null)
    from public.whatsapp_reminder_deliveries where kind = 'due'$$,
  'Registra envio aceito pela Meta'
);
select lives_ok(
  $$select public.record_whatsapp_send_result(id, null, 'Número sem WhatsApp')
    from public.whatsapp_reminder_deliveries where kind = 'before'$$,
  'Registra falha de envio'
);
select results_eq(
  $select array_agg(kind order by kind) from public.claim_whatsapp_reminders('2026-12-10 20:00+00')$,
  $select array['before', 'overdue']$,
  'Falha é tentada de novo e envio interrompido é recuperado no mesmo dia'
);
select results_eq(
  $$select public.record_whatsapp_status('wamid.due', 'read')$$,
  array[true],
  'Webhook marca como lido'
);
select results_eq(
  $$select public.record_whatsapp_status('wamid.due', 'delivered')$$,
  array[false],
  'Status não regride de lido para entregue'
);
select results_eq(
  $select public.record_whatsapp_status('wamid.due', 'failed', 'x')$,
  array[false],
  'Falha tardia não apaga uma leitura'
);
select lives_ok(
  $select public.record_whatsapp_send_result(id, null, 'Falha na segunda tentativa')
    from public.whatsapp_reminder_deliveries where kind = 'before'$,
  'Registra a falha da segunda tentativa'
);
update public.whatsapp_reminder_deliveries
set status = 'sending', attempts = 3, status_at = '2026-12-10 12:00+00'
where kind = 'overdue';
select results_eq(
  $select array_agg(kind order by kind)
    from public.claim_whatsapp_reminders('2026-12-10 22:00+00')$,
  $select array['before']$,
  'Não reenvia uma entrega interrompida que já esgotou as tentativas'
);
select results_eq(
  $select status from public.whatsapp_reminder_deliveries where kind = 'overdue'$,
  array['failed']::text[],
  'Entrega interrompida com tentativas esgotadas termina como falha'
);
select results_eq(
  $select count(*) from public.claim_whatsapp_reminders('2026-12-10 22:30+00')$,
  array[0::bigint],
  'Não passa de três tentativas por lembrete'
);
reset role;

update public.charges set status = 'paid', paid_at = statement_timestamp()
where id = 'a1a1a1a1-0c04-4a1a-8a1a-a1a1a1a1a1a1';

set local role service_role;
select results_eq(
  $$select count(*) from public.claim_whatsapp_reminders('2026-12-20 12:00+00')$$,
  array[0::bigint],
  'Cobrança paga não recebe lembrete'
);
reset role;

select set_config('request.jwt.claim.sub', 'b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2', true);
set local role authenticated;
select lives_ok(
  $$select * from public.bootstrap_identity_workspace(
      'Whats B', 'Whats B',
      (select array_agg(id order by document_type) from public.legal_documents where status = 'published' and is_required)
    )$$,
  'Cria o workspace B'
);
select results_eq(
  $$select (select count(*) from public.whatsapp_reminder_settings)
      + (select count(*) from public.client_whatsapp_preferences)
      + (select count(*) from public.whatsapp_reminder_deliveries)$$,
  array[0::bigint],
  'Workspace B não enxerga configuração, preferências nem envios do A'
);
select results_eq(
  $$select public.has_whatsapp_access_token()$$,
  array[false],
  'Workspace B não herda o token do A'
);
reset role;

select * from finish();
rollback;
