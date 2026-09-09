begin;

select plan(17);

insert into auth.users (id, email)
values ('83838383-8383-4838-8838-838383838383', 'expense-recurrence@example.test');

select set_config('request.jwt.claim.sub', '83838383-8383-4838-8838-838383838383', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$select * from public.bootstrap_identity_workspace(
    'Owner Expense Recurrence', 'Workspace Expense Recurrence',
    array['20000000-0000-4000-8000-000000000001'::uuid, '20000000-0000-4000-8000-000000000002'::uuid]
  )$$,
  'Cria o workspace de teste'
);

select set_config(
  'test.recurrence_workspace',
  (select id::text from public.workspaces
    where created_by = '83838383-8383-4838-8838-838383838383'::uuid),
  true
);

-- Legado: despesa fixa sem recorrência permanece inerte.
reset role;
insert into public.expenses (
  id, workspace_id, description, category, amount, due_date, expense_type, status
) values (
  '83838383-0001-4838-8838-838383838383',
  current_setting('test.recurrence_workspace')::uuid,
  'Aluguel legado', 'other', 1000, current_date, 'fixed', 'pending'
);

select results_eq(
  $$select recurrence_active, recurrence_group_id is null
    from public.expenses
    where id = '83838383-0001-4838-8838-838383838383'::uuid$$,
  $$values (false, true)$$,
  'Despesa fixa legada nasce sem recorrência'
);

select set_config('request.jwt.claim.sub', '83838383-8383-4838-8838-838383838383', true);
set local role authenticated;

select results_eq(
  $$select public.settle_expense_and_schedule_next(
    '83838383-0001-4838-8838-838383838383'::uuid
  ) ->> 'scheduled'$$,
  $$values ('false'::text)$$,
  'Liquidar legado não agenda próxima ocorrência'
);

select results_eq(
  $$select count(*) from public.expenses
    where workspace_id = current_setting('test.recurrence_workspace')::uuid$$,
  array[1::bigint],
  'Após liquidar legado permanece uma única despesa'
);

-- Cria fixa já paga com recorrência: gera a próxima na mesma transação.
select results_eq(
  $$select public.create_expense_with_recurrence(
    'Hospedagem mensal', 'hosting', 199.90, date '2026-01-31',
    'fixed', 'paid', null, null, true
  ) ->> 'status'$$,
  $$values ('created'::text)$$,
  'Cria despesa fixa paga com recorrência'
);

select set_config(
  'test.recurrence_group',
  (
    select recurrence_group_id::text
    from public.expenses
    where workspace_id = current_setting('test.recurrence_workspace')::uuid
      and description = 'Hospedagem mensal'
      and recurrence_sequence = 1
  ),
  true
);

select results_eq(
  $$select due_date::text, status, recurrence_sequence
    from public.expenses
    where recurrence_group_id = current_setting('test.recurrence_group')::uuid
    order by recurrence_sequence$$,
  $$values
    ('2026-01-31'::text, 'paid'::text, 1),
    ('2026-02-28'::text, 'pending'::text, 2)
  $$,
  'Já paga cria próxima ocorrência com dia clampado (31→28)'
);

select set_config(
  'test.next_expense',
  (
    select id::text
    from public.expenses
    where recurrence_group_id = current_setting('test.recurrence_group')::uuid
      and recurrence_sequence = 2
  ),
  true
);

-- Liquidar a pendente agenda março; segunda chamada é idempotente.
select results_eq(
  $$select public.settle_expense_and_schedule_next(
    current_setting('test.next_expense')::uuid
  ) ->> 'scheduled'$$,
  $$values ('true'::text)$$,
  'Liquidar ocorrência pendente agenda o próximo mês'
);

select results_eq(
  $$select due_date::text, status, recurrence_sequence
    from public.expenses
    where recurrence_group_id = current_setting('test.recurrence_group')::uuid
    order by recurrence_sequence$$,
  $$values
    ('2026-01-31'::text, 'paid'::text, 1),
    ('2026-02-28'::text, 'paid'::text, 2),
    ('2026-03-28'::text, 'pending'::text, 3)
  $$,
  'Série avança para março mantendo o dia clampado'
);

select results_eq(
  $$select public.settle_expense_and_schedule_next(
    current_setting('test.next_expense')::uuid
  ) ->> 'status'$$,
  $$values ('already_settled'::text)$$,
  'Retry da liquidação retorna already_settled sem reagendar'
);

select results_eq(
  $$select count(*) from public.expenses
    where recurrence_group_id = current_setting('test.recurrence_group')::uuid$$,
  array[3::bigint],
  'Após retry a série continua com três ocorrências'
);

-- Variável com recorrência é rejeitada.
select throws_ok(
  $$select public.create_expense_with_recurrence(
    'Compra avulsa', 'tools', 50, current_date,
    'variable', 'pending', null, null, true
  )$$,
  '23514',
  'only fixed expenses can recur',
  'Despesa variável não aceita recorrência'
);

-- Variável sem recorrência liquida sem agendar.
select results_eq(
  $$select public.create_expense_with_recurrence(
    'Compra avulsa', 'tools', 50, current_date,
    'variable', 'pending', null, null, false
  ) ->> 'status'$$,
  $$values ('created'::text)$$,
  'Cria despesa variável sem recorrência'
);

select set_config(
  'test.variable_expense',
  (
    select id::text from public.expenses
    where description = 'Compra avulsa'
      and workspace_id = current_setting('test.recurrence_workspace')::uuid
  ),
  true
);

select results_eq(
  $$select public.settle_expense_and_schedule_next(
    current_setting('test.variable_expense')::uuid
  ) ->> 'scheduled'$$,
  $$values ('false'::text)$$,
  'Variável paga não agenda próxima ocorrência'
);

select results_eq(
  $$select status from public.expenses
    where id = current_setting('test.variable_expense')::uuid$$,
  $$values ('paid'::text)$$,
  'Variável fica marcada como paga após settle'
);

-- Parar a série impede novo agendamento a partir da pendente.
select set_config(
  'test.march_expense',
  (
    select id::text
    from public.expenses
    where recurrence_group_id = current_setting('test.recurrence_group')::uuid
      and recurrence_sequence = 3
  ),
  true
);

select results_eq(
  $$select public.stop_expense_recurrence(
    current_setting('test.march_expense')::uuid
  ) ->> 'status'$$,
  $$values ('stopped'::text)$$,
  'Owner encerra a recorrência da série'
);

select results_eq(
  $$select public.settle_expense_and_schedule_next(
    current_setting('test.march_expense')::uuid
  ) ->> 'scheduled'$$,
  $$values ('false'::text)$$,
  'Após stop, liquidar não cria nova ocorrência'
);

select results_eq(
  $$select count(*) from public.expenses
    where recurrence_group_id = current_setting('test.recurrence_group')::uuid$$,
  array[3::bigint],
  'Série encerrada permanece com as três ocorrências existentes'
);

select * from finish();
rollback;
