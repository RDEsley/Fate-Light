alter table public.services
  add column default_price numeric(15,2) not null default 0,
  add column default_billing_type text not null default 'monthly',
  add column default_adjustment_interval_months smallint,
  add column default_adjustment_rate numeric(6,3);

alter table public.services
  add constraint services_default_price_check check (default_price >= 0),
  add constraint services_default_billing_type_check check (
    default_billing_type in (
      'single', 'daily', 'weekly', 'biweekly', 'monthly', 'bimonthly',
      'quarterly', 'semiannual', 'annual'
    )
  ),
  add constraint services_adjustment_defaults_check check (
    (default_adjustment_interval_months is null and default_adjustment_rate is null)
    or (
      default_adjustment_interval_months between 1 and 60
      and default_adjustment_rate between 0 and 100
    )
  );

alter table public.client_services
  add column service_id uuid,
  add column list_price numeric(15,2),
  add column discount_type text not null default 'none',
  add column discount_value numeric(15,2) not null default 0,
  add column installment_count smallint not null default 1,
  add column promotional_price numeric(15,2),
  add column promotional_cycles smallint,
  add column promotional_cycles_used smallint not null default 0,
  add column adjustment_interval_months smallint,
  add column adjustment_rate numeric(6,3),
  add column next_adjustment_date date,
  add column ended_at timestamptz;

update public.client_services
set
  list_price = company_revenue,
  ended_at = case when status = 'ended' then updated_at else null end;

alter table public.client_services
  alter column list_price set not null,
  add constraint client_services_catalog_fk
    foreign key (workspace_id, service_id)
    references public.services (workspace_id, id)
    on delete restrict,
  add constraint client_services_price_policy_check check (
    list_price >= 0
    and discount_value >= 0
    and (
      (discount_type = 'none' and discount_value = 0)
      or (discount_type = 'percentage' and discount_value <= 100)
      or (discount_type = 'fixed' and discount_value <= list_price)
    )
  ),
  add constraint client_services_installments_check check (installment_count between 1 and 120),
  add constraint client_services_promotion_check check (
    (promotional_price is null and promotional_cycles is null and promotional_cycles_used = 0)
    or (
      promotional_price >= 0
      and promotional_cycles between 1 and 60
      and promotional_cycles_used between 0 and promotional_cycles
    )
  ),
  add constraint client_services_adjustment_check check (
    (adjustment_interval_months is null and adjustment_rate is null and next_adjustment_date is null)
    or (
      adjustment_interval_months between 1 and 60
      and adjustment_rate between 0 and 100
      and next_adjustment_date is not null
    )
  ),
  add constraint client_services_ended_at_check check (
    (status = 'active' and ended_at is null)
    or (status = 'ended' and ended_at is not null)
  );

create index client_services_workspace_catalog_idx
  on public.client_services (workspace_id, service_id)
  where service_id is not null;
create index client_services_workspace_adjustment_idx
  on public.client_services (workspace_id, next_adjustment_date)
  where status = 'active' and next_adjustment_date is not null;

alter table public.charges
  add column delay_reason_code text,
  add column delay_reason text,
  add column delay_recorded_at timestamptz;

alter table public.charges
  add constraint charges_delay_reason_check check (
    (delay_reason_code is null and delay_reason is null and delay_recorded_at is null)
    or (
      delay_reason_code in (
        'client_requested', 'invoice_issue', 'payment_rescheduled',
        'commercial_negotiation', 'internal_follow_up', 'other'
      )
      and char_length(btrim(delay_reason)) between 2 and 500
      and delay_recorded_at is not null
    )
  );

grant insert (default_price, default_billing_type, default_adjustment_interval_months, default_adjustment_rate)
on table public.services to authenticated;
grant update (default_price, default_billing_type, default_adjustment_interval_months, default_adjustment_rate)
on table public.services to authenticated;

grant insert (
  service_id, list_price, discount_type, discount_value, installment_count,
  promotional_price, promotional_cycles, promotional_cycles_used,
  adjustment_interval_months, adjustment_rate, next_adjustment_date, ended_at
) on table public.client_services to authenticated;
grant update (
  service_id, list_price, discount_type, discount_value, installment_count,
  promotional_price, promotional_cycles, promotional_cycles_used,
  adjustment_interval_months, adjustment_rate, next_adjustment_date, ended_at
) on table public.client_services to authenticated;
grant update (delay_reason_code, delay_reason, delay_recorded_at)
on table public.charges to authenticated;

