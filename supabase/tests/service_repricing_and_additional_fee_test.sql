begin;

select plan(8);

insert into auth.users (id, email)
values ('85858585-8585-4585-8585-858585858585', 'repricing@example.test');

select set_config('request.jwt.claim.sub', '85858585-8585-4585-8585-858585858585', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$select * from public.bootstrap_identity_workspace(
    'Owner Repricing', 'Workspace Repricing',
    array['20000000-0000-4000-8000-000000000001'::uuid, '20000000-0000-4000-8000-000000000002'::uuid]
  )$$,
  'Cria o workspace de teste'
);

select set_config(
  'test.repricing_workspace',
  (select id::text from public.workspaces
    where created_by = '85858585-8585-4585-8585-858585858585'::uuid),
  true
);

reset role;
insert into public.clients (id, workspace_id, kind, name, commercial_status)
values (
  '85858585-0001-4585-8585-858585858585',
  current_setting('test.repricing_workspace')::uuid,
  'company', 'Cliente do parcelamento', 'active'
);
set local role authenticated;

-- Parcelado: R$ 1.500 em 3 parcelas de R$ 500.
select lives_ok(
  $$select public.apply_service_to_client(
    '85858585-0001-4585-8585-858585858585'::uuid, null,
    'Site institucional', null,
    1500, 'none', 0, 0, 0, true,
    'single', current_date, current_date, 3,
    null, null, null, null, null
  )$$,
  'Aplica um serviço parcelado em três vezes'
);

select set_config(
  'test.repricing_service',
  (select id::text from public.client_services
    where client_id = '85858585-0001-4585-8585-858585858585'::uuid limit 1),
  true
);

select results_eq(
  $$select sum(company_revenue) from public.charges
    where client_service_id = current_setting('test.repricing_service')::uuid$$,
  array[1500::numeric],
  'As três parcelas somam o valor total do serviço'
);

-- Editar o serviço sem mudar o preço não pode inflar as parcelas pendentes: era esse o
-- bug — um UPDATE único jogava o valor cheio em cada pendente e triplicava a dívida.
select results_eq(
  $$select public.update_client_service(
    current_setting('test.repricing_service')::uuid,
    'Site institucional renomeado', null,
    1500, 'none', 0, 0, 0, true,
    'single', current_date,
    null, null, null, null, null
  )$$,
  $$values ('updated'::text)$$,
  'Edita o serviço parcelado'
);

select results_eq(
  $$select sum(company_revenue) from public.charges
    where client_service_id = current_setting('test.repricing_service')::uuid$$,
  array[1500::numeric],
  'O total das parcelas continua igual depois da edição'
);

-- Recorrente com promoção gratuita: a pendente promocional não pode subir para o cheio.
reset role;
insert into public.clients (id, workspace_id, kind, name, commercial_status)
values (
  '85858585-0002-4585-8585-858585858585',
  current_setting('test.repricing_workspace')::uuid,
  'company', 'Cliente da promoção', 'active'
);
set local role authenticated;

select lives_ok(
  $$select public.apply_service_to_client(
    '85858585-0002-4585-8585-858585858585'::uuid, null,
    'Gestão promocional', null,
    1000, 'none', 0, 0, 0, true,
    'monthly', current_date, current_date, 1,
    0, 4, null, null, null
  )$$,
  'Aplica um serviço com quatro ciclos gratuitos'
);

select set_config(
  'test.promo_service',
  (select id::text from public.client_services
    where client_id = '85858585-0002-4585-8585-858585858585'::uuid limit 1),
  true
);

select lives_ok(
  $$select public.update_client_service(
    current_setting('test.promo_service')::uuid,
    'Gestão promocional', null,
    1000, 'none', 0, 0, 0, true,
    'monthly', current_date,
    0, 4, null, null, null
  )$$,
  'Edita o serviço mantendo a promoção'
);

select results_eq(
  $$select company_revenue from public.charges
    where client_service_id = current_setting('test.promo_service')::uuid
      and status = 'pending'$$,
  array[0::numeric(15,2)],
  'A cobrança do ciclo promocional segue gratuita depois da edição'
);

select * from finish();
rollback;
