begin;

select plan(17);

create or replace function pg_temp.statement_fails(p_sql text)
returns boolean
language plpgsql
as $$
begin
  execute p_sql;
  return false;
exception
  when others then
    return true;
end;
$$;

insert into auth.users (id, email)
values
  ('12121212-1212-4212-8212-121212121212', 'lifecycle-owner@example.test'),
  ('34343434-3434-4434-8434-343434343434', 'lifecycle-other@example.test');

select set_config('request.jwt.claim.sub', '12121212-1212-4212-8212-121212121212', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$
    select *
    from public.bootstrap_identity_workspace(
      'Responsável pelo ciclo',
      'Workspace do ciclo',
      array[
        '10000000-0000-4000-8000-000000000001'::uuid,
        '10000000-0000-4000-8000-000000000002'::uuid
      ]
    )
  $$,
  'Bootstrap prepara a conta ativa'
);

select results_eq(
  $$select request_type, status, request_created from public.request_current_account_lifecycle('export')$$,
  $$values ('export'::text, 'requested'::text, true)$$,
  'Primeira solicitação de exportação é registrada'
);

select results_eq(
  $$select request_type, status, request_created from public.request_current_account_lifecycle('export')$$,
  $$values ('export'::text, 'requested'::text, false)$$,
  'Solicitação ativa repetida é idempotente'
);

select results_eq(
  $$select request_type, status, request_created from public.request_current_account_lifecycle('deletion')$$,
  $$values ('deletion'::text, 'requested'::text, true)$$,
  'Solicitação de exclusão mantém ciclo separado'
);

select results_eq(
  $$select request_type, status from public.get_current_account_lifecycle_requests() order by request_type$$,
  $$values ('deletion'::text, 'requested'::text), ('export'::text, 'requested'::text)$$,
  'Usuário consulta somente o estado sanitizado dos próprios pedidos'
);

select ok(
  pg_temp.statement_fails($$select * from private.account_lifecycle_requests$$),
  'Authenticated não lê a tabela privada diretamente'
);

select ok(
  pg_temp.statement_fails($$select * from public.request_current_account_lifecycle('unsupported')$$),
  'Tipo de solicitação fora do contrato é rejeitado'
);

reset role;

select results_eq(
  $$
    select profile.account_status, workspace.status
    from public.profiles as profile
    join public.workspaces as workspace on workspace.created_by = profile.id
    where profile.id = '12121212-1212-4212-8212-121212121212'::uuid
  $$,
  $$values ('active'::text, 'active'::text)$$,
  'Registrar pedidos não suspende nem exclui a conta ou o workspace'
);

select results_eq(
  $$select count(*) from private.account_lifecycle_requests$$,
  array[2::bigint],
  'Somente um pedido ativo por tipo foi persistido'
);

select set_config('request.jwt.claim.sub', '34343434-3434-4434-8434-343434343434', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select results_eq(
  $$select count(*) from public.get_current_account_lifecycle_requests()$$,
  array[0::bigint],
  'Outro usuário não vê os pedidos do owner'
);

select ok(
  pg_temp.statement_fails($$select * from public.request_current_account_lifecycle('export')$$),
  'Usuário sem workspace ativo não cria pedido'
);

reset role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);
set local role anon;

select ok(
  pg_temp.statement_fails($$select * from public.get_current_account_lifecycle_requests()$$)
  and pg_temp.statement_fails($$select * from public.request_current_account_lifecycle('export')$$),
  'Anon não executa as RPCs de ciclo de conta'
);

reset role;

select ok(
  has_function_privilege(
    'authenticated',
    'public.request_current_account_lifecycle(text)',
    'EXECUTE'
  )
  and has_function_privilege(
    'authenticated',
    'public.get_current_account_lifecycle_requests()',
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon',
    'public.request_current_account_lifecycle(text)',
    'EXECUTE'
  ),
  'Somente authenticated pode executar a superfície pública'
);

select results_eq(
  $$
    select prosecdef
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname in (
        'get_current_account_lifecycle_requests',
        'request_current_account_lifecycle'
      )
    order by procedure.proname
  $$,
  array[false, false],
  'Wrappers públicos permanecem SECURITY INVOKER'
);

select results_eq(
  $$
    select prosecdef
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'private'
      and procedure.proname in (
        'get_current_account_lifecycle_requests',
        'request_current_account_lifecycle'
      )
    order by procedure.proname
  $$,
  array[true, true],
  'Funções elevadoras permanecem no schema privado'
);

select results_eq(
  $$
    select count(*)
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname in ('public', 'private')
      and procedure.proname like '%account_lifecycle%'
      and 'p_user_id' = any(procedure.proargnames)
  $$,
  array[0::bigint],
  'RPCs não aceitam user_id de terceiro'
);

select results_eq(
  $$
    select count(*)
    from information_schema.columns
    where table_schema = 'private'
      and table_name = 'account_lifecycle_requests'
      and column_name in ('artifact_url', 'download_url', 'payload', 'password')
  $$,
  array[0::bigint],
  'Tabela não armazena URL, payload exportado ou senha'
);

select * from finish();
rollback;