create or replace function private.add_months_clamped(p_date date, p_months integer)
returns date
language sql
immutable
set search_path = ''
as $$
  select (
    date_trunc('month', p_date)
    + make_interval(months => p_months)
    + (
      least(
        extract(day from p_date)::integer,
        extract(day from (
          date_trunc('month', p_date)
          + make_interval(months => p_months + 1)
          - interval '1 day'
        ))::integer
      ) - 1
    ) * interval '1 day'
  )::date;
$$;

create or replace function private.next_billing_date(p_date date, p_billing_type text)
returns date
language sql
immutable
set search_path = ''
as $$
  select case p_billing_type
    when 'daily' then p_date + 1
    when 'weekly' then p_date + 7
    when 'biweekly' then p_date + 14
    when 'monthly' then private.add_months_clamped(p_date, 1)
    when 'bimonthly' then private.add_months_clamped(p_date, 2)
    when 'quarterly' then private.add_months_clamped(p_date, 3)
    when 'semiannual' then private.add_months_clamped(p_date, 6)
    when 'annual' then private.add_months_clamped(p_date, 12)
    else p_date
  end;
$$;

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
  v_company_revenue numeric(15,2);
  v_charge_revenue numeric(15,2);
  v_charge_media numeric(15,2);
  v_charge_additional numeric(15,2);
  v_index integer;
begin
  select client.workspace_id
  into v_workspace_id
  from public.clients as client
  where client.id = p_client_id
    and client.archived_at is null
    and client.commercial_status = 'active';

  if v_workspace_id is null
    or (select auth.uid()) is null
    or not (select private.is_active_workspace_owner(v_workspace_id)) then
    raise insufficient_privilege using message = 'active workspace owner required';
  end if;

  if p_service_id is not null and not exists (
    select 1 from public.services
    where id = p_service_id and workspace_id = v_workspace_id and active and archived_at is null
  ) then
    raise foreign_key_violation using message = 'catalog service is not available';
  end if;

  v_company_revenue := round(case p_discount_type
    when 'percentage' then p_list_price * (1 - p_discount_value / 100)
    when 'fixed' then p_list_price - p_discount_value
    else p_list_price
  end, 2);

  if v_company_revenue < 0 then
    raise check_violation using message = 'discount exceeds list price';
  end if;

  insert into public.client_services (
    workspace_id, client_id, service_id, name, description,
    list_price, discount_type, discount_value, company_revenue,
    media_budget, additional_fee, billing_type, start_date, next_due_date,
    installment_count, promotional_price, promotional_cycles, promotional_cycles_used,
    adjustment_interval_months, adjustment_rate, next_adjustment_date, status, notes
  ) values (
    v_workspace_id, p_client_id, p_service_id, btrim(p_name), nullif(btrim(p_description), ''),
    p_list_price, p_discount_type, p_discount_value, v_company_revenue,
    p_media_budget, p_additional_fee, p_billing_type, p_start_date, p_next_due_date,
    p_installment_count, p_promotional_price, p_promotional_cycles, 0,
    p_adjustment_interval_months, p_adjustment_rate,
    case when p_adjustment_interval_months is null then null
      else private.add_months_clamped(p_start_date, p_adjustment_interval_months) end,
    'active', nullif(btrim(p_notes), '')
  ) returning id into v_service_instance_id;

  if v_company_revenue + p_media_budget + p_additional_fee > 0 then
    if p_billing_type = 'single' then
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
          company_revenue, media_budget, additional_fee, status
        ) values (
          v_workspace_id, p_client_id, v_service_instance_id,
          p_name || case when p_installment_count > 1
            then ' · parcela ' || v_index || '/' || p_installment_count else '' end,
          private.add_months_clamped(p_next_due_date, v_index - 1),
          v_charge_revenue, v_charge_media, v_charge_additional, 'pending'
        );
      end loop;
    else
      insert into public.charges (
        workspace_id, client_id, client_service_id, description, due_date,
        company_revenue, media_budget, additional_fee, status
      ) values (
        v_workspace_id, p_client_id, v_service_instance_id, p_name, p_next_due_date,
        coalesce(p_promotional_price, v_company_revenue), p_media_budget, p_additional_fee, 'pending'
      );
    end if;
  end if;

  return v_service_instance_id;
end;
$$;

