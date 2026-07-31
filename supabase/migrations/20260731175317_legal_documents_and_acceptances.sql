create table public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  document_type text not null,
  version text not null,
  content_markdown text not null,
  content_hash text not null,
  published_at timestamptz,
  effective_at timestamptz,
  retired_at timestamptz,
  status text not null default 'draft',
  is_required boolean not null default true,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint legal_documents_type_check
    check (document_type in ('terms_of_use', 'privacy_policy')),
  constraint legal_documents_version_length_check
    check (char_length(btrim(version)) between 1 and 40),
  constraint legal_documents_content_check
    check (char_length(content_markdown) between 20 and 1000000),
  constraint legal_documents_hash_check
    check (
      content_hash ~ '^[0-9a-f]{64}$'
      and content_hash = encode(extensions.digest(convert_to(content_markdown, 'UTF8'), 'sha256'), 'hex')
    ),
  constraint legal_documents_status_check
    check (status in ('draft', 'published', 'retired')),
  constraint legal_documents_publication_check
    check (
      (status = 'draft' and published_at is null and effective_at is null and retired_at is null)
      or
      (status = 'published' and published_at is not null and effective_at is not null and retired_at is null)
      or
      (status = 'retired' and published_at is not null and effective_at is not null and retired_at is not null)
    ),
  constraint legal_documents_retirement_order_check
    check (retired_at is null or retired_at >= effective_at),
  constraint legal_documents_type_version_unique unique (document_type, version),
  constraint legal_documents_id_version_unique unique (id, version)
);

create unique index legal_documents_one_published_type_idx
  on public.legal_documents (document_type)
  where status = 'published';

create index legal_documents_current_lookup_idx
  on public.legal_documents (document_type, effective_at desc)
  where status = 'published' and is_required;

create trigger legal_documents_set_updated_at
before update on public.legal_documents
for each row execute function private.set_updated_at();

create table public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  legal_document_id uuid not null,
  document_version text not null,
  accepted_at timestamptz not null default statement_timestamp(),
  source text not null default 'onboarding',
  created_at timestamptz not null default statement_timestamp(),
  constraint legal_acceptances_source_check
    check (source in ('onboarding', 'legal_update')),
  constraint legal_acceptances_document_fk
    foreign key (legal_document_id, document_version)
    references public.legal_documents(id, version)
    on update restrict on delete restrict,
  constraint legal_acceptances_user_document_unique
    unique (user_id, legal_document_id)
);

create index legal_acceptances_user_accepted_at_idx
  on public.legal_acceptances (user_id, accepted_at desc);

create index legal_acceptances_document_idx
  on public.legal_acceptances (legal_document_id, document_version);

comment on table public.legal_documents is
  'Versões legais; o seed contém somente placeholders explicitamente fictícios.';

comment on table public.legal_acceptances is
  'Registro insert-only do documento e versão aceitos pelo usuário.';
