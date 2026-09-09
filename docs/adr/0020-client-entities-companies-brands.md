# ADR-0020 — Empresas e marcas dentro do cliente

Status: aceita em 2026-09-09.
Não altera: [ADR-0001](0001-financial-natures.md) (naturezas financeiras),
[ADR-0002](0002-multi-tenant.md) (isolamento por workspace),
[ADR-0018](0018-additional-fee-nature.md) (natureza do adicional).
Relacionada: [ADR-0013](0013-operational-deletion-and-service-lifecycle.md) (arquivamento em vez
de exclusão) e [ADR-0011](0011-transactional-spreadsheet-import.md) (importação).

## Contexto

O cadastro de cliente do Fate Light supunha uma relação comercial igual a um nome. Na operação
real, o mesmo contratante costuma ter mais de uma frente: um grupo com dois CNPJs, uma marca nova,
um projeto com identidade própria. Sem um recorte interno, o usuário só tinha duas saídas ruins:

- criar um cliente por frente, duplicando contatos, histórico e relatórios do mesmo contratante; ou
- misturar tudo em um cliente só, perdendo a resposta para "quanto essa marca me deu?".

Quem já duplicou o cadastro também precisa de um caminho de volta: juntar dois clientes que sempre
foram o mesmo contratante, sem recalcular nem perder dinheiro no meio.

## Decisão

- Criar `public.client_entities`: empresa, marca, projeto ou outro, sempre filha de um cliente e do
  mesmo workspace. O cliente continua sendo a relação comercial; a entidade é o nome que aparece no
  serviço, na cobrança, na despesa e no domínio.
- `client_entity_id` é **opcional** em `client_services`, `charges`, `expenses` e `domains`. O que
  não tem entidade continua valendo como "geral"; nenhum registro anterior precisou ser migrado.
- A FK é composta por `(workspace_id, client_id, client_entity_id)`, para que o banco recuse por
  construção uma entidade de outro cliente ou de outro workspace. A Server Action valida antes e
  devolve mensagem em português em vez de deixar o erro de constraint vazar.
- Despesa sem cliente não pode ter entidade (`expenses_entity_requires_client_check`).
- Entidade **não** cria natureza financeira nova nem altera cálculo: receita própria, verba de mídia
  e repasses continuam separados exatamente como na ADR-0001.
- Entidade não é excluída, é arquivada: sai das opções de novos lançamentos e o histórico já
  vinculado continua apontando para ela.
- Consolidação de cliente em entidade acontece por duas RPCs: uma prévia `stable`, que só conta o
  que seria movido, e a execução, que exige a frase `CONSOLIDAR` e recusa o próprio trabalho quando
  os totais depois não batem com os de antes. A origem é arquivada, nunca apagada.
- O nome fantasia herdado (`trade_name`) continua sendo um campo do cliente. A importação legada
  **não** converte `Empresa` em entidade; quem quiser criar entidades usa uma linha explícita
  `empresa/marca`.

## Alternativas consideradas

- **Cliente-pai e cliente-filho** (auto-relacionamento em `clients`): rejeitada. Todo relatório,
  filtro e política teria que aprender a diferença entre um cliente que é raiz e um que não é.
- **Etiquetas livres no lançamento**: rejeitada. Texto livre não sustenta contagem confiável nem
  impede que duas grafias virem duas frentes.
- **Entidade obrigatória**: rejeitada. Forçaria o usuário a nomear uma empresa antes de registrar a
  primeira cobrança, e a maioria dos clientes tem uma frente só.

## Consequências

- Toda superfície financeira ganha um contexto opcional a mais para exibir: as listas mostram
  "Cliente · Empresa" quando há vínculo e só o cliente quando não há.
- O seletor de empresa/marca some quando o cliente não tem nenhuma cadastrada, para não introduzir
  um campo vazio em formulário de quem nunca vai usar o recurso.
- O resumo do dashboard passa a contar empresas/marcas ativas junto com clientes ativos.
- Consolidação é irreversível pela interface; por isso exige prévia e frase de confirmação.

## Verificação

- Banco: RLS forçada, grants mínimos, índice único parcial de nome ativo por cliente e pgTAP para
  cross-workspace, FK composta e as duas RPCs de consolidação.
- App: Vitest cobre o schema da entidade, a recusa de entidade de outro cliente em `createCharge`,
  a frase `CONSOLIDAR` e a tradução dos motivos devolvidos pela RPC.
- E2E: a jornada autenticada cria duas empresas, aplica serviço, cobrança, domínio e despesa com
  entidade e confirma que a cobrança manual continua sem avançar a agenda do serviço.
