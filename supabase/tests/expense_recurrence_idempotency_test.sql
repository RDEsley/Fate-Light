begin;

select plan(8);

insert into auth.users (id, email)
values ('84848484-8484-4848-8848-848484848484', 'expense-idempotency@example.test');

select set_config('request.jwt.claim.sub', '84848484-8484-4848-8848-848484848484', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$select * from public.bootstrap_identity_workspace(
    'Owner Expense Idempotency', 'Workspace Expense Idempotency',
    array['20000000-0000-4000-8000-000000000001'::uuid, '20000000-0000-4000-8000-000000000002'::uuid]
  )$$,
  'Cria o workspace de teste'
);

select set_config(
  'test.workspace',
  (select id::text from public.workspaces
    where created_by = '84848484-8484-4848-8848-848484848484'::uuid),
  true
);

select results_eq(
  $$select public.create_expense_with_recurrence(
    'SaaS mensal', 'software', 49.90, date '2026-03-15',
    'fixed', 'pending', null, null, true
  ) ->> 'status'$$,
  $$values ('created'::text)$$,
  'Cria série mensal pendente'
);

select set_config(
  'test.first',
  (
    select id::text from public.expenses
    where workspace_id = current_setting('test.workspace')::uuid
      and description = 'SaaS mensal'
      and recurrence_sequence = 1
  ),
  true
);

select results_eq(
  $$select public.settle_expense_and_schedule_next(
    current_setting('test.first')::uuid
  ) ->> 'status'$$,
  $$values ('settled'::text)$$,
  'Primeira liquidação marca paga e agenda próxima'
);

select set_config(
  'test.next',
  (
    select id::text from public.expenses
    where workspace_id = current_setting('test.workspace')::uuid
      and description = 'SaaS mensal'
      and recurrence_sequence = 2
  ),
  true
);

select results_eq(
  $$select public.settle_expense_and_schedule_next(
    current_setting('test.first')::uuid
  ) ->> 'status'$$,
  $$values ('already_settled'::text)$$,
  'Segunda liquidação da mesma ocorrência retorna already_settled'
);

select results_eq(
  $$select count(*) from public.expenses
    where workspace_id = current_setting('test.workspace')::uuid
      and description = 'SaaS mensal'$$,
  array[2::bigint],
  'Retry não cria terceira ocorrência'
);

-- Excluir a próxima pendente encerra a série (recurrence_active=false no histórico).
select results_eq(
  $$select public.delete_workspace_record(
    'expense', current_setting('test.next')::uuid
  )$$,
  $$values ('deleted'::text)$$,
  'Exclui a próxima ocorrência pendente'
);

select results_eq(
  $$select bool_or(recurrence_active), count(*)
    from public.expenses
    where workspace_id = current_setting('test.workspace')::uuid
      and description = 'SaaS mensal'$$,
  $$values (false, 1::bigint)$$,
  'Histórico pago permanece e a série fica inativa'
);

select results_eq(
  $$select public.settle_expense_and_schedule_next(
    current_setting('test.first')::uuid
  ) ->> 'scheduled'$$,
  $$values ('false'::text)$$,
  'Settle stale após excluir próxima não regenera ocorrência'
);

select * from finish();
rollback;
