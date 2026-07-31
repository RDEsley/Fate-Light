begin;

select plan(39);

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
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'user-a@example.test'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'user-b@example.test'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'user-c@example.test');

select results_eq(
  $$
    select count(*)::bigint
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname in (
        'profiles',
        'workspaces',
        'workspace_members',
        'workspace_settings',
        'legal_documents',
        'legal_acceptances'
      )
      and relation.relrowsecurity
      and relation.relforcerowsecurity
  $$,
  array[6::bigint],
  'RLS e FORCE RLS estão ativos nas seis tabelas públicas da fase'
);

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$
    select *
    from public.bootstrap_identity_workspace(
      'Usuário A',
      'Workspace A',
      array[
        '10000000-0000-4000-8000-000000000001'::uuid,
        '10000000-0000-4000-8000-000000000002'::uuid
      ]
    )
  $$,
  'Bootstrap cria a identidade do usuário A'
);

reset role;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$
    select *
    from public.bootstrap_identity_workspace(
      'Usuário B',
      'Workspace B',
      array[
        '10000000-0000-4000-8000-000000000001'::uuid,
        '10000000-0000-4000-8000-000000000002'::uuid
      ]
    )
  $$,
  'Bootstrap cria a identidade do usuário B'
);

reset role;

select results_eq(
  $$select count(*) from public.workspaces where created_by = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid$$,
  array[1::bigint],
  'Bootstrap cria exatamente um workspace para o usuário A'
);

select results_eq(
  $$
    select count(*)
    from public.workspace_members as member
    join public.workspaces as workspace on workspace.id = member.workspace_id
    where workspace.created_by = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
      and member.role = 'owner'
      and member.status = 'active'
  $$,
  array[1::bigint],
  'Workspace recebe exatamente um owner ativo'
);

select results_eq(
  $$
    select count(*)
    from public.workspace_settings as settings
    join public.workspaces as workspace on workspace.id = settings.workspace_id
    where workspace.created_by = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
  $$,
  array[1::bigint],
  'Bootstrap cria uma configuração para o workspace'
);

select results_eq(
  $$select count(*) from public.legal_acceptances where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid$$,
  array[2::bigint],
  'Bootstrap registra os dois aceites legais exigidos'
);

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select results_eq(
  $$select count(*) from public.profiles$$,
  array[1::bigint],
  'Usuário A lê o próprio profile'
);

select results_eq(
  $$select count(*) from public.profiles where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid$$,
  array[0::bigint],
  'Usuário A não lê o profile B'
);

select lives_ok(
  $$update public.profiles set full_name = 'Usuário A Atualizado' where id = auth.uid()$$,
  'Usuário A atualiza um campo permitido do próprio profile'
);

select ok(
  pg_temp.statement_fails(
    $$update public.profiles set account_status = 'suspended' where id = auth.uid()$$
  ),
  'Usuário A não altera status administrativo'
);

select results_eq(
  $$select count(*) from public.workspaces$$,
  array[1::bigint],
  'Usuário A acessa o próprio workspace'
);

select results_eq(
  $$select count(*) from public.workspaces where created_by = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid$$,
  array[0::bigint],
  'Usuário A não acessa o workspace B'
);

select ok(
  pg_temp.statement_fails(
    $$
      insert into public.workspace_members (workspace_id, user_id)
      select id, auth.uid()
      from public.workspaces
      where created_by = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid
    $$
  ),
  'Usuário A não cria membership no workspace B'
);

select ok(
  pg_temp.statement_fails(
    $$update public.workspace_members set role = 'owner' where user_id = auth.uid()$$
  ),
  'Usuário A não altera a própria role'
);

reset role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);
set local role anon;

select ok(
  pg_temp.statement_fails($$select * from public.profiles$$),
  'Usuário anônimo não acessa profiles'
);

select ok(
  pg_temp.statement_fails($$select * from public.workspaces$$),
  'Usuário anônimo não acessa workspaces'
);

reset role;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$
    select *
    from public.bootstrap_identity_workspace(
      'Nome repetido não sobrescreve',
      'Workspace repetido não duplica',
      array[
        '10000000-0000-4000-8000-000000000001'::uuid,
        '10000000-0000-4000-8000-000000000002'::uuid
      ]
    )
  $$,
  'Bootstrap pode ser executado novamente'
);

reset role;

select results_eq(
  $$
    select
      (select count(*) from public.profiles where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid),
      (select count(*) from public.workspaces where created_by = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid),
      (select count(*) from public.workspace_members where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid),
      (select count(*) from public.legal_acceptances where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid)
  $$,
  $$values (1::bigint, 1::bigint, 1::bigint, 2::bigint)$$,
  'Bootstrap idempotente não duplica registros'
);

select results_eq(
  $$
    select count(*)
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname in ('public', 'private')
      and procedure.proname = 'bootstrap_identity_workspace'
      and 'p_user_id' = any(procedure.proargnames)
  $$,
  array[0::bigint],
  'Bootstrap não aceita user_id de terceiro'
);

update public.workspaces
set status = 'suspended'
where created_by = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select results_eq(
  $$select count(*) from public.workspaces$$,
  array[0::bigint],
  'Workspace suspenso bloqueia acesso ao tenant'
);

reset role;
update public.workspaces
set status = 'active'
where created_by = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid;

update public.profiles
set account_status = 'suspended'
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select results_eq(
  $$select count(*) from public.profiles$$,
  array[0::bigint],
  'Usuário suspenso não acessa o próprio profile nem o tenant'
);

