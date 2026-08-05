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
    v_action := v_entity_type || '.' || (v_new ->> 'status');
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