revoke all on function public.apply_service_to_client(
  uuid, uuid, text, text, numeric, text, numeric, numeric, numeric, text,
  date, date, integer, numeric, integer, integer, numeric, text
) from public, anon, authenticated;
grant execute on function public.apply_service_to_client(
  uuid, uuid, text, text, numeric, text, numeric, numeric, numeric, text,
  date, date, integer, numeric, integer, integer, numeric, text
) to authenticated;

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

  if v_next_revenue + v_service.media_budget + v_service.additional_fee > 0
    and not exists (
      select 1 from public.charges
      where client_service_id = v_service.id
        and due_date = v_next_due_date
        and status <> 'cancelled'
    ) then
    insert into public.charges (
      workspace_id, client_id, client_service_id, description, due_date,
      company_revenue, media_budget, additional_fee, status
    ) values (
      v_service.workspace_id, v_service.client_id, v_service.id, v_service.name,
      v_next_due_date, v_next_revenue, v_service.media_budget,
      v_service.additional_fee, 'pending'
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

revoke all on function public.settle_charge_and_schedule_next(uuid, text)
from public, anon, authenticated;
grant execute on function public.settle_charge_and_schedule_next(uuid, text) to authenticated;

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  client_id uuid,
  actor_user_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  summary text not null,
  event_data jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default statement_timestamp(),
  constraint activity_events_client_fk
    foreign key (workspace_id, client_id)
    references public.clients (workspace_id, id)
    on delete set null (client_id),
  constraint activity_events_entity_type_check check (
    entity_type in ('client', 'client_service', 'charge', 'expense', 'domain')
  ),
  constraint activity_events_action_check check (action ~ '^[a-z_]+\.[a-z_]+$'),
  constraint activity_events_summary_check check (char_length(btrim(summary)) between 2 and 240),
  constraint activity_events_data_check check (
    jsonb_typeof(event_data) = 'object' and octet_length(event_data::text) <= 32768
  )
);

create index activity_events_workspace_occurred_idx
  on public.activity_events (workspace_id, occurred_at desc);
create index activity_events_client_occurred_idx
  on public.activity_events (workspace_id, client_id, occurred_at desc)
  where client_id is not null;
create index activity_events_entity_occurred_idx
  on public.activity_events (workspace_id, entity_type, entity_id, occurred_at desc);

alter table public.activity_events enable row level security;
alter table public.activity_events force row level security;
revoke all privileges on table public.activity_events from public, anon, authenticated, service_role;
grant select on table public.activity_events to authenticated;

create policy activity_events_select_owner
on public.activity_events for select to authenticated
using ((select private.is_active_workspace_owner(workspace_id)));

create or replace function private.capture_activity_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new jsonb;
  v_old jsonb;
  v_workspace_id uuid;
  v_client_id uuid;
  v_entity_id uuid;
  v_entity_type text;
  v_action text;
  v_label text;
  v_summary text;
begin
  if (select auth.uid()) is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  if tg_op <> 'DELETE' then
    v_new := to_jsonb(new);
  end if;
  if tg_op <> 'INSERT' then
    v_old := to_jsonb(old);
  end if;

  v_workspace_id := coalesce((v_new ->> 'workspace_id')::uuid, (v_old ->> 'workspace_id')::uuid);
  v_client_id := coalesce((v_new ->> 'client_id')::uuid, (v_old ->> 'client_id')::uuid);
  v_entity_id := coalesce((v_new ->> 'id')::uuid, (v_old ->> 'id')::uuid);
  v_entity_type := case tg_table_name
    when 'clients' then 'client'
    when 'client_services' then 'client_service'
    when 'charges' then 'charge'
    when 'expenses' then 'expense'
    when 'domains' then 'domain'
  end;
  if v_entity_type = 'client' then
    v_client_id := case when tg_op = 'DELETE' then null else v_entity_id end;
  end if;
  v_label := coalesce(
    v_new ->> 'name', v_old ->> 'name',
    v_new ->> 'description', v_old ->> 'description',
    v_new ->> 'domain', v_old ->> 'domain',
    'Registro'
  );

  if tg_op = 'INSERT' then
    v_action := v_entity_type || '.created';
    v_summary := case v_entity_type
      when 'client' then 'Cliente ' || v_label || ' cadastrado'
      when 'client_service' then 'Serviço ' || v_label || ' aplicado ao cliente'
      when 'charge' then 'Cobrança ' || v_label || ' criada'
      when 'expense' then 'Despesa ' || v_label || ' registrada'
      else 'Domínio ' || v_label || ' adicionado'
    end;
  elsif tg_op = 'DELETE' then
    v_action := v_entity_type || '.deleted';
    v_summary := v_label || ' excluído';
  elsif v_entity_type = 'client_service' and v_old ->> 'status' <> v_new ->> 'status' then
    v_action := v_entity_type || '.' || case when v_new ->> 'status' = 'ended' then 'ended' else 'reactivated' end;
    v_summary := 'Serviço ' || v_label || case when v_new ->> 'status' = 'ended' then ' encerrado' else ' reativado' end;
  elsif v_entity_type = 'charge' and v_old ->> 'status' <> v_new ->> 'status' then
    v_action := v_entity_type || '.' || v_new ->> 'status';
    v_summary := 'Cobrança ' || v_label || case v_new ->> 'status' when 'paid' then ' paga' else ' cancelada' end;
  elsif v_entity_type = 'charge' and v_old ->> 'delay_recorded_at' is null and v_new ->> 'delay_recorded_at' is not null then
    v_action := 'charge.delay_explained';
    v_summary := 'Motivo do atraso registrado em ' || v_label;
  else
    v_action := v_entity_type || '.updated';
    v_summary := v_label || ' atualizado';
  end if;

  insert into public.activity_events (
    workspace_id, client_id, actor_user_id, entity_type, entity_id, action, summary, event_data
  ) values (
    v_workspace_id,
    v_client_id,
    (select auth.uid()),
    v_entity_type,
    v_entity_id,
    v_action,
    left(v_summary, 240),
    jsonb_build_object('before', v_old, 'after', v_new)
  );

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

