# ADR-0025 — Comprovante de pagamento e início da parceria

Status: aceita em 2026-11-16.
Complementa: [ADR-0023](0023-payment-date-on-settlement.md).

## Contexto

Ao dar baixa em uma cobrança só era possível registrar a forma de pagamento; o comprovante ficava
fora do sistema. Os cartões de cliente mostravam o tempo desde o início do primeiro serviço, mas a
parceria só começa de fato quando o cliente paga pela primeira vez.

## Decisão

- O comprovante reaproveita `fiscal_documents` (bucket privado, RLS, limite de 4 MB, só em registro
  pago, limpeza e exclusão já existentes). A tabela ganha `kind` (`invoice` | `payment_proof`); o
  nome de arquivo seguro acompanha o tipo (`nota-fiscal.*` / `comprovante.*`).
- Comprovante só existe para cobrança, nunca para despesa (check no banco).
- O diálogo "Receber" tem um campo de arquivo opcional. O servidor valida o arquivo **antes** de dar
  baixa; arquivo inválido não gera pagamento. Se o envio falhar depois da baixa, o pagamento é
  mantido, o usuário vê um aviso e pode anexar de novo na cobrança paga.
- `client_directory` passa a expor `first_paid_at`: o menor `paid_at` entre as cobranças pagas. É
  derivado, não gravado; excluir um pagamento lançado por engano recalcula o início da parceria.
- O cartão do cliente mostra "Parceria há X" calculado por datas civis no fuso do workspace, e
  "Aguardando 1º pagamento" quando ainda não houve pagamento.

## Alternativas descartadas

- Tabela própria de comprovantes: duplicaria storage, policies e rotinas de limpeza.
- Gravar a data de início da parceria no cliente: ficaria desatualizada ao corrigir pagamentos.

## Consequências

- A baixa em lote ("Receber vencidas") não recebe comprovante; anexar é feito por cobrança.
- O tempo de parceria aparece nos cartões da lista, não na ficha do cliente.

## Verificação

pgTAP `payment_proof_and_partnership_test.sql`; testes Vitest de `partnershipFrom`, da baixa com
comprovante, do painel e do cartão.
