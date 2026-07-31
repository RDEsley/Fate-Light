-- Conteúdo exclusivamente fictício para desenvolvimento local.
-- Estes textos não constituem termos jurídicos nem política de privacidade reais.

with legal_seed (
  id,
  document_type,
  version,
  content_markdown,
  published_at,
  effective_at
) as (
  values
    (
      '10000000-0000-4000-8000-000000000001'::uuid,
      'terms_of_use'::text,
      'dev-2026.07.1'::text,
      E'# Termos de Uso — placeholder de desenvolvimento\n\nConteúdo fictício, sem validade jurídica, criado somente para testar versionamento e aceite local.'::text,
      '2026-07-31 00:00:00+00'::timestamptz,
      '2026-07-31 00:00:00+00'::timestamptz
    ),
    (
      '10000000-0000-4000-8000-000000000002'::uuid,
      'privacy_policy'::text,
      'dev-2026.07.1'::text,
      E'# Política de Privacidade — placeholder de desenvolvimento\n\nConteúdo fictício, sem validade jurídica, criado somente para testar versionamento e aceite local.'::text,
      '2026-07-31 00:00:00+00'::timestamptz,
      '2026-07-31 00:00:00+00'::timestamptz
    )
)
insert into public.legal_documents (
  id,
  document_type,
  version,
  content_markdown,
  content_hash,
  published_at,
  effective_at,
  status,
  is_required
)
select
  id,
  document_type,
  version,
  content_markdown,
  encode(extensions.digest(convert_to(content_markdown, 'UTF8'), 'sha256'), 'hex'),
  published_at,
  effective_at,
  'published',
  true
from legal_seed
on conflict (document_type, version) do nothing;
