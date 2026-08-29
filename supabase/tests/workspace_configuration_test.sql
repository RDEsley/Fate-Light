begin;

select plan(9);

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
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'workspace-owner@example.test'),
  ('ffffffff-ffff-4fff-8fff-ffffffffffff', 'workspace-outsider@example.test');

select set_config('request.jwt.claim.sub', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$
    select *
    from public.bootstrap_identity_workspace(
      'Responsável Inicial',
      'Empresa Inicial',
      array[
        '20000000-0000-4000-8000-000000000001'::uuid,
        '20000000-0000-4000-8000-000000000002'::uuid
      ]
    )
  $$,
  'Bootstrap prepara o workspace do owner'
);

select lives_ok(
  $$
    select *
    from public.update_current_workspace_configuration(
      'Empresa Atualizada',
      'America/Recife',
      'Empresa Atualizada LTDA',
      'Marca Atualizada',
      '12.345.678/0001-95',
      'Rua Exemplo, 100',
      'Sala 8',
      'Centro',
      'Recife',
      'pe',
      '50000-000',
      'BR',
      'YYYY-MM-DD',
      'accrual',
      array[60, 15, 3]::smallint[]
    )
  $$,
  'Owner ativo atualiza workspace e settings pela RPC'
);

reset role;

select results_eq(
  $$
    select
      workspace.name,
      workspace.timezone,
      settings.legal_name,
      settings.trade_name,
      settings.tax_id,
      settings.address_city,
      settings.address_region,
      settings.country_code,
      settings.date_format,
      settings.accounting_basis,
      settings.default_alert_offsets
    from public.workspaces as workspace
    join public.workspace_settings as settings on settings.workspace_id = workspace.id
    where workspace.created_by = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'::uuid
  $$,
  $$values (
    'Empresa Atualizada'::text,
    'America/Recife'::text,
    'Empresa Atualizada LTDA'::text,
    'Marca Atualizada'::text,
    '12345678000195'::text,
    'Recife'::text,
    'PE'::text,
    'BR'::text,
    'YYYY-MM-DD'::text,
    'accrual'::text,
    array[60, 15, 3]::smallint[]
  )$$,
  'RPC normaliza e persiste todos os campos permitidos'
);

select set_config('request.jwt.claim.sub', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', true);
set local role authenticated;

select ok(
  pg_temp.statement_fails(
    $$
      select *
      from public.update_current_workspace_configuration(
        'Nome que deve reverter',
        'Timezone/Invalido',
        'Empresa Atualizada LTDA',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        'BR',
        'DD/MM/YYYY',
        'cash',
        array[30, 7]::smallint[]
      )
    $$
  ),
  'Timezone inválido rejeita a operação composta'
);

reset role;

select results_eq(
  $$
    select name
    from public.workspaces
    where created_by = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'::uuid
  $$,
  array['Empresa Atualizada'::text],
  'Falha na operação reverte também a alteração do workspace'
);

select set_config('request.jwt.claim.sub', 'ffffffff-ffff-4fff-8fff-ffffffffffff', true);
set local role authenticated;

select ok(
  pg_temp.statement_fails(
    $$
      select *
      from public.update_current_workspace_configuration(
        'Tentativa Externa',
        'America/Sao_Paulo',
        'Tentativa Externa LTDA',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        'BR',
        'DD/MM/YYYY',
        'cash',
        array[30, 7]::smallint[]
      )
    $$
  ),
  'Usuário sem workspace ativo não atualiza configuração'
);

reset role;

select results_eq(
  $$
    select prosecdef
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = 'update_current_workspace_configuration'
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
      and procedure.proname = 'update_current_workspace_configuration'
  $$,
  array[true],
  'Função elevadora permanece no schema privado'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.update_current_workspace_configuration(text,text,text,text,text,text,text,text,text,text,text,text,text,text,smallint[])',
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon',
    'public.update_current_workspace_configuration(text,text,text,text,text,text,text,text,text,text,text,text,text,text,smallint[])',
    'EXECUTE'
  ),
  'RPC é executável somente por authenticated'
);

select * from finish();
rollback;
