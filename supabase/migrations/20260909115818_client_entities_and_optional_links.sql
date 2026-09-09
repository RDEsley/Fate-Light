-- Empresas/marcas/projetos sob um cliente comercial (ADR-ready).
-- Backwards compatible: client_entity_id permanece nullable em todos os vínculos.

create table public.client_entities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete restrict,
  client_id uuid not null,
  entity_type text not null default 'company',
  display_name text not null,
  legal_name text,
  tax_id text,
  website text,
  email text,
  phone text,
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid not null default auth.uid(),
  updated_by uuid not null default auth.uid(),
  archived_at timestamptz,
  constraint client_entities_workspace_id_id_unique unique (workspace_id, id),
  constraint client_entities_workspace_client_id_unique unique (workspace_id, client_id, id),
  constraint client_entities_client_fk
    foreign key (workspace_id, client_id)
    references public.clients (workspace_id, id)
    on delete restrict,
  constraint client_entities_type_check
    check (entity_type in ('company', 'brand', 'project', 'other')),
  constraint client_entities_status_check
    check (status in ('active', 'inactive', 'archived')),
  constraint client_entities_display_name_check
    check (char_length(btrim(display_name)) between 2 and 160),
  constraint client_entities_legal_name_check
    check (legal_name is null or char_length(btrim(legal_name)) between 2 and 200),
  constraint client_entities_tax_id_check
    check (tax_id is null or char_length(btrim(tax_id)) between 8 and 32),
  constraint client_entities_website_check
    check (website is null or char_length(btrim(website)) between 3 and 255),
  constraint client_entities_email_check
    check (email is null or (char_length(email) between 3 and 254 and email = lower(email))),
  constraint client_entities_phone_check
    check (phone is null or char_length(btrim(phone)) between 7 and 32),
  constraint client_entities_notes_check
    check (notes is null or char_length(notes) <= 5000),
  constraint client_entities_archived_consistency_check
    check (
      (status = 'archived' and archived_at is not null)
      or (status <> 'archived' and archived_at is null)
    )
);

comment on table public.client_entities is
  'Empresa, marca ou projeto ligado a um cliente comercial. Não armazena credenciais.';

create unique index client_entities_active_display_name_uidx
  on public.client_entities (workspace_id, client_id, lower(btrim(display_name)))
  where status <> 'archived' and archived_at is null;

create index client_entities_workspace_client_status_idx
  on public.client_entities (workspace_id, client_id, status);

create index client_entities_workspace_status_idx
  on public.client_entities (workspace_id, status)
  where archived_at is null;

alter table public.client_services
  add column client_entity_id uuid;

alter table public.charges
  add column client_entity_id uuid;

alter table public.expenses
  add column client_entity_id uuid;

alter table public.domains
  add column client_entity_id uuid;

alter table public.client_services
  add constraint client_services_entity_fk
    foreign key (workspace_id, client_id, client_entity_id)
    references public.client_entities (workspace_id, client_id, id)
    on delete restrict;

alter table public.charges
  add constraint charges_entity_fk
    foreign key (workspace_id, client_id, client_entity_id)
    references public.client_entities (workspace_id, client_id, id)
    on delete restrict;

-- Despesa sem cliente não pode apontar para entidade.
alter table public.expenses
  add constraint expenses_entity_requires_client_check
    check (client_entity_id is null or client_id is not null),
  add constraint expenses_entity_fk
    foreign key (workspace_id, client_id, client_entity_id)
    references public.client_entities (workspace_id, client_id, id)
    on delete restrict;

alter table public.domains
  add constraint domains_entity_fk
    foreign key (workspace_id, client_id, client_entity_id)
    references public.client_entities (workspace_id, client_id, id)
    on delete restrict;

create index client_services_entity_idx
  on public.client_services (workspace_id, client_entity_id)
  where client_entity_id is not null;

create index charges_entity_idx
  on public.charges (workspace_id, client_entity_id)
  where client_entity_id is not null;

create index expenses_entity_idx
  on public.expenses (workspace_id, client_entity_id)
  where client_entity_id is not null;

create index domains_entity_idx
  on public.domains (workspace_id, client_entity_id)
  where client_entity_id is not null;

alter table public.client_entities enable row level security;
alter table public.client_entities force row level security;

create policy client_entities_select_owner on public.client_entities
  for select to authenticated
  using ((select private.is_active_workspace_owner(workspace_id)));

create policy client_entities_insert_owner on public.client_entities
  for insert to authenticated
  with check (
    (select private.is_active_workspace_owner(workspace_id))
    and created_by = (select auth.uid())
    and updated_by = (select auth.uid())
  );

create policy client_entities_update_owner on public.client_entities
  for update to authenticated
  using ((select private.is_active_workspace_owner(workspace_id)))
  with check (
    (select private.is_active_workspace_owner(workspace_id))
    and updated_by = (select auth.uid())
  );

revoke all on table public.client_entities from public, anon, authenticated;
grant select, insert, update on table public.client_entities to authenticated;

grant select (client_entity_id) on table public.client_services to authenticated;
grant insert (client_entity_id) on table public.client_services to authenticated;
grant update (client_entity_id) on table public.client_services to authenticated;

grant select (client_entity_id) on table public.charges to authenticated;
grant insert (client_entity_id) on table public.charges to authenticated;
grant update (client_entity_id) on table public.charges to authenticated;

grant select (client_entity_id) on table public.expenses to authenticated;
grant insert (client_entity_id) on table public.expenses to authenticated;
grant update (client_entity_id) on table public.expenses to authenticated;

grant select (client_entity_id) on table public.domains to authenticated;
grant insert (client_entity_id) on table public.domains to authenticated;
grant update (client_entity_id) on table public.domains to authenticated;

