# ADR-0023 — Data do pagamento informada na baixa

Status: aceita em 2026-11-15.
Complementa: [ADR-0022](0022-editable-pending-charges-and-service-cycle-sync.md).

## Contexto

`settle_charge_and_schedule_next` e `settle_expense_and_schedule_next` gravavam `paid_at` com o
instante da baixa. Quem registra com atraso um pagamento que chegou dias antes — em especial na virada
do mês — via a receita ou o custo cair no mês errado do dashboard e do histórico.

## Decisão

- As duas funções ganham `p_paid_on date default null`. Sem ela, vale o instante atual, como antes.
- Com ela, `paid_at` é gravado às 12:00 UTC do dia informado, o mesmo critério da cobrança criada já
  paga, para cair no mesmo dia em qualquer fuso do Brasil.
- Data no futuro é recusada no banco (`current_date + 1` de folga para fuso) e, antes disso, na
  Server Action pelo fuso do workspace.
- O ciclo seguinte de serviços e despesas mensais continua contado a partir do **vencimento**, não
  da data do pagamento.
- A baixa em lote da ficha do cliente usa a mesma função para cada cobrança, na ordem do
  vencimento, somente com os ids exibidos ao usuário e confirmados no diálogo.

## Consequências

- As assinaturas antigas foram removidas (`drop function`) para não deixar a chamada com dois
  argumentos ambígua; grants foram refeitos para `authenticated`.
- Pagamentos antigos não são alterados.

## Verificação

pgTAP `settle_with_payment_date_test.sql`; Vitest `charge-edit.test.tsx` e `bulk-settle.test.tsx`.
