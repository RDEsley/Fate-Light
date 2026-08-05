# ADR-0013 — Exclusão operacional e ciclo de cobrança de serviços

Status: aceita em 2026-08-03.

## Contexto

O produto precisa permitir excluir cadastros criados por engano, reativar serviços, ajustar a
periodicidade das cobranças futuras e oferecer ao owner uma forma clara de reiniciar os dados
operacionais do workspace. Essas ações não podem violar o histórico financeiro, o isolamento entre
workspaces ou as regras de auditoria.

## Decisão

- Um cliente só pode ser excluído quando não possui serviços, cobranças, despesas ou domínios
  vinculados. Contatos sem histórico são removidos na mesma transação.
- Serviços só podem ser excluídos depois de encerrados e quando não possuem cobranças vinculadas.
- Cobranças e despesas pagas nunca podem ser excluídas. Registros ainda não confirmados podem ser
  removidos; cancelamento continua sendo a correção preferencial quando houver histórico relevante.
- Domínios precisam ser cancelados antes da exclusão.
- Serviços encerrados podem ser reativados. Alterar frequência ou próximo vencimento afeta apenas o
  planejamento futuro e não modifica cobranças existentes.
- A frequência simples do MVP admite ocorrência única, diária, semanal, quinzenal, mensal,
  bimestral, trimestral, semestral e anual.
- “Excluir todos os dados” remove, em uma única transação, somente os dados operacionais do workspace
  atual. Conta, perfil, vínculo de owner, identidade da empresa e preferências permanecem.
- As funções privilegiadas validam `auth.uid()`, membership owner ativa e workspace ativo. O acesso é
  revogado de `PUBLIC` e `anon` e concedido explicitamente a `authenticated`.

## Consequências

- A interface precisa explicar quando a exclusão é bloqueada e oferecer encerramento ou inativação.
- A limpeza do workspace exige a expressão exata `EXCLUIR TUDO` e não pode ser desfeita pela
  aplicação.
- Novas entidades financeiras deverão ser incluídas explicitamente na função de limpeza antes de
  sua publicação.
- Testes de banco devem provar isolamento, bloqueio de históricos confirmados e atomicidade.
