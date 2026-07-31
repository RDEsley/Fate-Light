create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active',
  currency text not null default 'BRL',
  timezone text not null default 'America/Sao_Paulo',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  archived_at timestamptz,
  constraint workspaces_name_length_check
    check (char_length(btrim(name)) between 2 and 120),
  constraint workspaces_status_check
    check (status in ('active', 'suspended', 'deletion_pending', 'deleted')),
  constraint workspaces_currency_check
    check (currency ~ '^[A-Z]{3}$'),
  constraint workspaces_timezone_check
    check (private.is_valid_timezone(timezone)),
  constraint workspaces_archived_status_check
    check (archived_at is null or status in ('deletion_pending', 'deleted')),
  constraint workspaces_one_per_creator_unique unique (created_by)
);

create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function private.set_updated_at();

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner',
  status text not null default 'active',
  joined_at timestamptz not null default statement_timestamp(),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  primary key (workspace_id, user_id),
  constraint workspace_members_role_check check (role = 'owner'),
  constraint workspace_members_status_check check (status in ('active', 'suspended')),
  constraint workspace_members_one_workspace_per_user_unique unique (user_id)
);

create unique index workspace_members_one_active_owner_idx
  on public.workspace_members (workspace_id)
  where role = 'owner' and status = 'active';

create index workspace_members_active_owner_lookup_idx
  on public.workspace_members (user_id, workspace_id)
  where role = 'owner' and status = 'active';

create trigger workspace_members_set_updated_at
before update on public.workspace_members
for each row execute function private.set_updated_at();

comment on table public.workspace_members is
  'Fonte de autorização do tenant; somente owner é funcional no MVP.';
