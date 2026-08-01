alter table public.clients
  add column email text,
  add column phone text;

update public.clients
set commercial_status = 'inactive'
where archived_at is null
  and commercial_status not in ('active', 'inactive');

alter table public.clients
  alter column commercial_status set default 'active',
  drop constraint clients_commercial_status_check,
  add constraint clients_commercial_status_check
    check (commercial_status in ('active', 'inactive', 'archived')),
  add constraint clients_email_check
    check (email is null or (char_length(email) between 3 and 254 and email = lower(email))),
  add constraint clients_phone_check
    check (phone is null or char_length(btrim(phone)) between 7 and 32);

grant insert (email, phone) on table public.clients to authenticated;
grant update (email, phone) on table public.clients to authenticated;

create table public.client_services (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  client_id uuid not null,
  name text not null,
  description text,
  company_revenue numeric(15,2) not null default 0,
  media_budget numeric(15,2) not null default 0,
  additional_fee numeric(15,2) not null default 0,
  billing_type text not null default 'monthly',
  start_date date not null,
  next_due_date date,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid not null default auth.uid(),
  updated_by uuid not null default auth.uid(),
  constraint client_services_workspace_id_id_unique unique (workspace_id, id),
  constraint client_services_workspace_client_id_unique unique (workspace_id, client_id, id),
  constraint client_services_client_fk
    foreign key (workspace_id, client_id)
    references public.clients (workspace_id, id)
    on delete restrict,
  constraint client_services_name_check check (char_length(btrim(name)) between 2 and 120),
  constraint client_services_description_check
    check (description is null or char_length(description) <= 3000),
  constraint client_services_values_check
    check (company_revenue >= 0 and media_budget >= 0 and additional_fee >= 0),
  constraint client_services_billing_type_check check (billing_type in ('single', 'monthly')),
  constraint client_services_status_check check (status in ('active', 'ended')),
  constraint client_services_dates_check
    check (next_due_date is null or next_due_date >= start_date),
  constraint client_services_notes_check check (notes is null or char_length(notes) <= 5000)
);

create index client_services_workspace_client_status_idx
  on public.client_services (workspace_id, client_id, status);
create index client_services_workspace_due_idx
  on public.client_services (workspace_id, next_due_date)
  where status = 'active' and next_due_date is not null;

create table public.charges (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  client_id uuid not null,
  client_service_id uuid,
  description text not null,
  due_date date not null,
  company_revenue numeric(15,2) not null default 0,
  media_budget numeric(15,2) not null default 0,
  additional_fee numeric(15,2) not null default 0,
  gross_total numeric(15,2)
    generated always as (company_revenue + media_budget + additional_fee) stored,
  status text not null default 'pending',
  paid_at timestamptz,
  payment_method text,
  notes text,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid not null default auth.uid(),
  updated_by uuid not null default auth.uid(),
  constraint charges_workspace_id_id_unique unique (workspace_id, id),
  constraint charges_client_fk
    foreign key (workspace_id, client_id)
    references public.clients (workspace_id, id)
    on delete restrict,
  constraint charges_service_fk
    foreign key (workspace_id, client_id, client_service_id)
    references public.client_services (workspace_id, client_id, id)
    on delete restrict,
  constraint charges_description_check check (char_length(btrim(description)) between 2 and 200),
  constraint charges_values_check
    check (company_revenue >= 0 and media_budget >= 0 and additional_fee >= 0 and gross_total > 0),
  constraint charges_status_check check (status in ('pending', 'paid', 'cancelled')),
  constraint charges_payment_check
    check ((status = 'paid' and paid_at is not null) or (status <> 'paid' and paid_at is null)),
  constraint charges_payment_method_check
    check (payment_method is null or char_length(btrim(payment_method)) between 2 and 80),
  constraint charges_notes_check check (notes is null or char_length(notes) <= 5000)
);

create index charges_workspace_due_status_idx on public.charges (workspace_id, due_date, status);
create index charges_workspace_paid_idx on public.charges (workspace_id, paid_at)
  where status = 'paid';
