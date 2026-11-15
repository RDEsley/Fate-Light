# ADR-0022 — Cobrança pendente editável e agenda do serviço sincronizada com o vencimento

Status: aceita em 2026-11-15.
Complementa: [ADR-0001](0001-financial-natures.md) (receita própria, mídia e repasses separados) e
[ADR-0018](0018-additional-fee-nature.md) (natureza do adicional).

## Contexto

A cobrança não tinha edição: para corrigir vencimento, valor ou descrição era preciso cancelar ou
excluir e criar outra. Além disso, o "próximo vencimento" do serviço recorrente e o vencimento da
cobrança pendente do ciclo atual eram datas independentes. Remarcar uma não movia a outra, e o
ciclo seguinte (calculado a partir do vencimento da cobrança paga) nascia na data errada.

## Decisão

- Somente cobrança **pendente** é editável: descrição, vencimento, receita própria, verba de mídia,
  adicional e sua natureza, e observações. A atualização filtra por `id`, `workspace_id` da sessão e
  `status = 'pending'`; cobrança paga ou cancelada nunca é reescrita. Cliente, entidade, serviço e
  situação não mudam por esse caminho.
- Remarcar a cobrança pendente do ciclo atual de um serviço recorrente (a que está na data do
  `next_due_date`) move o `next_due_date` do serviço para a nova data, pelo trigger
  `charges_sync_service_cycle` (`security invoker`, sujeito às mesmas policies de quem editou).
- Editar o "próximo vencimento" do serviço em `update_client_service` move a cobrança pendente que
  estava na data antiga, desde que não exista cobrança não cancelada na data nova.
- Cobrança avulsa e parcela de venda única não mexem na agenda.

## Alternativas consideradas

- Manter a cobrança imutável e oferecer só "cancelar e recriar": preserva rastro, mas é o atrito que
  motivou a mudança; o histórico de atividades (`activity_events`) já registra a alteração.
- Sincronizar no servidor da aplicação com duas escritas: deixaria serviço e cobrança divergentes se
  a segunda falhasse.

## Consequências

- O ciclo seguinte passa a contar da data remarcada, que é o comportamento esperado por quem
  remarca o vencimento.
- O grant de `update (additional_fee_is_revenue)` em `charges` foi concedido para a edição.

## Verificação

pgTAP `edit_pending_charge_syncs_service_cycle_test.sql`; Vitest `charge-edit.test.tsx`.
