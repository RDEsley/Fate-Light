create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  locale text not null default 'pt-BR',
  timezone text not null default 'America/Sao_Paulo',
  theme text not null default 'system',
  account_status text not null default 'active',
  last_seen_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint profiles_full_name_length_check
    check (char_length(btrim(full_name)) between 2 and 120),
  constraint profiles_phone_length_check
    check (phone is null or char_length(btrim(phone)) between 7 and 32),
  constraint profiles_locale_check
    check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  constraint profiles_timezone_check
    check (private.is_valid_timezone(timezone)),
  constraint profiles_theme_check
    check (theme in ('light', 'dark', 'system')),
  constraint profiles_account_status_check
    check (account_status in ('active', 'suspended', 'deletion_pending', 'deleted'))
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

comment on table public.profiles is
  'Dados de apresentação e preferências; identidade sensível permanece em auth.users.';
