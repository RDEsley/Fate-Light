create table public.fiscal_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  charge_id uuid,
  expense_id uuid,
  bucket text not null default 'workspace-documents',
  object_path text not null,
  safe_filename text not null,
  mime_type text not null,
  size_bytes bigint not null,
  checksum_sha256 text not null,
  created_at timestamptz not null default statement_timestamp(),
  created_by uuid not null default auth.uid(),
  constraint fiscal_documents_workspace_id_id_unique unique (workspace_id, id),
  constraint fiscal_documents_charge_fk
    foreign key (workspace_id, charge_id)
    references public.charges (workspace_id, id)
    on delete restrict,
  constraint fiscal_documents_expense_fk
    foreign key (workspace_id, expense_id)
    references public.expenses (workspace_id, id)
    on delete restrict,
  constraint fiscal_documents_single_parent_check
    check ((charge_id is not null)::integer + (expense_id is not null)::integer = 1),
  constraint fiscal_documents_bucket_check check (bucket = 'workspace-documents'),
  constraint fiscal_documents_path_check
    check (object_path like workspace_id::text || '/fiscal/%'),
  constraint fiscal_documents_filename_check
    check (safe_filename ~ '^nota-fiscal\.(pdf|jpg|jpeg|png|webp)$'),
  constraint fiscal_documents_mime_check
    check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  constraint fiscal_documents_size_check check (size_bytes between 1 and 4194304),
  constraint fiscal_documents_checksum_check check (checksum_sha256 ~ '^[0-9a-f]{64}$'),
  constraint fiscal_documents_object_path_unique unique (bucket, object_path)
);

create index fiscal_documents_charge_idx
  on public.fiscal_documents (workspace_id, charge_id, created_at desc)
  where charge_id is not null;

create index fiscal_documents_expense_idx
  on public.fiscal_documents (workspace_id, expense_id, created_at desc)
  where expense_id is not null;

create or replace function private.validate_fiscal_document_parent()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status text;
begin
  if new.charge_id is not null then
    select charge.status
    into v_status
    from public.charges as charge
    where charge.workspace_id = new.workspace_id
      and charge.id = new.charge_id;
  else
    select expense.status
    into v_status
    from public.expenses as expense
    where expense.workspace_id = new.workspace_id
      and expense.id = new.expense_id;
  end if;

  if v_status is distinct from 'paid' then
    raise exception using
      errcode = '23514',
      message = 'Fiscal documents can only be attached to paid records.';
  end if;

  return new;
end;
$$;

create trigger fiscal_documents_validate_parent
before insert or update of workspace_id, charge_id, expense_id
on public.fiscal_documents
for each row execute function private.validate_fiscal_document_parent();

alter table public.fiscal_documents enable row level security;
alter table public.fiscal_documents force row level security;

revoke all privileges on table public.fiscal_documents from public, anon, authenticated, service_role;
grant select, insert, delete on table public.fiscal_documents to authenticated;

create policy fiscal_documents_select_owner
on public.fiscal_documents for select to authenticated
using ((select private.is_active_workspace_owner(workspace_id)));

create policy fiscal_documents_insert_owner
on public.fiscal_documents for insert to authenticated
with check (
  (select private.is_active_workspace_owner(workspace_id))
  and created_by = (select auth.uid())
);

create policy fiscal_documents_delete_owner
on public.fiscal_documents for delete to authenticated
using ((select private.is_active_workspace_owner(workspace_id)));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'workspace-documents',
  'workspace-documents',
  false,
  4194304,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy workspace_documents_select_owner
on storage.objects for select to authenticated
using (
  bucket_id = 'workspace-documents'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and (select private.is_active_workspace_owner(((storage.foldername(name))[1])::uuid))
);

create policy workspace_documents_insert_owner
on storage.objects for insert to authenticated
with check (
  bucket_id = 'workspace-documents'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and (select private.is_active_workspace_owner(((storage.foldername(name))[1])::uuid))
  and owner_id = (select auth.uid()::text)
);

create policy workspace_documents_delete_owner
on storage.objects for delete to authenticated
using (
  bucket_id = 'workspace-documents'
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and (select private.is_active_workspace_owner(((storage.foldername(name))[1])::uuid))
);

-- Remove os metadados na mesma transação antes das contas protegidas por FK e
-- devolve os caminhos à aplicação, que conclui a limpeza no Storage privado.
create or replace function public.reset_current_workspace_operational_data_with_documents(
  p_confirmation text
)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
  v_object_paths text[];
begin
  if p_confirmation is distinct from 'EXCLUIR TUDO' then
    raise invalid_parameter_value using message = 'invalid confirmation';
  end if;

  select membership.workspace_id
  into v_workspace_id
  from public.workspace_memberships as membership
  where membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and membership.role = 'owner'
  order by membership.created_at
  limit 1;

  if v_workspace_id is null then
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

revoke all on function public.reset_current_workspace_operational_data_with_documents(text)
from public, anon, authenticated;
grant execute on function public.reset_current_workspace_operational_data_with_documents(text)
to authenticated;

comment on function public.reset_current_workspace_operational_data_with_documents(text) is
  'Exclui dados operacionais e devolve os caminhos privados de NF para limpeza posterior do Storage.';

-- A exclusão forçada não pode deixar objetos privados órfãos. O dono remove
-- primeiro as notas fiscais pela tela de cobranças e então confirma a exclusão.
create or replace function public.delete_client_service_cascade(
  p_service_id uuid,
  p_force boolean
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
begin
  select service.workspace_id
  into v_workspace_id
  from public.client_services as service
  where service.id = p_service_id
  for update;

  if v_workspace_id is null then
    return 'not_found';
  end if;

  if (select auth.uid()) is null
    or not (select private.is_active_workspace_owner(v_workspace_id)) then
    raise insufficient_privilege using message = 'active workspace owner required';
  end if;

  if exists (
    select 1
    from public.fiscal_documents as document
    join public.charges as charge
      on charge.workspace_id = document.workspace_id
      and charge.id = document.charge_id
    where charge.workspace_id = v_workspace_id
      and charge.client_service_id = p_service_id
  ) then
    return 'documents_attached';
  end if;

  if not coalesce(p_force, false) and exists (
    select 1 from public.charges
    where workspace_id = v_workspace_id
      and client_service_id = p_service_id
      and (status = 'paid' or paid_at is not null)
  ) then
    return 'blocked';
  end if;

  delete from public.charges
  where workspace_id = v_workspace_id and client_service_id = p_service_id;

  delete from public.client_services
  where workspace_id = v_workspace_id and id = p_service_id;

  return 'deleted';
end;
$$;

comment on table public.fiscal_documents is
  'Metadados de notas fiscais privadas anexadas exclusivamente a cobranças ou despesas pagas.';

comment on function private.validate_fiscal_document_parent() is
  'Recusa notas fiscais sem registro financeiro pago no mesmo workspace.';
