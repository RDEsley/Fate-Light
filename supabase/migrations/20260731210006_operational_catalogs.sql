create or replace function private.is_valid_vendor_contact(p_contact jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_contact is null
    or (
      jsonb_typeof(p_contact) = 'object'
      and octet_length(p_contact::text) <= 2048
      and not exists (
        select 1
        from jsonb_object_keys(p_contact) as contact_key
        where contact_key not in ('name', 'email', 'phone')
      )
      and not exists (
        select 1
        from jsonb_each(p_contact) as contact_entry
        where jsonb_typeof(contact_entry.value) not in ('string', 'null')
          or (
            jsonb_typeof(contact_entry.value) = 'string'
            and char_length(btrim(contact_entry.value #>> '{}')) > 254
          )
      )
    );
$$;

create table public.services (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  name text not null,
  description text,
  default_component_kind text not null default 'service',
  default_financial_nature text not null default 'company_revenue',
  active boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid not null default auth.uid(),
  updated_by uuid not null default auth.uid(),
  archived_at timestamptz,
  constraint services_workspace_id_id_unique unique (workspace_id, id),
  constraint services_name_length_check
    check (char_length(btrim(name)) between 2 and 120),
  constraint services_description_length_check
    check (description is null or char_length(description) <= 3000),
  constraint services_component_kind_check
    check (default_component_kind ~ '^[a-z][a-z0-9_]{1,39}$'),
  constraint services_financial_nature_check
    check (default_financial_nature in ('company_revenue', 'managed_media', 'pass_through')),
  constraint services_archived_inactive_check
    check (archived_at is null or not active)
);

create unique index services_workspace_active_name_unique
  on public.services (workspace_id, lower(name))
  where active and archived_at is null;

create index services_workspace_active_name_idx
  on public.services (workspace_id, active, name);

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  name text not null,
  tax_id text,
  contact_json jsonb,
  notes text,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid not null default auth.uid(),
  updated_by uuid not null default auth.uid(),
  archived_at timestamptz,
  constraint vendors_workspace_id_id_unique unique (workspace_id, id),
  constraint vendors_name_length_check
    check (char_length(btrim(name)) between 2 and 160),
  constraint vendors_tax_id_check
    check (tax_id is null or tax_id ~ '^[0-9]{11}([0-9]{3})?$'),
  constraint vendors_contact_check check (private.is_valid_vendor_contact(contact_json)),
  constraint vendors_notes_length_check
    check (notes is null or char_length(notes) <= 5000)
);

create index vendors_workspace_name_active_idx
  on public.vendors (workspace_id, lower(name))
  where archived_at is null;

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  name text not null,
  default_nature text not null default 'operating_expense',
  color text,
  active boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid not null default auth.uid(),
  updated_by uuid not null default auth.uid(),
  archived_at timestamptz,
  constraint expense_categories_workspace_id_id_unique unique (workspace_id, id),
  constraint expense_categories_name_length_check
    check (char_length(btrim(name)) between 2 and 100),
  constraint expense_categories_nature_check
    check (
      default_nature in (
        'operating_expense',
        'direct_cost',
        'managed_media_spend',
        'pass_through_disbursement'
      )
    ),
  constraint expense_categories_color_check
    check (color is null or color ~ '^#[0-9A-F]{6}$'),
  constraint expense_categories_archived_inactive_check
    check (archived_at is null or not active)
);

create unique index expense_categories_workspace_active_name_unique
  on public.expense_categories (workspace_id, lower(name))
  where active and archived_at is null;

create index expense_categories_workspace_active_name_idx
  on public.expense_categories (workspace_id, active, name);

comment on table public.services is
  'Catálogo sem preço contratual; natureza e componente são apenas padrões revisáveis.';

comment on table public.vendors is
  'Fornecedor operacional sem totais, saldos ou credenciais.';

comment on table public.expense_categories is
  'Classificação gerencial sem hierarquia ou semântica de plano de contas.';