reset role;

select results_eq(
  $$
    select count(*)
    from public.legal_acceptances as acceptance
    join public.legal_documents as document
      on document.id = acceptance.legal_document_id
     and document.version = acceptance.document_version
    where acceptance.user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
  $$,
  array[2::bigint],
  'Aceite legal preserva documento e versão verificáveis'
);

select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select ok(
  pg_temp.statement_fails(
    $$update public.legal_acceptances set accepted_at = statement_timestamp() where user_id = auth.uid()$$
  ),
  'Datas de aceite são imutáveis para o cliente'
);

select ok(
  pg_temp.statement_fails(
    $$
      update public.workspace_settings
      set workspace_id = '00000000-0000-4000-8000-000000000099'::uuid
    $$
  ),
  'Tentativa de manipular workspace_id falha'
);

reset role;

select ok(
  has_column_privilege('authenticated', 'public.profiles', 'full_name', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.profiles', 'account_status', 'UPDATE')
  and has_column_privilege('authenticated', 'public.workspaces', 'name', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.workspaces', 'status', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.workspace_members', 'INSERT')
  and not has_table_privilege('authenticated', 'public.workspace_members', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.workspace_members', 'DELETE'),
  'Grants de authenticated não excedem campos e operações previstos'
);

select ok(
  not has_table_privilege('anon', 'public.profiles', 'SELECT')
  and not has_table_privilege('anon', 'public.workspaces', 'SELECT')
  and not has_table_privilege('anon', 'public.workspace_members', 'SELECT')
  and not has_table_privilege('anon', 'public.workspace_settings', 'SELECT')
  and not has_table_privilege('anon', 'public.legal_documents', 'SELECT')
  and not has_table_privilege('anon', 'public.legal_acceptances', 'SELECT'),
  'Anon não recebe grants nas tabelas da fase'
);

select ok(
  pg_temp.statement_fails(
    $$
      insert into public.workspaces (name, created_by)
      values ('Workspace A duplicado', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid)
    $$
  ),
  'Constraint impede dois workspaces para o mesmo usuário'
);

select ok(
  pg_temp.statement_fails(
    format(
      'insert into public.workspace_members (workspace_id, user_id) values (%L::uuid, %L::uuid)',
      (select id from public.workspaces where created_by = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid),
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
    )
  ),
  'Constraint impede dois owners ativos no mesmo workspace'
);

select set_config('request.jwt.claim.sub', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select results_eq(
  $$select count(*) from public.legal_documents$$,
  array[2::bigint],
  'Usuário autenticado pré-bootstrap lê documentos legais vigentes'
);

reset role;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select results_eq(
  $$select count(*) from public.legal_documents$$,
  array[0::bigint],
  'Usuário suspenso não lê documentos legais'
);

reset role;
update public.profiles
set account_status = 'active'
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select results_eq(
  $$
    select count(*)
    from public.workspace_settings as settings
    join public.workspaces as workspace on workspace.id = settings.workspace_id
    where workspace.created_by = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid
  $$,
  array[0::bigint],
  'Usuário A não lê settings do workspace B'
);

reset role;

select results_eq(
  $$
    select count(*)
    from private.identity_bootstrap_audit_events
    where actor_user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
  $$,
  array[2::bigint],
  'Bootstrap registra criação e repetição na auditoria privada'
);

select results_eq(
  $$
    select count(*)
    from pg_catalog.pg_trigger as trigger
    join pg_catalog.pg_class as relation on relation.oid = trigger.tgrelid
    join pg_catalog.pg_namespace as relation_namespace on relation_namespace.oid = relation.relnamespace
    join pg_catalog.pg_proc as procedure on procedure.oid = trigger.tgfoid
    join pg_catalog.pg_namespace as procedure_namespace on procedure_namespace.oid = procedure.pronamespace
    where relation_namespace.nspname = 'auth'
      and relation.relname = 'users'
      and procedure_namespace.nspname in ('public', 'private')
      and not trigger.tgisinternal
  $$,
  array[0::bigint],
  'Nenhum trigger de domínio foi criado em auth.users'
);

select results_eq(
  $$select count(*) from storage.buckets where id in ('avatars', 'profile-avatars')$$,
  array[0::bigint],
  'Nenhum bucket de avatar foi criado'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.bootstrap_identity_workspace(text,text,uuid[],text,text,text,text,text,text,text,text,text,text,smallint[])',
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon',
    'public.bootstrap_identity_workspace(text,text,uuid[],text,text,text,text,text,text,text,text,text,text,smallint[])',
    'EXECUTE'
  ),
  'RPC pública pode ser executada somente por authenticated'
);

select results_eq(
  $$
    select prosecdef
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = 'bootstrap_identity_workspace'
  $$,
  array[false],
  'Wrapper público é SECURITY INVOKER'
);

select results_eq(
  $$
    select prosecdef
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'private'
      and procedure.proname = 'bootstrap_identity_workspace'
  $$,
  array[true],
  'Função elevadora permanece no schema privado como SECURITY DEFINER'
);

select ok(
  has_column_privilege('authenticated', 'public.workspace_settings', 'legal_name', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.workspace_settings', 'workspace_id', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.legal_acceptances', 'INSERT')
  and not has_table_privilege('authenticated', 'public.legal_acceptances', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.legal_documents', 'UPDATE'),
  'Campos de ownership e histórico legal não recebem grants de escrita'
);

select * from finish();
rollback;
