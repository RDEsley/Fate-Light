begin;

select plan(10);

insert into auth.users (id, email)
values ('87878787-8787-4878-8878-878787878787', 'payment-date@example.test');

select set_config('request.jwt.claim.sub', '87878787-8787-4878-8878-878787878787', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$select * from public.bootstrap_identity_workspace(
    'Owner Payment Date', 'Workspace Payment Date',
    array['20000000-0000-4000-8000-000000000001'::uuid, '20000000-0000-4000-8000-000000000002'::uuid]
  )$$,
  'Cria o workspace de teste'
);

select set_config(
  'test.workspace',
  (select id::text from public.workspaces
    where created_by = '87878787-8787-4878-8878-878787878787'::uuid),
  true
);

reset role;
insert into public.clients (id, workspace_id, kind, name, commercial_status)
values (
  '87878787-0001-4878-8878-878787878787',
  current_setting('test.workspace')::uuid,
  'company', 'Cliente Data do Pagamento', 'active'
);

insert into public.charges (
  id, workspace_id, client_id, description, due_date, company_revenue, status
) values
  ('87878787-00aa-4878-8878-878787878787', current_setting('test.workspace')::uuid,
   '87878787-0001-4878-8878-878787878787', 'Pago na semana passada', date '2026-01-10', 100,
   'pending'),
  ('87878787-00bb-4878-8878-878787878787', current_setting('test.workspace')::uuid,
   '87878787-0001-4878-8878-878787878787', 'Pago agora', date '2026-01-10', 100, 'pending'),
  ('87878787-00cc-4878-8878-878787878787', current_setting('test.workspace')::uuid,
   '87878787-0001-4878-8878-878787878787', 'Data futura', date '2026-01-10', 100, 'pending');
set local role authenticated;

-- 1. Cobrança paga com a data informada: a receita cai no dia em que o dinheiro entrou.
select lives_ok(
  $$select public.settle_charge_and_schedule_next(
    '87878787-00aa-4878-8878-878787878787'::uuid, 'Pix', date '2026-01-05'
  )$$,
  'Recebe a cobrança informando a data do pagamento'
);

select results_eq(
  $$select status, (paid_at at time zone 'UTC')::date::text
    from public.charges where id = '87878787-00aa-4878-8878-878787878787'::uuid$$,
  $$values ('paid'::text, '2026-01-05'::text)$$,
  'paid_at fica no dia informado'
);

-- 2. Sem data, continua valendo "agora" — e a chamada antiga, com dois argumentos, segue válida.
select lives_ok(
  $$select public.settle_charge_and_schedule_next(
    '87878787-00bb-4878-8878-878787878787'::uuid, 'Boleto'
  )$$,
  'A chamada sem data continua funcionando'
);

select results_eq(
  $$select (paid_at at time zone 'UTC')::date = (statement_timestamp() at time zone 'UTC')::date
    from public.charges where id = '87878787-00bb-4878-8878-878787878787'::uuid$$,
  $$values (true)$$,
  'Sem data informada, o pagamento é registrado agora'
);

-- 3. Data no futuro é recusada e a cobrança continua pendente.
select throws_ok(
  $$select public.settle_charge_and_schedule_next(
    '87878787-00cc-4878-8878-878787878787'::uuid, 'Pix', current_date + 10
  )$$,
  '23514',
  'payment date cannot be in the future',
  'Pagamento no futuro é recusado'
);

select results_eq(
  $$select status from public.charges
    where id = '87878787-00cc-4878-8878-878787878787'::uuid$$,
  $$values ('pending'::text)$$,
  'A cobrança recusada continua pendente'
);

-- 4. Despesa: mesma regra, sem tirar a próxima ocorrência da agenda pelo vencimento.
select results_eq(
  $$select public.create_expense_with_recurrence(
    'Hospedagem', 'hosting', 59.90, date '2026-02-15',
    'fixed', 'pending', null, null, true
  ) ->> 'status'$$,
  $$values ('created'::text)$$,
  'Cria despesa mensal pendente'
);

select results_eq(
  $$select public.settle_expense_and_schedule_next(
      (select id from public.expenses
        where workspace_id = current_setting('test.workspace')::uuid
          and description = 'Hospedagem' and status = 'pending'),
      date '2026-02-12'
    ) ->> 'next_due_date'$$,
  $$values ('2026-03-15'::text)$$,
  'A próxima ocorrência continua contada pelo vencimento'
);

select results_eq(
  $$select (paid_at at time zone 'UTC')::date::text from public.expenses
    where workspace_id = current_setting('test.workspace')::uuid
      and description = 'Hospedagem' and status = 'paid'$$,
  $$values ('2026-02-12'::text)$$,
  'Despesa paga no dia informado'
);

select * from finish();
rollback;
