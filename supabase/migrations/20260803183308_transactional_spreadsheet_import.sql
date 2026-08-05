create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  source_checksum text not null,
  source_type text not null,
  mapping_version text not null,
  row_count integer not null,
  entity_counts jsonb not null default '{}'::jsonb,
  status text not null default 'confirmed',
  confirmed_at timestamptz not null default statement_timestamp(),
  created_at timestamptz not null default statement_timestamp(),
  created_by uuid not null default auth.uid(),
  constraint import_jobs_workspace_id_id_unique unique (workspace_id, id),
  constraint import_jobs_idempotency_unique
    unique (workspace_id, source_checksum, mapping_version),
  constraint import_jobs_checksum_check check (source_checksum ~ '^[a-f0-9]{64}$'),
  constraint import_jobs_source_type_check check (source_type in ('xlsx', 'csv')),
  constraint import_jobs_mapping_version_check
    check (char_length(mapping_version) between 1 and 40),
  constraint import_jobs_row_count_check check (row_count between 1 and 1000),
  constraint import_jobs_entity_counts_check
    check (jsonb_typeof(entity_counts) = 'object' and pg_column_size(entity_counts) <= 4096),
  constraint import_jobs_status_check check (status = 'confirmed')
);

create index import_jobs_workspace_created_idx
  on public.import_jobs (workspace_id, created_at desc);

alter table public.import_jobs enable row level security;
alter table public.import_jobs force row level security;

revoke all privileges on table public.import_jobs from public, anon, authenticated, service_role;
grant select on table public.import_jobs to authenticated;
grant insert (
  workspace_id, source_checksum, source_type, mapping_version, row_count, entity_counts, status
) on table public.import_jobs to authenticated;
grant update (entity_counts) on table public.import_jobs to authenticated;

create policy import_jobs_select_owner on public.import_jobs for select to authenticated
using ((select private.is_active_workspace_owner(workspace_id)));
create policy import_jobs_insert_owner on public.import_jobs for insert to authenticated
with check ((select private.is_active_workspace_owner(workspace_id)));
create policy import_jobs_update_owner on public.import_jobs for update to authenticated
using ((select private.is_active_workspace_owner(workspace_id)))
with check ((select private.is_active_workspace_owner(workspace_id)));

