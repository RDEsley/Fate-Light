-- ADR-0017: edição e exclusão do lançamento de "histórico anterior ao sistema".
-- Reescreve delete_workspace_record só para abrir uma exceção estreita ao bloqueio de
-- cobrança paga: some quando a cobrança bate, ao mesmo tempo, com as quatro marcas que
-- só `recordPriorRevenue` grava. Qualquer outra cobrança paga continua protegida.
create or replace function public.delete_workspace_record(p_record_type text, p_record_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
begin
  case p_record_type
    when 'service' then
      select workspace_id into v_workspace_id
      from public.client_services where id = p_record_id for update;
    when 'charge' then
      select workspace_id into v_workspace_id
      from public.charges where id = p_record_id for update;
    when 'expense' then
      select workspace_id into v_workspace_id
      from public.expenses where id = p_record_id for update;
    when 'domain' then
      select workspace_id into v_workspace_id
      from public.domains where id = p_record_id for update;
    else
      raise invalid_parameter_value using message = 'unsupported record type';
  end case;

  if v_workspace_id is null then
    return 'not_found';
  end if;

  if (select auth.uid()) is null
    or not (select private.is_active_workspace_owner(v_workspace_id)) then
    raise insufficient_privilege using message = 'active workspace owner required';
  end if;

  case p_record_type
    when 'service' then
      if exists (
        select 1 from public.client_services
        where id = p_record_id and workspace_id = v_workspace_id and status <> 'ended'
      ) or exists (
        select 1 from public.charges
        where workspace_id = v_workspace_id and client_service_id = p_record_id
      ) then
        return 'blocked';
      end if;
      delete from public.client_services
      where id = p_record_id and workspace_id = v_workspace_id;
    when 'charge' then
      if exists (
        select 1 from public.charges
        where id = p_record_id and workspace_id = v_workspace_id
          and (status = 'paid' or paid_at is not null)
          and not (
            client_service_id is null
            and payment_method = 'Histórico'
            and description = 'Histórico anterior ao sistema'
            and notes = 'Valor consolidado informado no cadastro do cliente.'
          )
      ) then
        return 'blocked';
      end if;
      delete from public.charges
      where id = p_record_id and workspace_id = v_workspace_id;
    when 'expense' then
      if exists (
        select 1 from public.expenses
        where id = p_record_id and workspace_id = v_workspace_id
          and (status = 'paid' or paid_at is not null)
      ) then
        return 'blocked';
      end if;
      delete from public.expenses
      where id = p_record_id and workspace_id = v_workspace_id;
    when 'domain' then
      if exists (
        select 1 from public.domains
        where id = p_record_id and workspace_id = v_workspace_id and status <> 'cancelled'
      ) then
        return 'blocked';
      end if;
      delete from public.domains
      where id = p_record_id and workspace_id = v_workspace_id;
  end case;

  return 'deleted';
end;
$$;

comment on function public.delete_workspace_record(text, uuid) is
  'Exclui registros operacionais elegíveis e movimento financeiro confirmado só quando é o resumo sintético de histórico anterior ao sistema (ADR-0017); nunca cobrança paga real.';
