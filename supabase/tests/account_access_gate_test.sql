begin;

select plan(8);

insert into auth.users (id, email)
values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'account-gate@example.test');

select ok(
  has_function_privilege(
    'authenticated',
    'public.get_current_account_gate()',
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon',
    'public.get_current_account_gate()',
    'EXECUTE'
  ),
  'Somente authenticated pode executar o gate de conta'
);

select set_config('request.jwt.claim.sub', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select results_eq(
  $$select * from public.get_current_account_gate()$$,
  $$values (false, null::text, false, null::text)$$,
  'Usuário autenticado sem bootstrap recebe somente o estado mínimo'
);

select lives_ok(
  $$
    select *
    from public.bootstrap_identity_workspace(
      'Usuário do Gate',
      'Workspace do Gate',
      array[
        '10000000-0000-4000-8000-000000000001'::uuid,
        '10000000-0000-4000-8000-000000000002'::uuid
      ]
    )
  $$,
  'Bootstrap prepara a conta usada pelo gate'
);

select results_eq(
  $$select * from public.get_current_account_gate()$$,
  $$values (true, 'active'::text, true, 'active'::text)$$,
  'Gate reconhece perfil e workspace ativos'
);

reset role;

select results_eq(
  $$
    select prosecdef
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = 'get_current_account_gate'
  $$,
  array[false],
  'Wrapper público permanece SECURITY INVOKER'
);

select results_eq(
  $$
    select prosecdef
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'private'
      and procedure.proname = 'get_current_account_gate'
  $$,
  array[true],
  'Leitura elevadora permanece no schema privado'
);

update public.profiles
set account_status = 'suspended'
where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'::uuid;

set local role authenticated;

select results_eq(
  $$select * from public.get_current_account_gate()$$,
  $$values (true, 'suspended'::text, true, 'active'::text)$$,
  'Gate informa suspensão sem expor os dados do perfil'
);

reset role;
update public.profiles
set account_status = 'active'
where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'::uuid;

update public.workspaces
set status = 'suspended'
where created_by = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'::uuid;

set local role authenticated;

select results_eq(
  $$select * from public.get_current_account_gate()$$,
  $$values (true, 'active'::text, true, 'suspended'::text)$$,
  'Gate informa suspensão do workspace sem abrir o tenant'
);

select * from finish();
rollback;
