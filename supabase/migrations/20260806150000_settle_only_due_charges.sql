-- ADR-0016 (atualização): "Quitar pendências" marcava como pagas HOJE todas as cobranças
-- pendentes de um serviço, inclusive ciclos futuros ainda longe do vencimento. Um serviço
-- com vários ciclos já gerados adiantados inflava a receita recebida do mês corrente com
-- dinheiro que, pela própria data de vencimento, é de meses ou anos à frente. Passa a
-- liquidar só o que já venceu ou vence até hoje; ciclos futuros seguem pendentes e são
-- liquidados quando realmente chegam nessa janela.
create or replace function public.settle_client_service_charges(
  p_service_id uuid,
  p_payment_method text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_method text := nullif(btrim(coalesce(p_payment_method, '')), '');
  v_settled integer;
begin
  select service.workspace_id
  into v_workspace_id
  from public.client_services as service
  where service.id = p_service_id
  for update;

  if v_workspace_id is null then
    return -1;
  end if;

  if (select auth.uid()) is null
    or not (select private.is_active_workspace_owner(v_workspace_id)) then
    raise insufficient_privilege using message = 'active workspace owner required';
  end if;

  if v_method is null or char_length(v_method) not between 2 and 80 then
    raise check_violation using message = 'payment method required';
  end if;

  update public.charges
  set paid_at = statement_timestamp(),
      payment_method = v_method,
      status = 'paid'
  where workspace_id = v_workspace_id
    and client_service_id = p_service_id
    and status = 'pending'
    and due_date <= current_date;

  get diagnostics v_settled = row_count;
  return v_settled;
end;
$$;

comment on function public.settle_client_service_charges(uuid, text) is
  'Marca como pagas as cobranças vencidas ou vencendo até hoje de um serviço; ciclos futuros permanecem pendentes.';
