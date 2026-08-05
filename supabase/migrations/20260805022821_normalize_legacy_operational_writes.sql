create or replace function private.normalize_client_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.commercial_status := coalesce(new.commercial_status, 'active');
  return new;
end;
$$;

revoke all on function private.normalize_client_write() from public, anon, authenticated;

create trigger normalize_client_write
before insert or update on public.clients
for each row execute function private.normalize_client_write();

create or replace function private.normalize_client_service_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.list_price := coalesce(new.list_price, new.company_revenue);

  if new.status = 'ended' then
    new.ended_at := coalesce(new.ended_at, statement_timestamp());
  else
    new.ended_at := null;
  end if;

  return new;
end;
$$;

revoke all on function private.normalize_client_service_write()
from public, anon, authenticated;

create trigger normalize_client_service_write
before insert or update on public.client_services
for each row execute function private.normalize_client_service_write();
