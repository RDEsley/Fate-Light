-- Os documentos vigentes precisam ser consultáveis antes do cadastro. A policy
-- expõe somente conteúdo publicado e dentro da vigência; histórico, rascunhos e
-- aceites continuam privados.
grant select (id, document_type, version, content_markdown, effective_at)
  on table public.legal_documents to anon;

create policy legal_documents_select_current_public
on public.legal_documents
for select
to anon
using (
  status = 'published'
  and effective_at <= statement_timestamp()
  and (retired_at is null or retired_at > statement_timestamp())
);
