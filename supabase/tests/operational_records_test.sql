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
  ('45454545-4545-4454-8454-454545454545', 'operations-a@example.test'),
  ('67676767-6767-4676-8676-676767676767', 'operations-b@example.test');

select results_eq(
  $$
    select count(*)
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname in (
        'clients',
        'client_contacts',
        'services',
        'vendors',
        'expense_categories',
        'audit_events'
      )
      and relation.relrowsecurity
      and relation.relforcerowsecurity
  $$,
  array[6::bigint],
  'RLS e FORCE RLS protegem todas as tabelas da Fase 4'
);

select results_eq(
  $$
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clients'
      and column_name in ('balance', 'revenue', 'financial_status', 'overdue_amount')
  $$,
  array[0::bigint],
  'Clientes não armazenam situação ou agregados financeiros derivados'
);

select set_config('request.jwt.claim.sub', '45454545-4545-4454-8454-454545454545', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$
    select *
    from public.bootstrap_identity_workspace(
      'Owner Operacional A',
      'Workspace Operacional A',
      array[
        '20000000-0000-4000-8000-000000000001'::uuid,
        '20000000-0000-4000-8000-000000000002'::uuid
      ]
    )
  $$,
  'Bootstrap prepara o workspace A'
);

reset role;
select set_config('request.jwt.claim.sub', '67676767-6767-4676-8676-676767676767', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$
    select *
    from public.bootstrap_identity_workspace(
      'Owner Operacional B',
      'Workspace Operacional B',
      array[
        '20000000-0000-4000-8000-000000000001'::uuid,
        '20000000-0000-4000-8000-000000000002'::uuid
      ]
    )
  $$,
  'Bootstrap prepara o workspace B'
);

reset role;
select set_config(
  'test.workspace_a',
  (select id::text from public.workspaces where created_by = '45454545-4545-4454-8454-454545454545'::uuid),
  true
);
select set_config(
  'test.workspace_b',
  (select id::text from public.workspaces where created_by = '67676767-6767-4676-8676-676767676767'::uuid),
  true
);
select set_config('request.jwt.claim.sub', '45454545-4545-4454-8454-454545454545', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$
    insert into public.clients (
      workspace_id,
      kind,
      name,
      trade_name,
      tax_id,
      address_json,
      commercial_status,
      notes,
      tags,
      responsible_name
    )
    values (
      current_setting('test.workspace_a')::uuid,
      'company',
      'Cliente Fictício A',
      'Cliente A',
      '12345678000195',
      '{"city":"Recife","region":"PE","country_code":"BR"}'::jsonb,
      'active',
      'Registro exclusivamente fictício.',
      array['prioridade', 'mensal'],
      'Responsável A'
    )
  $$,
  'Owner A cria cliente no próprio workspace'
);

select lives_ok(
  $$
    insert into public.client_contacts (
      workspace_id,
      client_id,
      name,
      email,
      role,
      is_primary
    )
    select workspace_id, id, 'Contato Fictício', 'contato-a@example.test', 'Financeiro', true
    from public.clients
    where name = 'Cliente Fictício A'
  $$,
  'Owner A cria contato vinculado ao cliente'
);

select lives_ok(
  $$
    insert into public.services (
      workspace_id,
      name,
      description,
      default_component_kind,
      default_financial_nature
    )
    values (
      current_setting('test.workspace_a')::uuid,
      'Gestão Fictícia',
      'Serviço de desenvolvimento.',
      'service',
      'company_revenue'
    )
  $$,
  'Owner A cria serviço no próprio catálogo'
);

select lives_ok(
  $$
    insert into public.vendors (workspace_id, name, tax_id, contact_json, notes)
    values (
      current_setting('test.workspace_a')::uuid,
      'Fornecedor Fictício',
      null,
      '{"name":"Contato Fornecedor","email":"fornecedor@example.test"}'::jsonb,
      'Sem dados reais.'
    )
  $$,
  'Owner A cria fornecedor no próprio workspace'
);

select lives_ok(
  $$
    insert into public.expense_categories (workspace_id, name, default_nature, color)
    values (
      current_setting('test.workspace_a')::uuid,
      'Ferramentas Fictícias',
      'operating_expense',
      '#2563EB'
    )
  $$,
  'Owner A cria categoria gerencial'
);

select results_eq(
  $$select count(*) from public.audit_events$$,
  array[5::bigint],
  'Cada criação operacional gera evento transacional'
);