create index charges_client_idx on public.charges (workspace_id, client_id);
create index charges_service_idx on public.charges (workspace_id, client_service_id)
  where client_service_id is not null;

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  client_id uuid,
  description text not null,
  category text not null,
  amount numeric(15,2) not null,
  due_date date not null,
  status text not null default 'pending',
  paid_at timestamptz,
  expense_type text not null,
  notes text,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid not null default auth.uid(),
  updated_by uuid not null default auth.uid(),
  constraint expenses_workspace_id_id_unique unique (workspace_id, id),
  constraint expenses_client_fk
    foreign key (workspace_id, client_id)
    references public.clients (workspace_id, id)
    on delete restrict,
  constraint expenses_description_check check (char_length(btrim(description)) between 2 and 200),
  constraint expenses_category_check check (
    category in (
      'tools', 'artificial_intelligence', 'agents', 'staff_contractors', 'domains',
      'hosting', 'software', 'marketing', 'other'
    )
  ),
  constraint expenses_amount_check check (amount > 0),
  constraint expenses_status_check check (status in ('pending', 'paid')),
  constraint expenses_payment_check
    check ((status = 'paid' and paid_at is not null) or (status = 'pending' and paid_at is null)),
  constraint expenses_type_check check (expense_type in ('fixed', 'variable')),
  constraint expenses_notes_check check (notes is null or char_length(notes) <= 5000)
);

create index expenses_workspace_due_status_idx on public.expenses (workspace_id, due_date, status);
create index expenses_workspace_paid_idx on public.expenses (workspace_id, paid_at)
  where status = 'paid';
create index expenses_client_idx on public.expenses (workspace_id, client_id)
  where client_id is not null;

create table public.domains (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  client_id uuid not null,
  domain text not null,
  registrar text,
  expires_on date not null,
  auto_renew boolean not null default false,
  cost numeric(15,2),
  payment_responsibility text not null,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid not null default auth.uid(),
  updated_by uuid not null default auth.uid(),
  constraint domains_workspace_id_id_unique unique (workspace_id, id),
  constraint domains_client_fk
    foreign key (workspace_id, client_id)
    references public.clients (workspace_id, id)
    on delete restrict,
  constraint domains_name_check
    check (domain = lower(domain) and domain ~ '^[a-z0-9]([a-z0-9.-]{1,251}[a-z0-9])?$'),
  constraint domains_registrar_check
    check (registrar is null or char_length(btrim(registrar)) between 2 and 120),
  constraint domains_cost_check check (cost is null or cost >= 0),
  constraint domains_payment_responsibility_check
    check (char_length(btrim(payment_responsibility)) between 2 and 120),
  constraint domains_status_check check (status in ('active', 'cancelled')),
  constraint domains_notes_check check (notes is null or char_length(notes) <= 5000)
);

create unique index domains_workspace_active_name_unique
  on public.domains (workspace_id, lower(domain))
  where status = 'active';
create index domains_workspace_expiry_status_idx on public.domains (workspace_id, expires_on, status);
create index domains_client_idx on public.domains (workspace_id, client_id);

create or replace view public.charges_overview
with (security_invoker = true)
as
select
  charge.*,
  case
    when charge.status = 'pending' and charge.due_date < current_date then 'overdue'
    else charge.status
  end as effective_status,
  charge.company_revenue + charge.additional_fee as company_result_value
from public.charges as charge;

alter table public.client_services enable row level security;
alter table public.client_services force row level security;
alter table public.charges enable row level security;
alter table public.charges force row level security;
alter table public.expenses enable row level security;
alter table public.expenses force row level security;
alter table public.domains enable row level security;
alter table public.domains force row level security;

revoke all privileges on table
  public.client_services,
  public.charges,
  public.expenses,
  public.domains,
  public.charges_overview
from public, anon, authenticated, service_role;

grant select on table
  public.client_services,
  public.charges,
  public.expenses,
  public.domains,
  public.charges_overview
