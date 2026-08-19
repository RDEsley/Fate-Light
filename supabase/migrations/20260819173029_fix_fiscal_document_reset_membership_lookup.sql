create or replace function public.reset_current_workspace_operational_data_with_documents(
  p_confirmation text
)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_workspace_id uuid;
  v_object_paths text[];
begin
  if p_confirmation is distinct from 'EXCLUIR TUDO' then
    raise invalid_parameter_value using message = 'invalid confirmation';
  end if;

  select member.workspace_id
  into v_workspace_id
  from public.workspace_members as member
  join public.workspaces as workspace on workspace.id = member.workspace_id
  join public.profiles as profile on profile.id = member.user_id
  where member.user_id = v_user_id
    and member.role = 'owner'
    and member.status = 'active'
    and workspace.status = 'active'
    and profile.account_status = 'active'
  limit 1
  for update of workspace;

  if v_user_id is null or v_workspace_id is null then
    raise insufficient_privilege using message = 'active workspace owner required';
  end if;

  select coalesce(array_agg(document.object_path order by document.object_path), array[]::text[])
  into v_object_paths
  from public.fiscal_documents as document
  where document.workspace_id = v_workspace_id;

  delete from public.fiscal_documents
  where workspace_id = v_workspace_id;

  perform public.reset_current_workspace_operational_data(p_confirmation);
  return v_object_paths;
end;
$$;

comment on function public.reset_current_workspace_operational_data_with_documents(text) is
  'Exclui dados operacionais e devolve os caminhos privados de NF para limpeza posterior do Storage.';
