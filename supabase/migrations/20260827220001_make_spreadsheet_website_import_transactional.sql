create or replace function public.import_workspace_spreadsheet_v2(
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
  v_result jsonb;
  v_record jsonb;
begin
  v_result := public.import_workspace_spreadsheet(
    p_workspace_id,
    p_source_checksum,
    p_source_type,
    p_payload
  );

  if v_result ->> 'status' <> 'imported' then
    return v_result;
  end if;

  for v_record in
    select value
    from jsonb_array_elements(coalesce(p_payload -> 'clients', '[]'::jsonb))
    where nullif(btrim(value ->> 'website'), '') is not null
  loop
    update public.clients as client
    set website = nullif(btrim(v_record ->> 'website'), '')
    where client.workspace_id = p_workspace_id
      and client.archived_at is null
      and lower(client.name) = lower(v_record ->> 'name')
      and client.website is null;
  end loop;

  return v_result;
end;
$$;

revoke all on function public.import_workspace_spreadsheet_v2(uuid, text, text, jsonb)
from public, anon;
grant execute on function public.import_workspace_spreadsheet_v2(uuid, text, text, jsonb)
to authenticated;

comment on function public.import_workspace_spreadsheet_v2(uuid, text, text, jsonb) is
  'Importa o lote e seus sites na mesma transação; mantém a função original para compatibilidade.';
