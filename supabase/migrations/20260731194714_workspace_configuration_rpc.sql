create or replace function private.update_current_workspace_configuration(
  p_workspace_name text,
  p_timezone text,
  p_legal_name text,
  p_trade_name text,
  p_tax_id text,
  p_address_line1 text,
  p_address_line2 text,
  p_address_district text,
  p_address_city text,
  p_address_region text,
  p_postal_code text,
  p_country_code text,
  p_date_format text,
  p_accounting_basis text,
  p_default_alert_offsets smallint[]
)
returns table (workspace_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_workspace_id uuid;
begin
  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication is required to update workspace configuration.';
  end if;

  select member.workspace_id
  into v_workspace_id
  from public.workspace_members as member
  join public.workspaces as workspace
    on workspace.id = member.workspace_id
  join public.profiles as profile
    on profile.id = member.user_id
  where member.user_id = v_user_id
    and member.role = 'owner'
    and member.status = 'active'
    and workspace.status = 'active'
    and profile.account_status = 'active';

  if v_workspace_id is null then
    raise exception using
      errcode = '42501',
      message = 'An active workspace owner is required.';
  end if;

  update public.workspaces
  set
    name = btrim(p_workspace_name),
    timezone = p_timezone
  where id = v_workspace_id;

  update public.workspace_settings
  set
    legal_name = btrim(p_legal_name),
    trade_name = nullif(btrim(p_trade_name), ''),
    tax_id = nullif(regexp_replace(p_tax_id, '[^0-9]', '', 'g'), ''),
    address_line1 = nullif(btrim(p_address_line1), ''),
    address_line2 = nullif(btrim(p_address_line2), ''),
    address_district = nullif(btrim(p_address_district), ''),
    address_city = nullif(btrim(p_address_city), ''),
    address_region = nullif(upper(btrim(p_address_region)), ''),
    postal_code = nullif(btrim(p_postal_code), ''),
    country_code = upper(p_country_code),
    date_format = p_date_format,
    accounting_basis = p_accounting_basis,
    default_alert_offsets = p_default_alert_offsets
  where workspace_settings.workspace_id = v_workspace_id;

  if not found then
    raise exception using
      errcode = '23514',
      message = 'Workspace settings are missing.';
  end if;

  return query select v_workspace_id;
end;
$$;

create or replace function public.update_current_workspace_configuration(
  p_workspace_name text,
  p_timezone text,
  p_legal_name text,
  p_trade_name text,
  p_tax_id text,
  p_address_line1 text,
  p_address_line2 text,
  p_address_district text,
  p_address_city text,
  p_address_region text,
  p_postal_code text,
  p_country_code text,
  p_date_format text,
  p_accounting_basis text,
  p_default_alert_offsets smallint[]
)
returns table (workspace_id uuid)
language sql
security invoker
set search_path = ''
as $$
  select *
  from private.update_current_workspace_configuration(
    p_workspace_name,
    p_timezone,
    p_legal_name,
    p_trade_name,
    p_tax_id,
    p_address_line1,
    p_address_line2,
    p_address_district,
    p_address_city,
    p_address_region,
    p_postal_code,
    p_country_code,
    p_date_format,
    p_accounting_basis,
    p_default_alert_offsets
  );
$$;

comment on function public.update_current_workspace_configuration(
  text, text, text, text, text, text, text, text, text, text, text, text, text, text, smallint[]
) is
  'Atualiza atomicamente o workspace ativo derivado de auth.uid() e suas configuracoes.';

revoke all privileges on function private.update_current_workspace_configuration(
  text, text, text, text, text, text, text, text, text, text, text, text, text, text, smallint[]
)
from public, anon, authenticated;

revoke all privileges on function public.update_current_workspace_configuration(
  text, text, text, text, text, text, text, text, text, text, text, text, text, text, smallint[]
)
from public, anon, authenticated;

grant execute on function private.update_current_workspace_configuration(
  text, text, text, text, text, text, text, text, text, text, text, text, text, text, smallint[]
) to authenticated;

grant execute on function public.update_current_workspace_configuration(
  text, text, text, text, text, text, text, text, text, text, text, text, text, text, smallint[]
) to authenticated;
