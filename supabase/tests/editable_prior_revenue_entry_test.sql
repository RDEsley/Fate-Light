begin;

select plan(4);

insert into auth.users (id, email)
values ('75757575-7575-4575-8575-757575757575', 'prior-revenue@example.test');

select set_config('request.jwt.claim.sub', '75757575-7575-4575-8575-757575757575', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$select * from public.bootstrap_identity_workspace(
    'Owner Prior Revenue', 'Workspace Prior Revenue',
    array['10000000-0000-4000-8000-000000000001'::uuid, '10000000-0000-4000-8000-000000000002'::uuid]
  )$$,
  'Cria o workspace de teste'
);

select set_config(
  'test.prior_revenue_workspace',
  (select id::text from public.workspaces
    where created_by = '75757575-7575-4575-8575-757575757575'::uuid),
  true
);

reset role;
insert into public.clients (id, workspace_id, kind, name, commercial_status)
values (
  '75757575-0001-4575-8575-757575757575',
  current_setting('test.prior_revenue_workspace')::uuid,
  'company', 'Cliente com histórico anterior', 'active'
);

-- Cobrança paga comum, do fluxo normal: continua protegida.
insert into public.charges (
  id, workspace_id, client_id, description, due_date, company_revenue, status, paid_at, payment_method
) values (
  '75757575-0002-4575-8575-757575757575',
  current_setting('test.prior_revenue_workspace')::uuid,
  '75757575-0001-4575-8575-757575757575',
  'Mensalidade paga pelo fluxo normal', current_date, 500, 'paid', now(), 'Pix'
);

-- Cobrança que replica exatamente o marcador gravado por recordPriorRevenue.
insert into public.charges (
  id, workspace_id, client_id, description, due_date, company_revenue, status, paid_at, payment_method, notes
) values (
  '75757575-0003-4575-8575-757575757575',
  current_setting('test.prior_revenue_workspace')::uuid,
  '75757575-0001-4575-8575-757575757575',
  'Histórico anterior ao sistema', current_date, 12000, 'paid', now(), 'Histórico',
  'Valor consolidado informado no cadastro do cliente.'
);
set local role authenticated;

select results_eq(
  $$select public.delete_workspace_record('charge', '75757575-0002-4575-8575-757575757575')$$,
  $$values ('blocked'::text)$$,
  'Cobrança paga do fluxo normal continua bloqueada'
);

select results_eq(
  $$select public.delete_workspace_record('charge', '75757575-0003-4575-8575-757575757575')$$,
  $$values ('deleted'::text)$$,
  'O resumo de histórico anterior ao sistema pode ser excluído pelo dono'
);

select results_eq(
  $$select count(*) from public.charges
    where id = '75757575-0002-4575-8575-757575757575'::uuid$$,
  array[1::bigint],
  'A cobrança comum permanece intacta após a tentativa bloqueada'
);

select * from finish();
rollback;