revoke all on function private.capture_activity_event() from public, anon, authenticated;

create trigger clients_activity_event
after insert or update or delete on public.clients
for each row execute function private.capture_activity_event();
create trigger client_services_activity_event
after insert or update or delete on public.client_services
for each row execute function private.capture_activity_event();
create trigger charges_activity_event
after insert or update or delete on public.charges
for each row execute function private.capture_activity_event();
create trigger expenses_activity_event
after insert or update or delete on public.expenses
for each row execute function private.capture_activity_event();
create trigger domains_activity_event
after insert or update or delete on public.domains
for each row execute function private.capture_activity_event();

comment on table public.activity_events is
  'Linha do tempo operacional imutável e isolada por workspace para a interface de histórico.';

create or replace function public.reset_current_workspace_operational_data(p_confirmation text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_workspace_id uuid;
  v_counts jsonb;
begin
  if p_confirmation <> 'EXCLUIR TUDO' then
    raise invalid_parameter_value using message = 'invalid confirmation';
  end if;

  select member.workspace_id
  into v_workspace_id
  from public.workspace_members as member
  join public.workspaces as workspace on workspace.id = member.workspace_id
  join public.profiles as profile on profile.id = member.user_id
  where member.user_id = v_user_id
    and member.role = 'owner'
    and member.status = 'active'
    and workspace.status = 'active'
    and profile.account_status = 'active'
  limit 1
  for update of workspace;

  if v_user_id is null or v_workspace_id is null then
    raise insufficient_privilege using message = 'active workspace owner required';
  end if;

  select jsonb_build_object(
    'clients', (select count(*) from public.clients where workspace_id = v_workspace_id),
    'services', (select count(*) from public.client_services where workspace_id = v_workspace_id),
    'charges', (select count(*) from public.charges where workspace_id = v_workspace_id),
    'expenses', (select count(*) from public.expenses where workspace_id = v_workspace_id),
    'domains', (select count(*) from public.domains where workspace_id = v_workspace_id),
    'activities', (select count(*) from public.activity_events where workspace_id = v_workspace_id)
  ) into v_counts;

  delete from public.charges where workspace_id = v_workspace_id;
  delete from public.expenses where workspace_id = v_workspace_id;
  delete from public.domains where workspace_id = v_workspace_id;
  delete from public.client_services where workspace_id = v_workspace_id;
  delete from public.client_contacts where workspace_id = v_workspace_id;
  delete from public.clients where workspace_id = v_workspace_id;
  delete from public.services where workspace_id = v_workspace_id;
  delete from public.vendors where workspace_id = v_workspace_id;
  delete from public.expense_categories where workspace_id = v_workspace_id;
  delete from public.import_jobs where workspace_id = v_workspace_id;
  delete from public.audit_events where workspace_id = v_workspace_id;
  delete from public.activity_events where workspace_id = v_workspace_id;

  return v_counts;
end;
$$;

revoke all on function public.reset_current_workspace_operational_data(text)
from public, anon, authenticated;
grant execute on function public.reset_current_workspace_operational_data(text) to authenticated;
