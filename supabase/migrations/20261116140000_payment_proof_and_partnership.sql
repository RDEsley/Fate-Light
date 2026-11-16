-- Comprovante de pagamento e início da parceria (ADR-0025).
--
-- 1. O comprovante reaproveita `fiscal_documents`: mesmo bucket privado, mesmas policies,
--    mesmo limite de tamanho e a mesma regra de só anexar a registro já pago. Ganha apenas
--    uma coluna `kind` para separar de nota fiscal. As rotinas de limpeza e de exclusão
--    corretiva já recolhem os arquivos dessa tabela, então o comprovante sai junto.
-- 2. `client_directory` passa a expor `first_paid_at`, o instante do primeiro pagamento
--    confirmado do cliente. É o começo da parceria: derivado das cobranças pagas, nunca
--    gravado, então excluir um pagamento corrigido por engano recalcula sozinho.

alter table public.fiscal_documents
  add column kind text not null default 'invoice';

alter table public.fiscal_documents
  add constraint fiscal_documents_kind_check
  check (kind in ('invoice', 'payment_proof'));

alter table public.fiscal_documents
  drop constraint fiscal_documents_filename_check;

alter table public.fiscal_documents
  add constraint fiscal_documents_filename_check
  check (
    (kind = 'invoice' and safe_filename ~ '^nota-fiscal\.(pdf|jpg|jpeg|png|webp)$')
    or (kind = 'payment_proof' and safe_filename ~ '^comprovante\.(pdf|jpg|jpeg|png|webp)$')
  );

-- Comprovante é do recebimento de uma cobrança; despesa continua só com nota fiscal.
alter table public.fiscal_documents
  add constraint fiscal_documents_proof_parent_check
  check (kind <> 'payment_proof' or charge_id is not null);

comment on column public.fiscal_documents.kind is
  'invoice = nota fiscal; payment_proof = comprovante de pagamento de uma cobrança.';

-- Só entra coluna nova no fim: `create or replace view` não reordena as existentes.
create or replace view public.client_directory
with (security_invoker = true) as
select
  client.id,
  client.workspace_id,
  client.name,
  client.trade_name,
  client.email,
  client.phone,
  client.website,
  client.links,
  client.notes,
  client.commercial_status,
  client.archived_at,
  case client.commercial_status
    when 'active' then 0
    when 'budget' then 1
    when 'pending' then 2
    when 'inactive' then 3
    when 'blacklist' then 4
    else 5
  end as status_rank,
  coalesce(service_totals.active_services, 0) as active_services,
  service_totals.first_service_start,
  coalesce(charge_totals.lifetime_revenue, 0)::numeric(15,2) as lifetime_revenue,
  coalesce(charge_totals.overdue_charges, 0) as overdue_charges,
  coalesce(domain_totals.expiring_domains, 0) as expiring_domains,
  charge_totals.first_paid_at
from public.clients as client
left join lateral (
  select
    count(*) filter (where service.status = 'active') as active_services,
    min(service.start_date) as first_service_start
  from public.client_services as service
  where service.workspace_id = client.workspace_id
    and service.client_id = client.id
) as service_totals on true
left join lateral (
  select
    sum(charge.company_revenue) filter (where charge.status = 'paid') as lifetime_revenue,
    count(*) filter (
      where charge.status = 'pending' and charge.due_date < current_date
    ) as overdue_charges,
    min(charge.paid_at) filter (where charge.status = 'paid') as first_paid_at
  from public.charges as charge
  where charge.workspace_id = client.workspace_id
    and charge.client_id = client.id
) as charge_totals on true
left join lateral (
  select count(*) as expiring_domains
  from public.domains as domain
  where domain.workspace_id = client.workspace_id
    and domain.client_id = client.id
    and domain.status = 'active'
    and domain.expires_on <= current_date + 30
) as domain_totals on true;

comment on view public.client_directory is
  'Clientes com totais operacionais já agregados, para ordenar e paginar a listagem sem trazer cobranças aninhadas. first_paid_at é o primeiro pagamento confirmado, início da parceria.';
