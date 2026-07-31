create table public.workspace_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  legal_name text not null,
  trade_name text,
  tax_id text,
  address_line1 text,
  address_line2 text,
  address_district text,
  address_city text,
  address_region text,
  postal_code text,
  country_code text not null default 'BR',
  date_format text not null default 'DD/MM/YYYY',
  accounting_basis text not null default 'cash',
  default_alert_offsets smallint[] not null default array[30, 15, 7, 1]::smallint[],
  general_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint workspace_settings_legal_name_length_check
    check (char_length(btrim(legal_name)) between 2 and 160),
  constraint workspace_settings_trade_name_length_check
    check (trade_name is null or char_length(btrim(trade_name)) between 2 and 160),
  constraint workspace_settings_tax_id_check
    check (tax_id is null or tax_id ~ '^[0-9]{11}([0-9]{3})?$'),
  constraint workspace_settings_country_code_check
    check (country_code ~ '^[A-Z]{2}$'),
  constraint workspace_settings_date_format_check
    check (date_format in ('DD/MM/YYYY', 'YYYY-MM-DD')),
  constraint workspace_settings_accounting_basis_check
    check (accounting_basis in ('cash', 'accrual')),
  constraint workspace_settings_alert_offsets_check
    check (private.are_valid_alert_offsets(default_alert_offsets)),
  constraint workspace_settings_general_settings_check
    check (
      jsonb_typeof(general_settings) = 'object'
      and octet_length(general_settings::text) <= 8192
    ),
  constraint workspace_settings_address_line1_length_check
    check (address_line1 is null or char_length(btrim(address_line1)) between 2 and 160),
  constraint workspace_settings_address_line2_length_check
    check (address_line2 is null or char_length(btrim(address_line2)) between 1 and 160),
  constraint workspace_settings_address_district_length_check
    check (address_district is null or char_length(btrim(address_district)) between 2 and 100),
  constraint workspace_settings_address_city_length_check
    check (address_city is null or char_length(btrim(address_city)) between 2 and 100),
  constraint workspace_settings_address_region_length_check
    check (address_region is null or char_length(btrim(address_region)) between 2 and 100),
  constraint workspace_settings_postal_code_length_check
    check (postal_code is null or char_length(btrim(postal_code)) between 3 and 20)
);

create trigger workspace_settings_set_updated_at
before update on public.workspace_settings
for each row execute function private.set_updated_at();
