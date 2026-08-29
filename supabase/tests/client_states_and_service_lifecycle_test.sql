begin;

select plan(12);

insert into auth.users (id, email)
values ('64646464-6464-4646-8646-646464646464', 'lifecycle2@example.test');

select set_config('request.jwt.claim.sub', '64646464-6464-4646-8646-646464646464', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$select * from public.bootstrap_identity_workspace(
    'Owner Promo', 'Workspace Promo',
    array['20000000-0000-4000-8000-000000000001'::uuid, '20000000-0000-4000-8000-000000000002'::uuid]
  )$$,
  'Cria o workspace de teste'
);

select set_config(
  'test.promo_workspace',
  (select id::text from public.workspaces
    where created_by = '64646464-6464-4646-8646-646464646464'::uuid),
  true
);

reset role;
insert into public.clients (id, workspace_id, kind, name, commercial_status)
values (
  '64646464-0001-4646-8646-646464646464',
  current_setting('test.promo_workspace')::uuid,
  'company', 'Cliente em orçamento', 'budget'
), (
  '64646464-0002-4646-8646-646464646464',
  current_setting('test.promo_workspace')::uuid,
  'company', 'Cliente na lista negra', 'blacklist'
);
set local role authenticated;

-- Situações comerciais novas são aceitas pelo cadastro.
select results_eq(
  $$select count(*) from public.clients
    where commercial_status in ('budget', 'blacklist')$$,
  array[2::bigint],
  'Aceita as situações comerciais orçamento e lista negra'
);

-- O bug relatado: valor cheio 1000, promocional 0 e 4 ciclos.
select lives_ok(
  $$select public.apply_service_to_client(
    '64646464-0001-4646-8646-646464646464'::uuid, null,
    'Gestão de tráfego', null,
    1000, 'none', 0, 0, 0, true,
    'monthly', current_date, current_date, 1,
    0, 4, null, null, null
  )$$,
  'Aplica serviço com ciclos promocionais gratuitos'
);

select results_eq(
  $$select company_revenue from public.charges
    where client_id = '64646464-0001-4646-8646-646464646464'::uuid$$,
  array[0::numeric(15,2)],
  'A primeira cobrança usa o valor promocional zerado'
);

-- O serviço avulso alimenta o catálogo do workspace.
select results_eq(
  $$select count(*) from public.services
    where lower(name) = 'gestão de tráfego' and active$$,
  array[1::bigint],
  'O serviço aplicado entra no catálogo'
);

select lives_ok(
  $$select public.apply_service_to_client(
    '64646464-0001-4646-8646-646464646464'::uuid, null,
    'Gestão de tráfego', null,
    1500, 'none', 0, 0, 0, true,
    'monthly', current_date, current_date + 1, 1,
    null, null, null, null, null
  )$$,
  'Aplica novamente o mesmo nome de serviço'
);

select results_eq(
  $$select count(*) from public.services
    where lower(name) = 'gestão de tráfego' and active$$,
  array[1::bigint],
  'Nome repetido reaproveita o serviço do catálogo em vez de duplicar'
);

-- A liquidação avança o ciclo mesmo quando a cobrança é gratuita.
select lives_ok(
  $$select public.settle_charge_and_schedule_next(
    (select id from public.charges
      where client_id = '64646464-0001-4646-8646-646464646464'::uuid
        and company_revenue = 0
      limit 1),
    'Pix'
  )$$,
  'Liquida uma cobrança gratuita e agenda o próximo ciclo'
);

select results_eq(
  $$select promotional_cycles_used from public.client_services
    where client_id = '64646464-0001-4646-8646-646464646464'::uuid
      and promotional_cycles = 4$$,
  array[1::smallint],
  'A promoção conta a partir do primeiro vencimento'
);

-- Pausa preserva o serviço sem exigir encerramento.
select lives_ok(
  $$update public.client_services set status = 'paused'
    where client_id = '64646464-0001-4646-8646-646464646464'::uuid
      and promotional_cycles = 4$$,
  'Permite pausar um serviço sem encerrá-lo'
);

select results_eq(
  $$select count(*) from public.client_services
    where status = 'paused' and ended_at is null$$,
  array[1::bigint],
  'Serviço pausado não recebe data de encerramento'
);

-- Exclusão do catálogo respeita os vínculos existentes.
select results_eq(
  $$select public.delete_catalog_service(
    (select id from public.services where lower(name) = 'gestão de tráfego' limit 1),
    false
  )$$,
  $$values ('blocked'::text)$$,
  'Bloqueia excluir serviço do catálogo em uso por um cliente'
);

select * from finish();
rollback;
