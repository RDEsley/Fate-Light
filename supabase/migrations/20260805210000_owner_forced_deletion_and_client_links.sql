-- ADR-0016: exclusão forçada pelo dono, links do cliente e liquidação em lote.

-- Até três endereços nomeados por cliente, no mesmo desenho de address_json:
-- jsonb validado por função imutável, sem tabela dedicada.
create or replace function private.are_valid_client_links(p_links jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_links is null
    or (
      jsonb_typeof(p_links) = 'array'
      and jsonb_array_length(p_links) <= 3
      and octet_length(p_links::text) <= 2048
      and not exists (
        select 1
        from jsonb_array_elements(p_links) as link
        where jsonb_typeof(link.value) <> 'object'
          or exists (
            select 1
            from jsonb_object_keys(link.value) as link_key
            where link_key not in ('label', 'url')
          )
          or jsonb_typeof(link.value -> 'label') is distinct from 'string'
          or jsonb_typeof(link.value -> 'url') is distinct from 'string'
          or char_length(btrim(link.value ->> 'label')) not between 1 and 40
          or char_length(btrim(link.value ->> 'url')) not between 3 and 253
          or (link.value ->> 'url') <> lower(link.value ->> 'url')
          or (link.value ->> 'url') !~ '^[a-z0-9]([a-z0-9.-]{1,251}[a-z0-9])?(/[^[:space:]]*)?$'
      )
    );
$$;

comment on function private.are_valid_client_links(jsonb) is
  'Valida a lista de links extras do cliente: no máximo três objetos {label, url}, host em minúsculas sem protocolo.';

alter table public.clients
  add column links jsonb not null default '[]'::jsonb,
  add constraint clients_links_check check (private.are_valid_client_links(links));

grant insert (links) on table public.clients to authenticated;
grant update (links) on table public.clients to authenticated;

comment on column public.clients.links is
  'Endereços extras do cliente ({label, url}), no máximo três; clients.website continua sendo o principal.';

-- A assinatura antiga vira ambígua se p_force entrasse como parâmetro com default,
-- então a função de um argumento é removida e todo chamador passa os dois.
drop function if exists public.delete_client_service_cascade(uuid);

create or replace function public.delete_client_service_cascade(
  p_service_id uuid,
  p_force boolean
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
begin
  select service.workspace_id
  into v_workspace_id
  from public.client_services as service
  where service.id = p_service_id
  for update;

  if v_workspace_id is null then
    return 'not_found';
  end if;

  if (select auth.uid()) is null
    or not (select private.is_active_workspace_owner(v_workspace_id)) then
    raise insufficient_privilege using message = 'active workspace owner required';
  end if;

  -- Sem força, a regra da ADR-0015 continua valendo: pagamento confirmado protege
  -- o serviço. Com força, o dono assumiu a consequência na interface (ADR-0016).
  if not coalesce(p_force, false) and exists (
    select 1 from public.charges
    where workspace_id = v_workspace_id
      and client_service_id = p_service_id
      and (status = 'paid' or paid_at is not null)
  ) then
    return 'blocked';
  end if;

  delete from public.charges
  where workspace_id = v_workspace_id and client_service_id = p_service_id;

  delete from public.client_services
  where workspace_id = v_workspace_id and id = p_service_id;

  return 'deleted';
end;
$$;

drop function if exists public.delete_catalog_service(uuid);

create or replace function public.delete_catalog_service(
  p_service_id uuid,
  p_detach boolean
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
begin
  select service.workspace_id
  into v_workspace_id
  from public.services as service
  where service.id = p_service_id
  for update;

  if v_workspace_id is null then
    return 'not_found';
  end if;

  if (select auth.uid()) is null
    or not (select private.is_active_workspace_owner(v_workspace_id)) then
    raise insufficient_privilege using message = 'active workspace owner required';
  end if;

  if exists (
    select 1 from public.client_services
    where workspace_id = v_workspace_id and service_id = p_service_id
  ) then
    if not coalesce(p_detach, false) then
      return 'blocked';
    end if;

    -- Desvincular preserva o trabalho já feito: o serviço do cliente continua
    -- ativo, apenas deixa de apontar para um item de catálogo que não existe mais.
    update public.client_services
    set service_id = null
    where workspace_id = v_workspace_id and service_id = p_service_id;
  end if;

  delete from public.services
  where workspace_id = v_workspace_id and id = p_service_id;

  return 'deleted';
end;
$$;

-- Liquidação em lote usada ao encerrar um serviço "com tudo quitado".
-- Não usa settle_charge_and_schedule_next de propósito: agendar o próximo ciclo
-- de um serviço que está sendo encerrado recriaria a cobrança recém-liquidada.
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
    and status = 'pending';

  get diagnostics v_settled = row_count;
  return v_settled;
end;
$$;

-- delete_workspace_record só apaga domínio já cancelado. Domínio não guarda movimento
-- financeiro confirmado, então exigir o cancelamento antes era etapa sem propósito:
-- a confirmação da interface basta.
create or replace function public.delete_domain_record(p_domain_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
begin
  select domain.workspace_id
  into v_workspace_id
  from public.domains as domain
  where domain.id = p_domain_id
  for update;

  if v_workspace_id is null then
    return 'not_found';
  end if;

  if (select auth.uid()) is null
    or not (select private.is_active_workspace_owner(v_workspace_id)) then
    raise insufficient_privilege using message = 'active workspace owner required';
  end if;

  delete from public.domains
  where workspace_id = v_workspace_id and id = p_domain_id;

  return 'deleted';
end;
$$;

revoke all on function public.delete_domain_record(uuid) from public, anon, authenticated;
grant execute on function public.delete_domain_record(uuid) to authenticated;

comment on function public.delete_domain_record(uuid) is
  'Exclui um domínio do workspace, cancelado ou não, sob autorização do owner.';

revoke all on function public.delete_client_service_cascade(uuid, boolean) from public, anon, authenticated;
revoke all on function public.delete_catalog_service(uuid, boolean) from public, anon, authenticated;
revoke all on function public.settle_client_service_charges(uuid, text) from public, anon, authenticated;
grant execute on function public.delete_client_service_cascade(uuid, boolean) to authenticated;
grant execute on function public.delete_catalog_service(uuid, boolean) to authenticated;
grant execute on function public.settle_client_service_charges(uuid, text) to authenticated;

comment on function public.delete_client_service_cascade(uuid, boolean) is
  'Remove um serviço do cliente e suas cobranças; sem p_force, pagamento confirmado bloqueia a operação.';

comment on function public.delete_catalog_service(uuid, boolean) is
  'Remove um serviço do catálogo; com p_detach, desvincula os serviços de cliente em vez de bloquear.';

comment on function public.settle_client_service_charges(uuid, text) is
  'Marca como pagas as cobranças pendentes de um serviço e devolve quantas foram liquidadas.';

-- A listagem de clientes precisa ordenar por situação e por receita acumulada. Fazer isso
-- no cliente ordenaria apenas a página corrente, e trazer as cobranças aninhadas de todos
-- os clientes só para contar era o que deixava a tela pesada. A view resolve os dois:
-- agrega no banco e permite ordenar e paginar sobre o resultado agregado.
-- security_invoker mantém a RLS de public.clients valendo para quem consulta.
create view public.client_directory
with (security_invoker = true) as
select
  client.id,
  client.workspace_id,
  client.name,
  client.trade_name,
  client.email,
  client.phone,
  client.website,
  client.links,
  client.notes,
  client.commercial_status,
  client.archived_at,
  case client.commercial_status
    when 'active' then 0
    when 'budget' then 1
    when 'pending' then 2
    when 'inactive' then 3
    when 'blacklist' then 4
    else 5
  end as status_rank,
  coalesce(service_totals.active_services, 0) as active_services,
  service_totals.first_service_start,
  coalesce(charge_totals.lifetime_revenue, 0)::numeric(15,2) as lifetime_revenue,
  coalesce(charge_totals.overdue_charges, 0) as overdue_charges,
  coalesce(domain_totals.expiring_domains, 0) as expiring_domains
from public.clients as client
left join lateral (
  select
    count(*) filter (where service.status = 'active') as active_services,
    min(service.start_date) as first_service_start
  from public.client_services as service
  where service.workspace_id = client.workspace_id
    and service.client_id = client.id
) as service_totals on true
left join lateral (
  select
    sum(charge.company_revenue) filter (where charge.status = 'paid') as lifetime_revenue,
    count(*) filter (
      where charge.status = 'pending' and charge.due_date < current_date
    ) as overdue_charges
  from public.charges as charge
  where charge.workspace_id = client.workspace_id
    and charge.client_id = client.id
) as charge_totals on true
left join lateral (
  select count(*) as expiring_domains
  from public.domains as domain
  where domain.workspace_id = client.workspace_id
    and domain.client_id = client.id
    and domain.status = 'active'
    and domain.expires_on <= current_date + 30
) as domain_totals on true;

revoke all on table public.client_directory from public, anon;
grant select on table public.client_directory to authenticated;

comment on view public.client_directory is
  'Clientes com totais operacionais já agregados, para ordenar e paginar a listagem sem trazer cobranças aninhadas.';