select ok(
  not exists (
    select 1
    from public.audit_events
    where before_json is not null or after_json is not null
  )
  and not exists (
    select 1
    from public.audit_events
    where array_to_string(changed_fields, ',') like '%12345678000195%'
  ),
  'Auditoria não copia snapshots nem valores pessoais'
);

select results_eq(
  $$
    select
      (select count(*) from public.clients),
      (select count(*) from public.client_contacts),
      (select count(*) from public.services),
      (select count(*) from public.vendors),
      (select count(*) from public.expense_categories)
  $$,
  $$values (1::bigint, 1::bigint, 1::bigint, 1::bigint, 1::bigint)$$,
  'Owner A lê somente seus cadastros'
);

select ok(
  pg_temp.statement_fails(
    format(
      'insert into public.clients (workspace_id,kind,name) values (%L::uuid,''company'',''Tentativa cruzada'')',
      current_setting('test.workspace_b')
    )
  ),
  'RLS impede criação no workspace B'
);

select ok(
  pg_temp.statement_fails(
    $$
      insert into public.clients (workspace_id, kind, name, tags)
      values (
        current_setting('test.workspace_a')::uuid,
        'person',
        'Tags inválidas',
        array['duplicada', 'DUPLICADA']
      )
    $$
  ),
  'Tags duplicadas sem diferença de caixa são rejeitadas'
);

select ok(
  pg_temp.statement_fails(
    $$
      insert into public.clients (workspace_id, kind, name, address_json)
      values (
        current_setting('test.workspace_a')::uuid,
        'person',
        'Endereço inválido',
        '{"password":"nunca"}'::jsonb
      )
    $$
  ),
  'Endereço rejeita chaves fora da allowlist'
);

select ok(
  pg_temp.statement_fails(
    $$
      insert into public.client_contacts (workspace_id, client_id, name)
      select workspace_id, id, 'Sem canal'
      from public.clients
      where name = 'Cliente Fictício A'
    $$
  ),
  'Contato exige ao menos e-mail ou telefone'
);

select ok(
  pg_temp.statement_fails(
    $$
      insert into public.client_contacts (
        workspace_id,
        client_id,
        name,
        phone,
        is_primary
      )
      select workspace_id, id, 'Outro principal', '81999999999', true
      from public.clients
      where name = 'Cliente Fictício A'
    $$
  ),
  'Cliente possui no máximo um contato principal ativo'
);

select ok(
  pg_temp.statement_fails(
    $$
      insert into public.services (workspace_id, name)
      values (current_setting('test.workspace_a')::uuid, 'GESTÃO FICTÍCIA')
    $$
  ),
  'Serviço ativo possui nome único sem diferença de caixa'
);

select ok(
  pg_temp.statement_fails(
    $$
      insert into public.expense_categories (workspace_id, name)
      values (current_setting('test.workspace_a')::uuid, 'FERRAMENTAS FICTÍCIAS')
    $$
  ),
  'Categoria ativa possui nome único sem diferença de caixa'
);

select ok(
  pg_temp.statement_fails(
    $$
      insert into public.vendors (workspace_id, name, contact_json)
      values (
        current_setting('test.workspace_a')::uuid,
        'Contato inválido',
        '{"credential":"nunca"}'::jsonb
      )
    $$
  ),
  'Contato de fornecedor rejeita chaves não permitidas'
);

select lives_ok(
  $$
    update public.clients
    set name = 'Cliente Fictício Atualizado'
    where name = 'Cliente Fictício A'
  $$,
  'Owner atualiza campos permitidos do cliente'
);

select results_eq(
  $$
    select created_by, updated_by
    from public.clients
    where name = 'Cliente Fictício Atualizado'
  $$,
  $$values (
    '45454545-4545-4454-8454-454545454545'::uuid,
    '45454545-4545-4454-8454-454545454545'::uuid
  )$$,
  'Banco deriva autoria da identidade autenticada'
);

select lives_ok(
  $$
    update public.clients
    set commercial_status = 'archived', archived_at = statement_timestamp()
    where name = 'Cliente Fictício Atualizado'
  $$,
  'Cliente é arquivado sem exclusão física'
);

select results_eq(
  $$
    select
      (select count(*) from public.clients where archived_at is not null),
      (select count(*) from public.client_contacts),
      (select count(*) from public.audit_events where action = 'client.archived')
  $$,
  $$values (1::bigint, 1::bigint, 1::bigint)$$,
  'Arquivamento preserva cliente, contato e evento'
);

select ok(
  pg_temp.statement_fails($$delete from public.clients where archived_at is not null$$),
  'Aplicação não recebe exclusão física de cliente'
);

