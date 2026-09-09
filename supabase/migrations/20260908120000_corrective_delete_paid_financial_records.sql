-- Exclusão corretiva de cobranças/despesas já liquidadas pelo owner.
-- delete_workspace_record continua bloqueando pagamento confirmado (exceto o
-- resumo de histórico anterior ao sistema, ADR-0017). Este RPC dedicado remove
-- metadados fiscais antes do registro (FK ON DELETE RESTRICT) e devolve os
-- object_paths para a aplicação limpar o Storage privado.

create or replace function public.delete_paid_financial_record(
  p_record_type text,
  p_record_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_is_paid boolean := false;
  v_object_paths text[];
begin
  if p_record_type is distinct from 'charge'
    and p_record_type is distinct from 'expense' then
    raise invalid_parameter_value using message = 'unsupported record type';
  end if;

  if p_record_type = 'charge' then
    select charge.workspace_id,
           (charge.status = 'paid' or charge.paid_at is not null)
    into v_workspace_id, v_is_paid
    from public.charges as charge
    where charge.id = p_record_id
    for update;
  else
    select expense.workspace_id,
           (expense.status = 'paid' or expense.paid_at is not null)
    into v_workspace_id, v_is_paid
    from public.expenses as expense
    where expense.id = p_record_id
    for update;
  end if;

  if v_workspace_id is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  if (select auth.uid()) is null
    or not (select private.is_active_workspace_owner(v_workspace_id)) then
    raise insufficient_privilege using message = 'active workspace owner required';
  end if;

  if not v_is_paid then
    return jsonb_build_object('status', 'blocked');
  end if;

  if p_record_type = 'charge' then
    select coalesce(array_agg(document.object_path order by document.object_path), array[]::text[])
    into v_object_paths
    from public.fiscal_documents as document
    where document.workspace_id = v_workspace_id
      and document.charge_id = p_record_id;

    delete from public.fiscal_documents
    where workspace_id = v_workspace_id
      and charge_id = p_record_id;

    delete from public.charges
    where workspace_id = v_workspace_id
      and id = p_record_id;
  else
    select coalesce(array_agg(document.object_path order by document.object_path), array[]::text[])
    into v_object_paths
    from public.fiscal_documents as document
    where document.workspace_id = v_workspace_id
      and document.expense_id = p_record_id;

    delete from public.fiscal_documents
    where workspace_id = v_workspace_id
      and expense_id = p_record_id;

    delete from public.expenses
    where workspace_id = v_workspace_id
      and id = p_record_id;
  end if;

  return jsonb_build_object(
    'status', 'deleted',
    'object_paths', to_jsonb(v_object_paths)
  );
end;
$$;

revoke all on function public.delete_paid_financial_record(text, uuid)
from public, anon, authenticated;
grant execute on function public.delete_paid_financial_record(text, uuid) to authenticated;

comment on function public.delete_paid_financial_record(text, uuid) is
  'Exclusão corretiva de cobrança/despesa paga pelo owner; remove metadados fiscais e devolve object_paths para limpeza do Storage.';
