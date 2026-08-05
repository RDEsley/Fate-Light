begin;

select plan(13);

insert into auth.users (id, email)
values ('73737373-7373-4373-8373-737373737373', 'lifecycle@example.test');

select set_config('request.jwt.claim.sub', '73737373-7373-4373-8373-737373737373', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$select * from public.bootstrap_identity_workspace(
    'Owner Lifecycle', 'Workspace Lifecycle',
    array['10000000-0000-4000-8000-000000000001'::uuid, '10000000-0000-4000-8000-000000000002'::uuid]
  )$$,
  'Cria o workspace de teste'
);

select set_config(
  'test.lifecycle_workspace',
  (select id::text from public.workspaces
    where created_by = '73737373-7373-4373-8373-737373737373'::uuid),
  true
);

reset role;
insert into public.clients (id, workspace_id, kind, name, commercial_status)
values (
  '73737373-0001-4373-8373-737373737373',
  current_setting('test.lifecycle_workspace')::uuid,
  'company', 'Cliente sem histórico', 'active'
), (
  '73737373-0002-4373-8373-737373737373',
  current_setting('test.lifecycle_workspace')::uuid,
  'company', 'Cliente com histórico', 'active'
);
set local role authenticated;

select results_eq(
  $$select public.delete_client_record('73737373-0001-4373-8373-737373737373'::uuid)$$,
  $$values ('deleted'::text)$$,
  'Exclui cliente sem vínculos'
);

reset role;
insert into public.client_services (
  id, workspace_id, client_id, name, billing_type, start_date, next_due_date, status
) values (
  '73737373-1000-4373-8373-737373737373',
  current_setting('test.lifecycle_workspace')::uuid,
  '73737373-0002-4373-8373-737373737373',
  'Serviço anual', 'annual', current_date, current_date + 365, 'active'
);
set local role authenticated;

select results_eq(
  $$select public.delete_client_record('73737373-0002-4373-8373-737373737373'::uuid)$$,
  $$values ('blocked'::text)$$,
  'Bloqueia cliente com serviço vinculado'
);

select results_eq(
  $$select public.delete_workspace_record('service', '73737373-1000-4373-8373-737373737373'::uuid)$$,
  $$values ('blocked'::text)$$,
  'Bloqueia exclusão de serviço ainda ativo'
);

update public.client_services set status = 'ended'
where id = '73737373-1000-4373-8373-737373737373'::uuid;

select results_eq(
  $$select public.delete_workspace_record('service', '73737373-1000-4373-8373-737373737373'::uuid)$$,
  $$values ('deleted'::text)$$,
  'Exclui serviço encerrado sem cobrança'
);

reset role;
insert into public.charges (
  id, workspace_id, client_id, description, due_date, company_revenue, status, paid_at
) values (
  '73737373-2000-4373-8373-737373737373',
  current_setting('test.lifecycle_workspace')::uuid,
  '73737373-0002-4373-8373-737373737373',
  'Cobrança paga', current_date, 100, 'paid', statement_timestamp()
), (
  '73737373-2001-4373-8373-737373737373',
  current_setting('test.lifecycle_workspace')::uuid,
  '73737373-0002-4373-8373-737373737373',
  'Cobrança pendente', current_date, 100, 'pending', null
);
set local role authenticated;

select results_eq(
  $$select public.delete_workspace_record('charge', '73737373-2000-4373-8373-737373737373'::uuid)$$,
  $$values ('blocked'::text)$$,
  'Nunca exclui cobrança paga'
);

select results_eq(
  $$select public.delete_workspace_record('charge', '73737373-2001-4373-8373-737373737373'::uuid)$$,
  $$values ('deleted'::text)$$,
  'Exclui cobrança ainda não confirmada'
);

reset role;
insert into public.expenses (
  id, workspace_id, description, category, amount, due_date, status, paid_at, expense_type
) values (
  '73737373-3000-4373-8373-737373737373',
  current_setting('test.lifecycle_workspace')::uuid,
  'Despesa paga', 'tools', 50, current_date, 'paid', statement_timestamp(), 'fixed'
);
set local role authenticated;

select results_eq(
  $$select public.delete_workspace_record('expense', '73737373-3000-4373-8373-737373737373'::uuid)$$,
  $$values ('blocked'::text)$$,
  'Nunca exclui despesa paga'
);

select throws_ok(
  $$select public.reset_current_workspace_operational_data('errado')$$,
  '22023',
  'invalid confirmation',
  'Exige confirmação exata para limpar o workspace'
);

select lives_ok(
  $$select public.reset_current_workspace_operational_data('EXCLUIR TUDO')$$,
  'Limpa os dados operacionais em uma transação'
);

select results_eq(
  $$select count(*) from public.clients$$,
  array[0::bigint],
  'A limpeza remove os clientes'
);

select results_eq(
  $$select count(*) from public.charges$$,
  array[0::bigint],
  'A limpeza remove inclusive movimentos confirmados após confirmação reforçada'
);

select results_eq(
  $$select count(*) from public.workspaces where id = current_setting('test.lifecycle_workspace')::uuid$$,
  array[1::bigint],
  'A limpeza preserva workspace, conta e configurações'
);

select * from finish();
rollback;