select ok(
  pg_temp.statement_fails(
    $$update public.clients set workspace_id = current_setting('test.workspace_b')::uuid$$
  ),
  'Workspace do cadastro não é editável'
);

select ok(
  pg_temp.statement_fails(
    $$update public.clients set created_by = '67676767-6767-4676-8676-676767676767'::uuid$$
  ),
  'Autoria de criação não é editável'
);

select ok(
  pg_temp.statement_fails(
    $$
      insert into public.audit_events (
        workspace_id,
        actor_user_id,
        action,
        entity_type,
        entity_id,
        changed_fields
      )
      values (
        current_setting('test.workspace_a')::uuid,
        auth.uid(),
        'client.updated',
        'client',
        gen_random_uuid(),
        array['name']
      )
    $$
  ),
  'Aplicação não insere eventos de auditoria diretamente'
);

reset role;
select set_config(
  'test.client_a',
  (select id::text from public.clients where workspace_id = current_setting('test.workspace_a')::uuid),
  true
);
select set_config('request.jwt.claim.sub', '67676767-6767-4676-8676-676767676767', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$
    insert into public.clients (workspace_id, kind, name)
    values (current_setting('test.workspace_b')::uuid, 'person', 'Cliente Fictício B')
  $$,
  'Owner B cria o próprio cliente'
);

select results_eq(
  $$
    select
      (select count(*) from public.clients),
      (select count(*) from public.client_contacts),
      (select count(*) from public.services),
      (select count(*) from public.vendors),
      (select count(*) from public.expense_categories),
      (select count(*) from public.audit_events)
  $$,
  $$values (1::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 1::bigint)$$,
  'Owner B não lê cadastros nem auditoria do workspace A'
);

reset role;
select set_config(
  'test.client_b',
  (select id::text from public.clients where workspace_id = current_setting('test.workspace_b')::uuid),
  true
);
select set_config('request.jwt.claim.sub', '45454545-4545-4454-8454-454545454545', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select ok(
  pg_temp.statement_fails(
    format(
      'insert into public.client_contacts (workspace_id,client_id,name,phone) values (%L::uuid,%L::uuid,''Contato cruzado'',''81999999999'')',
      current_setting('test.workspace_a'),
      current_setting('test.client_b')
    )
  ),
  'FK composta impede contato ligado a cliente de outro workspace'
);

update public.profiles
set account_status = 'suspended'
where id = '67676767-6767-4676-8676-676767676767'::uuid;

set local role authenticated;
select set_config('request.jwt.claim.sub', '67676767-6767-4676-8676-676767676767', true);

select results_eq(
  $$select count(*) from public.clients$$,
  array[0::bigint],
  'Usuário suspenso não lê cadastros'
);

select ok(
  pg_temp.statement_fails(
    $$
      insert into public.clients (workspace_id, kind, name)
      values (current_setting('test.workspace_b')::uuid, 'person', 'Bloqueado')
    $$
  ),
  'Usuário suspenso não cria cadastros'
);

reset role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);
set local role anon;

select ok(
  pg_temp.statement_fails($$select * from public.clients$$)
  and pg_temp.statement_fails($$select * from public.audit_events$$),
  'Anon não acessa cadastros nem auditoria'
);

reset role;

select ok(
  has_column_privilege('authenticated', 'public.clients', 'name', 'INSERT')
  and has_column_privilege('authenticated', 'public.clients', 'name', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.clients', 'workspace_id', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.clients', 'created_by', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.clients', 'DELETE'),
  'Grants de cliente cobrem somente operações e colunas permitidas'
);

select ok(
  has_table_privilege('authenticated', 'public.audit_events', 'SELECT')
  and not has_table_privilege('authenticated', 'public.audit_events', 'INSERT')
  and not has_table_privilege('authenticated', 'public.audit_events', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.audit_events', 'DELETE'),
  'Auditoria é somente leitura para authenticated'
);

select results_eq(
  $$
    select count(*)
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename in (
        'clients',
        'client_contacts',
        'services',
        'vendors',
        'expense_categories',
        'audit_events'
      )
      and cmd = 'DELETE'
  $$,
  array[0::bigint],
  'Nenhuma policy de DELETE foi criada para a fase'
);

select results_eq(
  $$
    select prosecdef
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'private'
      and procedure.proname = 'audit_operational_change'
  $$,
  array[true],
  'Função elevadora de auditoria permanece privada'
);

select results_eq(
  $$
    select count(*)
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = 'audit_operational_change'
  $$,
  array[0::bigint],
  'Nenhuma função elevadora de auditoria é exposta no schema público'
);

select * from finish();
rollback;