to authenticated;

grant insert (
  workspace_id, client_id, name, description, company_revenue, media_budget, additional_fee,
  billing_type, start_date, next_due_date, status, notes
) on table public.client_services to authenticated;
grant update (
  name, description, company_revenue, media_budget, additional_fee, billing_type,
  start_date, next_due_date, status, notes
) on table public.client_services to authenticated;

grant insert (
  workspace_id, client_id, client_service_id, description, due_date, company_revenue,
  media_budget, additional_fee, status, paid_at, payment_method, notes
) on table public.charges to authenticated;
grant update (
  client_service_id, description, due_date, company_revenue, media_budget, additional_fee,
  status, paid_at, payment_method, notes
) on table public.charges to authenticated;

grant insert (
  workspace_id, client_id, description, category, amount, due_date, status, paid_at,
  expense_type, notes
) on table public.expenses to authenticated;
grant update (
  client_id, description, category, amount, due_date, status, paid_at, expense_type, notes
) on table public.expenses to authenticated;

grant insert (
  workspace_id, client_id, domain, registrar, expires_on, auto_renew, cost,
  payment_responsibility, status, notes
) on table public.domains to authenticated;
grant update (
  client_id, domain, registrar, expires_on, auto_renew, cost, payment_responsibility, status, notes
) on table public.domains to authenticated;

create trigger client_services_set_updated_at
before update on public.client_services
for each row execute function private.set_updated_at();
create trigger client_services_set_updated_by
before update on public.client_services
for each row execute function private.set_operational_updated_by();
create trigger charges_set_updated_at
before update on public.charges
for each row execute function private.set_updated_at();
create trigger charges_set_updated_by
before update on public.charges
for each row execute function private.set_operational_updated_by();
create trigger expenses_set_updated_at
before update on public.expenses
for each row execute function private.set_updated_at();
create trigger expenses_set_updated_by
before update on public.expenses
for each row execute function private.set_operational_updated_by();
create trigger domains_set_updated_at
before update on public.domains
for each row execute function private.set_updated_at();
create trigger domains_set_updated_by
before update on public.domains
for each row execute function private.set_operational_updated_by();

create policy client_services_select_owner on public.client_services for select to authenticated
using ((select private.is_active_workspace_owner(workspace_id)));
create policy client_services_insert_owner on public.client_services for insert to authenticated
with check ((select private.is_active_workspace_owner(workspace_id)));
create policy client_services_update_owner on public.client_services for update to authenticated
using ((select private.is_active_workspace_owner(workspace_id)))
with check ((select private.is_active_workspace_owner(workspace_id)));

create policy charges_select_owner on public.charges for select to authenticated
using ((select private.is_active_workspace_owner(workspace_id)));
create policy charges_insert_owner on public.charges for insert to authenticated
with check ((select private.is_active_workspace_owner(workspace_id)));
create policy charges_update_owner on public.charges for update to authenticated
using ((select private.is_active_workspace_owner(workspace_id)))
with check ((select private.is_active_workspace_owner(workspace_id)));

create policy expenses_select_owner on public.expenses for select to authenticated
using ((select private.is_active_workspace_owner(workspace_id)));
create policy expenses_insert_owner on public.expenses for insert to authenticated
with check ((select private.is_active_workspace_owner(workspace_id)));
create policy expenses_update_owner on public.expenses for update to authenticated
using ((select private.is_active_workspace_owner(workspace_id)))
with check ((select private.is_active_workspace_owner(workspace_id)));

create policy domains_select_owner on public.domains for select to authenticated
using ((select private.is_active_workspace_owner(workspace_id)));
create policy domains_insert_owner on public.domains for insert to authenticated
with check ((select private.is_active_workspace_owner(workspace_id)));
create policy domains_update_owner on public.domains for update to authenticated
using ((select private.is_active_workspace_owner(workspace_id)))
with check ((select private.is_active_workspace_owner(workspace_id)));
