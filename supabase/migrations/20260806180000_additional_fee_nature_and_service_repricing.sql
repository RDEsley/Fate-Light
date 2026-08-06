-- ADR-0018: o custo adicional passa a declarar se é receita própria ou repasse.
-- O default true preserva o número que o dashboard já exibia, então nenhuma receita
-- histórica muda de valor ao aplicar esta migration.
-- `if not exists` porque o restante do arquivo (drop/create de função e view, grants) já
-- é reexecutável: sem isto, rodar a migration duas vezes para na primeira linha em vez de
-- convergir para o mesmo estado.
alter table public.client_services
  add column if not exists additional_fee_is_revenue boolean not null default true;

alter table public.charges
  add column if not exists additional_fee_is_revenue boolean not null default true;

comment on column public.client_services.additional_fee_is_revenue is
  'Verdadeiro quando o custo adicional é receita própria; falso quando é repasse a terceiro (ADR-0018).';
comment on column public.charges.additional_fee_is_revenue is
  'Verdadeiro quando o custo adicional é receita própria; falso quando é repasse a terceiro (ADR-0018).';

-- charges_overview também somava o adicional em company_result_value sem perguntar a
-- natureza. Precisa de drop e recriação, não de "create or replace": o `charge.*` foi
-- expandido para a lista de colunas quando a view nasceu, então a coluna nova não
-- entraria sozinha, e incluí-la desloca a posição de effective_status — mudança de
-- ordem que "create or replace view" recusa.
drop view if exists public.charges_overview;

create view public.charges_overview
with (security_invoker = true)
as
select
  charge.*,
  case
    when charge.status = 'pending' and charge.due_date < current_date then 'overdue'
    else charge.status
  end as effective_status,
  charge.company_revenue
    + case when charge.additional_fee_is_revenue then charge.additional_fee else 0 end
    as company_result_value
from public.charges as charge;

revoke all privileges on table public.charges_overview
from public, anon, authenticated, service_role;
grant select on table public.charges_overview to authenticated;

-- Os privilégios de charges são por coluna: sem este grant, a cobrança avulsa criada
-- pela aplicação (que insere como `authenticated`, não por RPC) falharia ao gravar a
-- natureza. As RPCs são security definer e não dependem disto.
grant insert (additional_fee_is_revenue) on table public.charges to authenticated;

comment on view public.charges_overview is
  'Cobranças com status efetivo e o valor que compõe o resultado da empresa, respeitando a natureza do adicional (ADR-0018).';

drop function if exists public.apply_service_to_client(
  uuid, uuid, text, text, numeric, text, numeric, numeric, numeric, text,
  date, date, integer, numeric, integer, integer, numeric, text
);