create or replace function public.import_workspace_spreadsheet(
  p_workspace_id uuid,
  p_source_checksum text,
  p_source_type text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_job_id uuid;
  v_record jsonb;
  v_client_id uuid;
  v_service_id uuid;
  v_clients integer := 0;
  v_services integer := 0;
  v_charges integer := 0;
  v_expenses integer := 0;
  v_domains integer := 0;
  v_skipped integer := 0;
  v_row_count integer;
  v_counts jsonb;
begin
  if (select auth.uid()) is null
    or not (select private.is_active_workspace_owner(p_workspace_id)) then
    raise insufficient_privilege using message = 'active workspace owner required';
  end if;

  if p_source_checksum !~ '^[a-f0-9]{64}$'
    or p_source_type not in ('xlsx', 'csv')
    or jsonb_typeof(p_payload) <> 'object' then
    raise invalid_parameter_value using message = 'invalid import contract';
  end if;

  v_row_count :=
    jsonb_array_length(coalesce(p_payload -> 'clients', '[]'::jsonb)) +
    jsonb_array_length(coalesce(p_payload -> 'services', '[]'::jsonb)) +
    jsonb_array_length(coalesce(p_payload -> 'charges', '[]'::jsonb)) +
    jsonb_array_length(coalesce(p_payload -> 'expenses', '[]'::jsonb)) +
    jsonb_array_length(coalesce(p_payload -> 'domains', '[]'::jsonb));

  if v_row_count < 1 or v_row_count > 1000 then
    raise invalid_parameter_value using message = 'invalid import row count';
  end if;

  begin
    insert into public.import_jobs (
      workspace_id, source_checksum, source_type, mapping_version, row_count, entity_counts, status
    ) values (
      p_workspace_id, p_source_checksum, p_source_type, 'mvp-1', v_row_count, '{}'::jsonb, 'confirmed'
    ) returning id into v_job_id;
  exception when unique_violation then
    return jsonb_build_object('status', 'duplicate');
  end;

  for v_record in select value from jsonb_array_elements(coalesce(p_payload -> 'clients', '[]'::jsonb)) loop
    begin
      select client.id into strict v_client_id
      from public.clients as client
      where client.workspace_id = p_workspace_id
        and client.archived_at is null
        and lower(client.name) = lower(v_record ->> 'name');
    exception when no_data_found then
      v_client_id := null;
    end;

    if v_client_id is null then
      insert into public.clients (
        workspace_id, kind, name, trade_name, commercial_status, email, phone, notes
      ) values (
        p_workspace_id,
        case when nullif(v_record ->> 'companyName', '') is null then 'person' else 'company' end,
        v_record ->> 'name',
        nullif(v_record ->> 'companyName', ''),
        v_record ->> 'status',
        nullif(v_record ->> 'email', ''),
        nullif(v_record ->> 'phone', ''),
        nullif(v_record ->> 'notes', '')
      ) returning id into v_client_id;
      v_clients := v_clients + 1;
    else
      v_skipped := v_skipped + 1;
    end if;
  end loop;

  for v_record in select value from jsonb_array_elements(coalesce(p_payload -> 'services', '[]'::jsonb)) loop
    select client.id into strict v_client_id
    from public.clients as client
    where client.workspace_id = p_workspace_id
      and client.archived_at is null
      and lower(client.name) = lower(v_record ->> 'clientName');

    select service.id into v_service_id
    from public.client_services as service
    where service.workspace_id = p_workspace_id
      and service.client_id = v_client_id
      and lower(service.name) = lower(v_record ->> 'name')
      and service.start_date = (v_record ->> 'startDate')::date
    limit 1;

    if v_service_id is null then
      insert into public.client_services (
        workspace_id, client_id, name, description, company_revenue, media_budget,
        additional_fee, billing_type, start_date, next_due_date, status, notes
      ) values (
        p_workspace_id, v_client_id, v_record ->> 'name', nullif(v_record ->> 'description', ''),
        (v_record ->> 'companyRevenue')::numeric, (v_record ->> 'mediaBudget')::numeric,
        (v_record ->> 'additionalFee')::numeric, v_record ->> 'billingType',
        (v_record ->> 'startDate')::date, nullif(v_record ->> 'nextDueDate', '')::date,
        'active', nullif(v_record ->> 'notes', '')
      ) returning id into v_service_id;
      v_services := v_services + 1;
    else
      v_skipped := v_skipped + 1;
    end if;
  end loop;

  for v_record in select value from jsonb_array_elements(coalesce(p_payload -> 'charges', '[]'::jsonb)) loop
    select client.id into strict v_client_id
    from public.clients as client
    where client.workspace_id = p_workspace_id
      and client.archived_at is null
      and lower(client.name) = lower(v_record ->> 'clientName');

    v_service_id := null;
    if nullif(v_record ->> 'serviceName', '') is not null then
      select service.id into strict v_service_id
      from public.client_services as service
      where service.workspace_id = p_workspace_id
        and service.client_id = v_client_id
        and service.status = 'active'
        and lower(service.name) = lower(v_record ->> 'serviceName');
    end if;

    if exists (
      select 1 from public.charges as charge
      where charge.workspace_id = p_workspace_id
        and charge.client_id = v_client_id
        and charge.due_date = (v_record ->> 'dueDate')::date
        and lower(charge.description) = lower(v_record ->> 'description')
        and charge.status <> 'cancelled'
    ) then
      v_skipped := v_skipped + 1;
    else
      insert into public.charges (
        workspace_id, client_id, client_service_id, description, due_date, company_revenue,
        media_budget, additional_fee, status, paid_at, payment_method, notes
      ) values (
        p_workspace_id, v_client_id, v_service_id, v_record ->> 'description',
        (v_record ->> 'dueDate')::date, (v_record ->> 'companyRevenue')::numeric,
        (v_record ->> 'mediaBudget')::numeric, (v_record ->> 'additionalFee')::numeric,
        v_record ->> 'status', nullif(v_record ->> 'paidAt', '')::timestamptz,
        nullif(v_record ->> 'paymentMethod', ''), nullif(v_record ->> 'notes', '')
      );
      v_charges := v_charges + 1;
    end if;
  end loop;

  for v_record in select value from jsonb_array_elements(coalesce(p_payload -> 'expenses', '[]'::jsonb)) loop
    v_client_id := null;
    if nullif(v_record ->> 'clientName', '') is not null then
      select client.id into strict v_client_id
      from public.clients as client
      where client.workspace_id = p_workspace_id
        and client.archived_at is null
        and lower(client.name) = lower(v_record ->> 'clientName');
    end if;

    if exists (
      select 1 from public.expenses as expense
      where expense.workspace_id = p_workspace_id
        and expense.due_date = (v_record ->> 'dueDate')::date
        and expense.amount = (v_record ->> 'amount')::numeric
        and lower(expense.description) = lower(v_record ->> 'description')
    ) then
      v_skipped := v_skipped + 1;
    else
      insert into public.expenses (
        workspace_id, client_id, description, category, amount, due_date, status, paid_at,
        expense_type, notes
      ) values (
        p_workspace_id, v_client_id, v_record ->> 'description', v_record ->> 'category',
        (v_record ->> 'amount')::numeric, (v_record ->> 'dueDate')::date,
        v_record ->> 'status', nullif(v_record ->> 'paidAt', '')::timestamptz,
        v_record ->> 'expenseType', nullif(v_record ->> 'notes', '')
      );
      v_expenses := v_expenses + 1;
    end if;
  end loop;

  for v_record in select value from jsonb_array_elements(coalesce(p_payload -> 'domains', '[]'::jsonb)) loop
    select client.id into strict v_client_id
    from public.clients as client
    where client.workspace_id = p_workspace_id
      and client.archived_at is null
      and lower(client.name) = lower(v_record ->> 'clientName');

    if exists (
      select 1 from public.domains as domain_record
      where domain_record.workspace_id = p_workspace_id
        and domain_record.status = 'active'
        and lower(domain_record.domain) = lower(v_record ->> 'domain')
    ) then
      v_skipped := v_skipped + 1;
    else
      insert into public.domains (
        workspace_id, client_id, domain, registrar, expires_on, auto_renew, cost,
        payment_responsibility, status, notes
      ) values (
        p_workspace_id, v_client_id, lower(v_record ->> 'domain'),
        nullif(v_record ->> 'registrar', ''), (v_record ->> 'expiresOn')::date,
        (v_record ->> 'autoRenew')::boolean, nullif(v_record ->> 'cost', '')::numeric,
        v_record ->> 'paymentResponsibility', 'active', nullif(v_record ->> 'notes', '')
      );
      v_domains := v_domains + 1;
    end if;
  end loop;

  v_counts := jsonb_build_object(
    'clients', v_clients,
    'services', v_services,
    'charges', v_charges,
    'expenses', v_expenses,
    'domains', v_domains,
    'skipped', v_skipped
  );

  update public.import_jobs
  set entity_counts = v_counts
  where id = v_job_id and workspace_id = p_workspace_id;

  return jsonb_build_object('status', 'imported', 'jobId', v_job_id, 'counts', v_counts);
exception
  when no_data_found then
    raise invalid_parameter_value using message = 'unresolved import relation';
  when too_many_rows then
    raise invalid_parameter_value using message = 'ambiguous import relation';
end;
$$;

revoke all on function public.import_workspace_spreadsheet(uuid, text, text, jsonb)
from public, anon;
grant execute on function public.import_workspace_spreadsheet(uuid, text, text, jsonb)
to authenticated;

comment on table public.import_jobs is
  'Metadados mínimos de lotes confirmados; o arquivo original não é persistido.';
comment on function public.import_workspace_spreadsheet(uuid, text, text, jsonb) is
  'Importa um payload previamente validado em uma única transação sob RLS e grants do owner ativo.';
