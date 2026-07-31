create schema if not exists private;

revoke all on schema private from public;

create extension if not exists pgcrypto with schema extensions;

create or replace function private.is_valid_timezone(p_timezone text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_timezone is not null
    and exists (
      select 1
      from pg_catalog.pg_timezone_names
      where name = p_timezone
    );
$$;

create or replace function private.are_valid_alert_offsets(p_offsets smallint[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_offsets is not null
    and cardinality(p_offsets) between 1 and 10
    and not exists (
      select 1
      from unnest(p_offsets) as offset_value
      where offset_value is null or offset_value < 0 or offset_value > 365
    )
    and (
      select count(distinct offset_value) = cardinality(p_offsets)
      from unnest(p_offsets) as offset_value
    );
$$;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := statement_timestamp();
  return new;
end;
$$;

comment on schema private is
  'Funções e auditoria internas, fora dos schemas expostos pela Data API.';