create or replace function public.apply_service_to_client(
  p_client_id uuid,
  p_service_id uuid,
  p_name text,
  p_description text,
  p_list_price numeric,
  p_discount_type text,
  p_discount_value numeric,
  p_media_budget numeric,
  p_additional_fee numeric,
  p_additional_fee_is_revenue boolean,
  p_billing_type text,
  p_start_date date,
  p_next_due_date date,
  p_installment_count integer,
  p_promotional_price numeric,
  p_promotional_cycles integer,
  p_adjustment_interval_months integer,
  p_adjustment_rate numeric,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_service_instance_id uuid;
  v_catalog_service_id uuid;
  v_normalized_name text := btrim(p_name);
  v_company_revenue numeric(15,2);
  v_first_revenue numeric(15,2);
  v_total numeric(15,2);
  v_charge_revenue numeric(15,2);
  v_charge_media numeric(15,2);
  v_charge_additional numeric(15,2);
  v_is_revenue boolean := coalesce(p_additional_fee_is_revenue, true);
  v_index integer;
begin
  select client.workspace_id
  into v_workspace_id
  from public.clients as client
  where client.id = p_client_id
    and client.archived_at is null
    and client.commercial_status in ('active', 'budget', 'pending');

  if v_workspace_id is null
    or (select auth.uid()) is null
    or not (select private.is_active_workspace_owner(v_workspace_id)) then
    raise insufficient_privilege using message = 'active workspace owner required';
  end if;

  v_company_revenue := round(case p_discount_type
    when 'percentage' then p_list_price * (1 - p_discount_value / 100)
    when 'fixed' then p_list_price - p_discount_value
    else p_list_price
  end, 2);

  if v_company_revenue < 0 then
    raise check_violation using message = 'discount exceeds list price';
  end if;

  -- Serviço avulso alimenta o catálogo do workspace; nomes iguais reaproveitam o registro
  -- existente para não multiplicar entradas equivalentes.
  if p_service_id is null then
    select service.id
    into v_catalog_service_id
    from public.services as service
    where service.workspace_id = v_workspace_id
      and lower(service.name) = lower(v_normalized_name)
      and service.active
      and service.archived_at is null
    limit 1;

    if v_catalog_service_id is null then
      insert into public.services (
        workspace_id, name, description, active, default_price, default_billing_type,
        default_adjustment_interval_months, default_adjustment_rate
      ) values (
        v_workspace_id, v_normalized_name, nullif(btrim(p_description), ''), true,
        p_list_price, p_billing_type, p_adjustment_interval_months, p_adjustment_rate
      )
      on conflict (workspace_id, lower(name)) where active and archived_at is null do nothing
      returning id into v_catalog_service_id;
    end if;

    if v_catalog_service_id is null then
      select service.id
      into v_catalog_service_id
      from public.services as service
      where service.workspace_id = v_workspace_id
        and lower(service.name) = lower(v_normalized_name)
        and service.active
        and service.archived_at is null
      limit 1;
    end if;
  else
    if not exists (
      select 1 from public.services
      where id = p_service_id and workspace_id = v_workspace_id and active and archived_at is null
    ) then
      raise foreign_key_violation using message = 'catalog service is not available';
    end if;
    v_catalog_service_id := p_service_id;
  end if;

  insert into public.client_services (
    workspace_id, client_id, service_id, name, description,
    list_price, discount_type, discount_value, company_revenue,
    media_budget, additional_fee, additional_fee_is_revenue, billing_type,
    start_date, next_due_date,
    installment_count, promotional_price, promotional_cycles, promotional_cycles_used,
    adjustment_interval_months, adjustment_rate, next_adjustment_date, status, notes
  ) values (
    v_workspace_id, p_client_id, v_catalog_service_id, v_normalized_name,
    nullif(btrim(p_description), ''),
    p_list_price, p_discount_type, p_discount_value, v_company_revenue,
    p_media_budget, p_additional_fee, v_is_revenue, p_billing_type,
    p_start_date, p_next_due_date,
    p_installment_count, p_promotional_price, p_promotional_cycles, 0,
    p_adjustment_interval_months, p_adjustment_rate,
    case when p_adjustment_interval_months is null then null
      else private.add_months_clamped(p_start_date, p_adjustment_interval_months) end,
    'active', nullif(btrim(p_notes), '')
  ) returning id into v_service_instance_id;

  -- A promoção sempre começa no primeiro vencimento, independentemente da data de início.
  v_first_revenue := coalesce(p_promotional_price, v_company_revenue);
  v_total := v_company_revenue + p_media_budget + p_additional_fee;

  if p_billing_type = 'single' then
    if v_total = 0 then
      insert into public.charges (
        workspace_id, client_id, client_service_id, description, due_date,
        company_revenue, media_budget, additional_fee, additional_fee_is_revenue, status
      ) values (
        v_workspace_id, p_client_id, v_service_instance_id, v_normalized_name,
        p_next_due_date, 0, 0, 0, v_is_revenue, 'pending'
      );
    else
      if p_installment_count > greatest(
        round(v_company_revenue * 100)::integer,
        round(p_media_budget * 100)::integer,
        round(p_additional_fee * 100)::integer
      ) then
        raise check_violation using message = 'installment count exceeds divisible amount';
      end if;
      for v_index in 1..p_installment_count loop
        v_charge_revenue := (
          floor(v_company_revenue * 100 / p_installment_count)
          + case when v_index <= mod(round(v_company_revenue * 100)::integer, p_installment_count)
            then 1 else 0 end
        ) / 100;
        v_charge_media := (
          floor(p_media_budget * 100 / p_installment_count)
          + case when v_index <= mod(round(p_media_budget * 100)::integer, p_installment_count)
            then 1 else 0 end
        ) / 100;
        v_charge_additional := (
          floor(p_additional_fee * 100 / p_installment_count)
          + case when v_index <= mod(round(p_additional_fee * 100)::integer, p_installment_count)
            then 1 else 0 end
        ) / 100;

        insert into public.charges (
          workspace_id, client_id, client_service_id, description, due_date,
          company_revenue, media_budget, additional_fee, additional_fee_is_revenue, status
        ) values (
          v_workspace_id, p_client_id, v_service_instance_id,
          v_normalized_name || case when p_installment_count > 1
            then ' · parcela ' || v_index || '/' || p_installment_count else '' end,
          private.add_months_clamped(p_next_due_date, v_index - 1),
          v_charge_revenue, v_charge_media, v_charge_additional, v_is_revenue, 'pending'
        );
      end loop;
    end if;
  else
    -- Cobranças de valor zero são válidas e necessárias: sem elas o ciclo promocional
    -- gratuito nunca avançaria, porque o avanço acontece na liquidação.
    insert into public.charges (
      workspace_id, client_id, client_service_id, description, due_date,
      company_revenue, media_budget, additional_fee, additional_fee_is_revenue, status
    ) values (
      v_workspace_id, p_client_id, v_service_instance_id, v_normalized_name, p_next_due_date,
      v_first_revenue, p_media_budget, p_additional_fee, v_is_revenue, 'pending'
    );
  end if;

  return v_service_instance_id;
end;
$$;

revoke all on function public.apply_service_to_client(
  uuid, uuid, text, text, numeric, text, numeric, numeric, numeric, boolean, text,
  date, date, integer, numeric, integer, integer, numeric, text
) from public, anon, authenticated;
grant execute on function public.apply_service_to_client(
  uuid, uuid, text, text, numeric, text, numeric, numeric, numeric, boolean, text,
  date, date, integer, numeric, integer, integer, numeric, text
) to authenticated;

-- Cada ciclo novo herda a natureza declarada no serviço (ADR-0018).
create or replace function public.settle_charge_and_schedule_next(
  p_charge_id uuid,
  p_payment_method text
)
returns date
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_charge public.charges%rowtype;
  v_service public.client_services%rowtype;
  v_next_due_date date;
  v_next_revenue numeric(15,2);
  v_promotion_cycles_used smallint;
begin
  select charge.*
  into v_charge
  from public.charges as charge
  where charge.id = p_charge_id
    and charge.status = 'pending'
  for update;

  if v_charge.id is null
    or (select auth.uid()) is null
    or not (select private.is_active_workspace_owner(v_charge.workspace_id)) then
    raise insufficient_privilege using message = 'pending workspace charge required';
  end if;

  update public.charges
  set
    paid_at = statement_timestamp(),
    payment_method = btrim(p_payment_method),
    status = 'paid'
  where id = v_charge.id;

  if v_charge.client_service_id is null then
    return null;
  end if;

  -- Serviço pausado não agenda o próximo ciclo; retomar restaura a agenda.
  select service.*
  into v_service
  from public.client_services as service
  where service.id = v_charge.client_service_id
    and service.workspace_id = v_charge.workspace_id
    and service.status = 'active'
  for update;

  if v_service.id is null or v_service.billing_type = 'single' then
    return null;
  end if;

  v_next_due_date := private.next_billing_date(v_charge.due_date, v_service.billing_type);
  v_promotion_cycles_used := case
    when v_service.promotional_price is not null
      then least(v_service.promotional_cycles_used + 1, v_service.promotional_cycles)
    else 0
  end;
  v_next_revenue := case
    when v_service.promotional_price is not null
      and v_promotion_cycles_used < v_service.promotional_cycles
      then v_service.promotional_price
    else v_service.company_revenue
  end;

  -- Um ciclo gratuito também gera cobrança: é ela que mantém a recorrência avançando.
  if not exists (
    select 1 from public.charges
    where client_service_id = v_service.id
      and due_date = v_next_due_date
      and status <> 'cancelled'
  ) then
    insert into public.charges (
      workspace_id, client_id, client_service_id, description, due_date,
      company_revenue, media_budget, additional_fee, additional_fee_is_revenue, status
    ) values (
      v_service.workspace_id, v_service.client_id, v_service.id, v_service.name,
      v_next_due_date, v_next_revenue, v_service.media_budget,
      v_service.additional_fee, v_service.additional_fee_is_revenue, 'pending'
    );
  end if;

  update public.client_services
  set
    next_due_date = v_next_due_date,
    promotional_cycles_used = v_promotion_cycles_used
  where id = v_service.id;

  return v_next_due_date;
end;
$$;

-- Editar um serviço reprecificava as cobranças pendentes com um UPDATE único que jogava o
-- valor cheio em TODAS elas. Duas consequências reais, ambas silenciosas:
--   * parcelamento: 3 parcelas de R$ 500 viravam 3 cobranças de R$ 1.500 — o cliente
--     passava a dever o triplo por causa de uma edição de nome;
--   * promoção: a cobrança do ciclo promocional (inclusive a gratuita) era elevada ao
--     valor cheio, desfazendo a promoção combinada sem aviso.
-- A reprecificação passa a respeitar a estrutura do serviço, e serviço e cobranças mudam
-- na mesma transação — antes eram dois writes independentes, e falhar no segundo deixava
-- o serviço com um valor e as cobranças com outro.
create or replace function public.update_client_service(
  p_service_id uuid,
  p_name text,
  p_description text,
  p_list_price numeric,
  p_discount_type text,
  p_discount_value numeric,
  p_media_budget numeric,
  p_additional_fee numeric,
  p_additional_fee_is_revenue boolean,
  p_billing_type text,
  p_next_due_date date,
  p_promotional_price numeric,
  p_promotional_cycles integer,
  p_adjustment_interval_months integer,
  p_adjustment_rate numeric,
  p_notes text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_service public.client_services%rowtype;
  v_company_revenue numeric(15,2);
  v_pending_revenue numeric(15,2);
  v_is_revenue boolean := coalesce(p_additional_fee_is_revenue, true);
  v_charge_revenue numeric(15,2);
  v_charge_media numeric(15,2);
  v_charge_additional numeric(15,2);
  v_row record;
begin
  select service.*
  into v_service
  from public.client_services as service
  where service.id = p_service_id
  for update;

  if v_service.id is null then
    return 'not_found';
  end if;

  if (select auth.uid()) is null
    or not (select private.is_active_workspace_owner(v_service.workspace_id)) then
    raise insufficient_privilege using message = 'active workspace owner required';
  end if;

  v_company_revenue := round(case p_discount_type
    when 'percentage' then p_list_price * (1 - p_discount_value / 100)
    when 'fixed' then p_list_price - p_discount_value
    else p_list_price
  end, 2);

  if v_company_revenue < 0 then
    raise check_violation using message = 'discount exceeds list price';
  end if;

  update public.client_services
  set
    name = btrim(p_name),
    description = nullif(btrim(coalesce(p_description, '')), ''),
    list_price = p_list_price,
    discount_type = p_discount_type,
    discount_value = p_discount_value,
    company_revenue = v_company_revenue,
    media_budget = p_media_budget,
    additional_fee = p_additional_fee,
    additional_fee_is_revenue = v_is_revenue,
    billing_type = p_billing_type,
    next_due_date = p_next_due_date,
    promotional_price = p_promotional_price,
    promotional_cycles = p_promotional_cycles,
    adjustment_interval_months = p_adjustment_interval_months,
    adjustment_rate = p_adjustment_rate,
    notes = nullif(btrim(coalesce(p_notes, '')), '')
  where id = p_service_id;

  if v_service.billing_type = 'single' and v_service.installment_count > 1 then
    -- Cada parcela recebe a fatia da sua posição no novo total, com os centavos de resto
    -- indo para as primeiras — o mesmo rateio que apply_service_to_client usou ao criar.
    -- A posição é contada sobre todas as cobranças não canceladas para que as já pagas
    -- não desloquem o índice das pendentes.
    for v_row in
      select charge.id, charge.status,
             row_number() over (order by charge.due_date, charge.id) as position
      from public.charges as charge
      where charge.client_service_id = p_service_id
        and charge.workspace_id = v_service.workspace_id
        and charge.status <> 'cancelled'
    loop
      if v_row.status <> 'pending' then
        continue;
      end if;

      v_charge_revenue := (
        floor(v_company_revenue * 100 / v_service.installment_count)
        + case when v_row.position
            <= mod(round(v_company_revenue * 100)::integer, v_service.installment_count)
          then 1 else 0 end
      ) / 100;
      v_charge_media := (
        floor(p_media_budget * 100 / v_service.installment_count)
        + case when v_row.position
            <= mod(round(p_media_budget * 100)::integer, v_service.installment_count)
          then 1 else 0 end
      ) / 100;
      v_charge_additional := (
        floor(p_additional_fee * 100 / v_service.installment_count)
        + case when v_row.position
            <= mod(round(p_additional_fee * 100)::integer, v_service.installment_count)
          then 1 else 0 end
      ) / 100;

      update public.charges
      set company_revenue = v_charge_revenue,
          media_budget = v_charge_media,
          additional_fee = v_charge_additional,
          additional_fee_is_revenue = v_is_revenue
      where id = v_row.id;
    end loop;
  else
    -- A pendente é o ciclo de número promotional_cycles_used + 1: ela ainda é promocional
    -- exatamente enquanto os ciclos consumidos não alcançaram o total contratado, que é o
    -- mesmo critério que settle_charge_and_schedule_next aplica ao criar o próximo.
    v_pending_revenue := case
      when p_promotional_price is not null
        and v_service.promotional_cycles_used < coalesce(p_promotional_cycles, 0)
        then p_promotional_price
      else v_company_revenue
    end;

    update public.charges
    set company_revenue = v_pending_revenue,
        media_budget = p_media_budget,
        additional_fee = p_additional_fee,
        additional_fee_is_revenue = v_is_revenue
    where client_service_id = p_service_id
      and workspace_id = v_service.workspace_id
      and status = 'pending';
  end if;

  return 'updated';
end;
$$;

revoke all on function public.update_client_service(
  uuid, text, text, numeric, text, numeric, numeric, numeric, boolean, text,
  date, numeric, integer, integer, numeric, text
) from public, anon, authenticated;
grant execute on function public.update_client_service(
  uuid, text, text, numeric, text, numeric, numeric, numeric, boolean, text,
  date, numeric, integer, integer, numeric, text
) to authenticated;

comment on function public.update_client_service(
  uuid, text, text, numeric, text, numeric, numeric, numeric, boolean, text,
  date, numeric, integer, integer, numeric, text
) is
  'Atualiza um serviço do cliente e reprecifica as cobranças pendentes preservando parcelamento e ciclo promocional.';
