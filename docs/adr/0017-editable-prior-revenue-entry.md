# ADR-0017 — Edição e exclusão do lançamento de receita anterior ao sistema

Status: aceita em 2026-08-06.

## Contexto

O cadastro de cliente tem uma seção "Já trabalhei com este cliente antes"
([ADR-0015](0015-client-states-and-service-lifecycle-experience.md)) que grava
o total já recebido antes do sistema como uma única cobrança `paid`, com
`description = 'Histórico anterior ao sistema'`, `payment_method = 'Histórico'`
e `client_service_id` nulo.

Essa cobrança nunca aparecia de volta no formulário: reabrir "Editar cliente" e
preencher o campo de novo criava **outra** cobrança, duplicando o valor. E
como toda cobrança paga é protegida por `delete_workspace_record`
([ADR-0013](0013-operational-deletion-and-service-lifecycle.md)), também não
havia como apagar um valor digitado errado — a única saída era editar a
cobrança direto em `/cobrancas`, sem contexto de que ela representa um resumo,
não um pagamento real registrado no fluxo normal.

## Decisão

- **O formulário de cliente passa a listar os lançamentos de histórico já
  gravados** para aquele cliente, com valor e data, permitindo editar (some
  vira update, não um novo insert) ou excluir cada um.
- **A edição usa `update` direto na tabela `charges`**, sem RPC nova: a
  política de UPDATE do owner sobre `charges` já existe e é usada por
  `recordChargeDelayReason`/`cancelCharge`. O filtro exige `client_id`,
  `workspace_id` **e** `payment_method = 'Histórico'` com
  `client_service_id is null`, então a ação não alcança nenhuma cobrança fora
  desse marcador.
- **A exclusão ganha uma exceção estreita em `delete_workspace_record`**: o
  bloqueio de cobrança paga deixa de valer quando a cobrança bate
  simultaneamente com `client_service_id is null`, `payment_method = 'Histórico'`
  e a nota fixa gravada por `recordPriorRevenue`. Fora dessa combinação exata,
  o bloqueio da ADR-0013 continua absoluto — nenhuma outra cobrança paga passa
  a ser excluível por esta mudança.
- **A justificativa é a mesma da ADR-0016**: este valor é um resumo que o
  próprio dono digitou para preencher o passado, não um recebimento passado
  pelo fluxo normal de cobrança. Corrigir ou remover um resumo digitado errado
  é diferente de apagar um pagamento que o sistema registrou de verdade.

## Alternativas consideradas

- *Nova coluna booleana `is_prior_revenue_summary`*: resolveria a
  identificação sem casar três campos de texto, mas é migration de schema para
  um caso que já tem um marcador funcional único no sistema (nenhum outro
  fluxo grava exatamente essa combinação). Adiada até haver um segundo caso de
  uso que precise da coluna.
- *Bloquear reenvio do campo quando já existe um lançamento*: rejeitada. Não
  resolve o pedido de corrigir ou remover um valor digitado errado, só evita
  piorar a duplicação.

## Consequências

- `delete_workspace_record('charge', id)` deixa de ser um bloqueio
  incondicional para cobrança paga; a exceção precisa ser coberta por teste de
  banco (bloqueia cobrança paga comum, libera o marcador exato, isolamento por
  workspace).
- Series de valor "histórico anterior" continuam contando para receita total
  do cliente até serem explicitamente editadas ou excluídas pelo dono.
