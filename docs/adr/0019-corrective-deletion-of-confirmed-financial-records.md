# ADR-0019 — Exclusão corretiva de movimentos financeiros confirmados

Status: aceita em 2026-09-08.
Supersede parcialmente: [ADR-0013](0013-operational-deletion-and-service-lifecycle.md)
(proibição absoluta de apagar cobrança/despesa paga), no escopo restrito abaixo.
Não altera: [ADR-0017](0017-editable-prior-revenue-entry.md) (resumo de histórico anterior).

## Contexto

A ADR-0013 proibiu exclusão destrutiva de movimentos financeiros já liquidados para
proteger o histórico gerencial. Na operação real, o usuário precisa corrigir lançamento
pago registrado por engano (valor errado, cliente errado, duplicata). Sem exclusão
corretiva, o Dashboard, o cliente e o histórico ficam permanentemente distorcidos.

O Fate Light é um sistema gerencial leve, não contabilidade formal nem livro fiscal.
A correção preferida nesta versão é **excluir e recriar**, não editar cobrança/despesa
paga com um editor complexo.

Anexos em `fiscal_documents` usam `ON DELETE RESTRICT` e objetos no bucket privado
`workspace-documents`. Apagar só a linha financeira deixaria NF órfã ou falharia a FK.

## Decisão

- O **owner ativo** do workspace pode excluir cobrança ou despesa **já paga** por meio
  de uma RPC dedicada (`delete_paid_financial_record`), com confirmação forte na UI
  (hold de ~3 s e texto explícito de irreversibilidade).
- A operação remove metadados fiscais do registro, devolve `object_paths` e a Server
  Action limpa o Storage privado em seguida. O usuário não precisa apagar a NF antes.
- `delete_workspace_record` continua bloqueando pago no caminho operacional comum
  (pendente/cancelado e a exceção do histórico anterior da ADR-0017).
- Pendentes e canceladas seguem o fluxo operacional já existente.
- `activity_events` preserva trilha mínima (`charge.deleted` / `expense.deleted`); o
  lançamento apagado deixa de entrar em métricas, Dashboard, cliente e histórico
  financeiro ativo.
- Despesas mensais recorrentes: exclusão corretiva de uma ocorrência paga não reativa
  nem duplica a série; a recorrência segue as regras da migration de despesas mensais.
- Exclusão corretiva **não** é ação casual: continua owner-only, confirmada e auditada.

## Alternativas consideradas

- Editor completo de cobrança/despesa paga: adiado; maior superfície de inconsistência.
- Soft-delete com flag `voided`: adicionaria complexidade de consultas/métricas nesta
  rodada sem benefício claro para o usuário.
- Manter a proibição absoluta: rejeitada por fricção operacional comprovada.

## Consequências

- Documentação de produto e README deixam de prometer “pago nunca apaga”.
- Testes pgTAP cobrem owner, cross-workspace, anon, NF+paths e segunda chamada.
- Falha de limpeza no Storage após commit SQL deve ser tratada sem reexpor o arquivo;
  a consistência relacional prevalece.

## Verificação

- UI: ação “Excluir” em cobrança/despesa paga com ConfirmDialog reforçado.
- Banco: RPC security definer, `search_path` vazio, grants mínimos, owner check.
- App: revalidação de Dashboard, Cobranças/Despesas, Histórico e Cliente.