-- apply_service_to_client: herda entidade opcional no serviço e nas cobranças geradas.
-- Remover a assinatura antiga: parâmetro novo com default cria overload, não substitui.
drop function if exists public.apply_service_to_client(
  uuid, uuid, text, text, numeric, text, numeric, numeric, numeric, boolean, text,
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
  p_notes text,
  p_client_entity_id uuid default null
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
  v_entity_id uuid := p_client_entity_id;
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

  if v_entity_id is not null and not exists (
    select 1
    from public.client_entities as entity
    where entity.id = v_entity_id
      and entity.workspace_id = v_workspace_id
      and entity.client_id = p_client_id
      and entity.archived_at is null
      and entity.status = 'active'
  ) then
    raise foreign_key_violation using message = 'client entity is not available';
  end if;

  v_company_revenue := round(case p_discount_type
    when 'percentage' then p_list_price * (1 - p_discount_value / 100)
    when 'fixed' then p_list_price - p_discount_value
    else p_list_price
  end, 2);

  if v_company_revenue < 0 then
    raise check_violation using message = 'discount exceeds list price';
  end if;

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
    workspace_id, client_id, client_entity_id, service_id, name, description,
    list_price, discount_type, discount_value, company_revenue,
    media_budget, additional_fee, additional_fee_is_revenue, billing_type,
    start_date, next_due_date,
    installment_count, promotional_price, promotional_cycles, promotional_cycles_used,
    adjustment_interval_months, adjustment_rate, next_adjustment_date, status, notes
  ) values (
    v_workspace_id, p_client_id, v_entity_id, v_catalog_service_id, v_normalized_name,
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

  v_first_revenue := coalesce(p_promotional_price, v_company_revenue);
  v_total := v_company_revenue + p_media_budget + p_additional_fee;

  if p_billing_type = 'single' then
    if v_total = 0 then
      insert into public.charges (
        workspace_id, client_id, client_entity_id, client_service_id, description, due_date,
        company_revenue, media_budget, additional_fee, additional_fee_is_revenue, status
      ) values (
        v_workspace_id, p_client_id, v_entity_id, v_service_instance_id, v_normalized_name,
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
          workspace_id, client_id, client_entity_id, client_service_id, description, due_date,
          company_revenue, media_budget, additional_fee, additional_fee_is_revenue, status
        ) values (
          v_workspace_id, p_client_id, v_entity_id, v_service_instance_id,
          v_normalized_name || case when p_installment_count > 1
            then ' · parcela ' || v_index || '/' || p_installment_count else '' end,
          private.add_months_clamped(p_next_due_date, v_index - 1),
          v_charge_revenue, v_charge_media, v_charge_additional, v_is_revenue, 'pending'
        );
      end loop;
    end if;
  else
    insert into public.charges (
      workspace_id, client_id, client_entity_id, client_service_id, description, due_date,
      company_revenue, media_budget, additional_fee, additional_fee_is_revenue, status
    ) values (
      v_workspace_id, p_client_id, v_entity_id, v_service_instance_id, v_normalized_name, p_next_due_date,
      v_first_revenue, p_media_budget, p_additional_fee, v_is_revenue, 'pending'
    );
  end if;

  return v_service_instance_id;
end;
$$;

revoke all on function public.apply_service_to_client(
  uuid, uuid, text, text, numeric, text, numeric, numeric, numeric, boolean, text,
  date, date, integer, numeric, integer, integer, numeric, text, uuid
) from public, anon, authenticated;
grant execute on function public.apply_service_to_client(
  uuid, uuid, text, text, numeric, text, numeric, numeric, numeric, boolean, text,
  date, date, integer, numeric, integer, integer, numeric, text, uuid
) to authenticated;

-- Liquidação herda client_entity_id do serviço (ou da cobrança atual).
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
  v_entity_id uuid;
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

  v_entity_id := coalesce(v_service.client_entity_id, v_charge.client_entity_id);
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

  if not exists (
    select 1 from public.charges
    where client_service_id = v_service.id
      and due_date = v_next_due_date
      and status <> 'cancelled'
  ) then
    insert into public.charges (
      workspace_id, client_id, client_entity_id, client_service_id, description, due_date,
      company_revenue, media_budget, additional_fee, additional_fee_is_revenue, status
    ) values (
      v_service.workspace_id, v_service.client_id, v_entity_id, v_service.id, v_service.name,
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

-- delete_client_record também bloqueia se existirem entidades.
create or replace function public.delete_client_record(p_client_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
begin
  select client.workspace_id
  into v_workspace_id
  from public.clients as client
  where client.id = p_client_id
  for update;

  if v_workspace_id is null then
    return 'not_found';
  end if;

  if (select auth.uid()) is null
    or not (select private.is_active_workspace_owner(v_workspace_id)) then
    raise insufficient_privilege using message = 'active workspace owner required';
  end if;

  if exists (
    select 1 from public.client_services where workspace_id = v_workspace_id and client_id = p_client_id
    union all
    select 1 from public.charges where workspace_id = v_workspace_id and client_id = p_client_id
    union all
    select 1 from public.expenses where workspace_id = v_workspace_id and client_id = p_client_id
    union all
    select 1 from public.domains where workspace_id = v_workspace_id and client_id = p_client_id
    union all
    select 1 from public.client_entities where workspace_id = v_workspace_id and client_id = p_client_id
  ) then
    return 'blocked';
  end if;

  delete from public.client_contacts
  where workspace_id = v_workspace_id and client_id = p_client_id;

  delete from public.clients
  where workspace_id = v_workspace_id and id = p_client_id;

  return 'deleted';
end;
$$;
