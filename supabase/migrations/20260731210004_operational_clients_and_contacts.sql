create or replace function private.are_valid_tags(p_tags text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_tags is not null
    and cardinality(p_tags) <= 20
    and not exists (
      select 1
      from unnest(p_tags) as tag
      where tag is null
        or tag <> btrim(tag)
        or char_length(tag) not between 1 and 40
    )
    and (
      select count(distinct lower(tag)) = cardinality(p_tags)
      from unnest(p_tags) as tag
    );
$$;

create or replace function private.is_valid_client_address(p_address jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_address is null
    or (
      jsonb_typeof(p_address) = 'object'
      and octet_length(p_address::text) <= 4096
      and not exists (
        select 1
        from jsonb_object_keys(p_address) as address_key
        where address_key not in (
          'line1',
          'line2',
          'district',
          'city',
          'region',
          'postal_code',
          'country_code'
        )
      )
      and not exists (
        select 1
        from jsonb_each(p_address) as address_entry
        where jsonb_typeof(address_entry.value) not in ('string', 'null')
          or (
            jsonb_typeof(address_entry.value) = 'string'
            and char_length(btrim(address_entry.value #>> '{}')) > 160
          )
      )
    );
$$;

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  kind text not null,
  name text not null,
  trade_name text,
  tax_id text,
  address_json jsonb,
  commercial_status text not null default 'lead',
  notes text,
  tags text[] not null default '{}'::text[],
  responsible_name text,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid not null default auth.uid(),
  updated_by uuid not null default auth.uid(),
  archived_at timestamptz,
  constraint clients_workspace_id_id_unique unique (workspace_id, id),
  constraint clients_kind_check check (kind in ('person', 'company')),
  constraint clients_name_length_check
    check (char_length(btrim(name)) between 2 and 160),
  constraint clients_trade_name_length_check
    check (trade_name is null or char_length(btrim(trade_name)) between 2 and 160),
  constraint clients_tax_id_check
    check (tax_id is null or tax_id ~ '^[0-9]{11}([0-9]{3})?$'),
  constraint clients_address_check check (private.is_valid_client_address(address_json)),
  constraint clients_commercial_status_check
    check (commercial_status in ('lead', 'active', 'paused', 'inactive', 'archived')),
  constraint clients_archive_status_check
    check ((commercial_status = 'archived') = (archived_at is not null)),
  constraint clients_notes_length_check
    check (notes is null or char_length(notes) <= 5000),
  constraint clients_tags_check check (private.are_valid_tags(tags)),
  constraint clients_responsible_name_length_check
    check (responsible_name is null or char_length(btrim(responsible_name)) between 2 and 120)
);

create index clients_workspace_status_active_idx
  on public.clients (workspace_id, commercial_status)
  where archived_at is null;

create index clients_workspace_name_idx
  on public.clients (workspace_id, lower(name));

create index clients_workspace_tags_idx
  on public.clients using gin (tags);

create table public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  client_id uuid not null,
  name text not null,
  email text,
  phone text,
  role text,
  is_primary boolean not null default false,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid not null default auth.uid(),
  updated_by uuid not null default auth.uid(),
  archived_at timestamptz,
  constraint client_contacts_workspace_id_id_unique unique (workspace_id, id),
  constraint client_contacts_client_fk
    foreign key (workspace_id, client_id)
    references public.clients (workspace_id, id)
    on delete restrict,
  constraint client_contacts_name_length_check
    check (char_length(btrim(name)) between 2 and 120),
  constraint client_contacts_email_check
    check (
      email is null
      or (
        email = lower(btrim(email))
        and char_length(email) between 3 and 254
        and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      )
    ),
  constraint client_contacts_phone_length_check
    check (phone is null or char_length(btrim(phone)) between 7 and 32),
  constraint client_contacts_channel_check
    check (email is not null or phone is not null),
  constraint client_contacts_role_length_check
    check (role is null or char_length(btrim(role)) between 2 and 80)
);

create index client_contacts_workspace_client_idx
  on public.client_contacts (workspace_id, client_id);

create unique index client_contacts_one_primary_active_idx
  on public.client_contacts (workspace_id, client_id)
  where is_primary and archived_at is null;

comment on table public.clients is
  'Cadastro operacional; situação financeira é derivada e não é armazenada nesta tabela.';

comment on table public.client_contacts is
  'Contatos isolados pela FK composta de cliente e workspace.';
