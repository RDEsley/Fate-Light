# ADR-0016 — Exclusão forçada pelo dono, links do cliente e liquidação em lote

Status: aceita em 2026-08-05.

## Contexto

A ADR-0013 estabeleceu que movimento financeiro confirmado nunca é removível, e a
ADR-0015 manteve a regra ao criar `delete_client_service_cascade`, que devolve
`blocked` diante de qualquer cobrança paga. A intenção era proteger a integridade
do histórico.

Na prática isso trava o dono do workspace no caso mais comum de erro real:
um serviço cadastrado errado, já com cobranças marcadas como pagas por engano,
não tem como sair do sistema. O produto é uma planilha assistida de um
profissional único — não há auditoria externa, contador com acesso, nem
obrigação fiscal amarrada a estes registros. A "proteção" acaba defendendo o
sistema contra o próprio dono dos dados.

Três lacunas menores apareceram junto:

- O cliente tem um único campo de site. Quem administra presença digital precisa
  guardar mais de um endereço por cliente (site, painel do registrador, drive de
  materiais).
- Encerrar um serviço deixa as cobranças pendentes penduradas. Na maioria dos
  encerramentos o combinado é que está tudo quitado, e o usuário precisa liquidar
  uma a uma.
- Excluir um serviço do catálogo é bloqueado enquanto algum cliente o usa, sem
  saída: ou o serviço fica no catálogo para sempre, ou o usuário apaga o trabalho
  dos clientes.

## Decisão

- **A exclusão de serviço do cliente admite modo forçado.** `delete_client_service_cascade`
  passa a receber `p_force boolean`. Sem força, o comportamento da ADR-0015 é
  preservado integralmente: cobrança paga devolve `blocked`. Com força, o serviço
  e **todas** as cobranças vinculadas são removidas, inclusive as pagas.
- **A força é decisão explícita e custosa na interface**, nunca um padrão. O
  diálogo mostra quantas cobranças pagas serão apagadas e quanto de receita sai
  do histórico, exige digitar o nome do serviço e mantém o botão de confirmação
  bloqueado por três segundos. O atrito é proposital: o que protege o dado agora
  é o usuário entender a consequência, não o banco recusar.
- **A exclusão continua sendo a exceção.** Encerrar e pausar seguem como as saídas
  recomendadas e aparecem antes na interface. A exclusão forçada existe para
  corrigir cadastro errado, não para "limpar" operação legítima.
- **`clients.links` guarda até três endereços nomeados**, em `jsonb` validado por
  `private.are_valid_client_links`, seguindo o mesmo desenho de `address_json` +
  `private.is_valid_client_address` já aprovado na ADR-0010. Não vira tabela
  própria porque não há consulta por link, não há histórico por link e o limite é
  fixo — uma tabela exigiria RLS, grants e joins para um dado que é sempre lido
  junto com o cliente.
- **`clients.website` continua existindo** como o endereço principal. Os links
  extras são complemento, não substituição, para não quebrar cadastro nem
  importação existentes.
- **Encerrar serviço pode liquidar as pendências em lote**, via
  `settle_client_service_charges`. A função marca como pagas as cobranças
  `pending` daquele serviço na data corrente, com forma de pagamento informada.
  É opcional e explícita: encerrar sem liquidar continua válido, porque nem todo
  encerramento é amigável.
- **Domínio passa a ser excluível diretamente**, via `delete_domain_record`.
  `delete_workspace_record` só apagava domínio já cancelado, obrigando um passo
  intermediário que não protegia nada: domínio não carrega movimento financeiro
  confirmado. A confirmação da interface é suficiente.
- **Excluir serviço do catálogo passa a poder desvincular em vez de bloquear.**
  Com `p_detach`, os `client_services` que apontam para ele têm `service_id`
  zerado e seguem funcionando; só o item de catálogo some. Nenhum trabalho de
  cliente é destruído — é a diferença entre "parar de oferecer este serviço" e
  "apagar o que já foi feito".

## Alternativas consideradas

- *Manter o bloqueio absoluto e orientar o usuário a arquivar*: rejeitada. Não
  existe arquivamento de serviço, e o registro errado continuaria somando receita
  falsa em todo relatório. O problema que o bloqueio cria é maior que o que evita.
- *Exclusão lógica (soft delete) do serviço e das cobranças*: rejeitada. Manteria
  os valores fora dos relatórios sem apagar nada, mas exigiria filtrar
  `deleted_at` em toda consulta financeira do sistema — mudança ampla, com risco
  alto de esquecer um ponto e voltar a somar valor apagado.
- *Tabela `client_links` dedicada*: rejeitada pelo custo de RLS, grants, políticas
  e join para um dado limitado a três itens e sempre lido junto do cliente.
- *Liquidar automaticamente ao encerrar, sem perguntar*: rejeitada. Encerramento
  por inadimplência é frequente; marcar tudo como pago por padrão inventaria
  receita que nunca entrou.
- *Cascatear a exclusão do catálogo para os serviços dos clientes*: rejeitada.
  Apagaria trabalho executado por causa de uma limpeza de catálogo. Desvincular
  entrega o mesmo objetivo sem perda.

## Consequências

- Receita histórica deixa de ser imutável. Relatórios comparados entre duas datas
  podem divergir legitimamente se houve exclusão forçada no intervalo.
  `activity_events` continua registrando a remoção, então a trilha existe mesmo
  quando a cobrança não existe mais.
- A interface passa a ser a última linha de defesa do histórico financeiro. Toda
  alteração no diálogo de exclusão forçada precisa preservar as três barreiras:
  contagem do impacto, frase digitada e espera de três segundos.
- `clients.links` é lido em toda listagem de cliente; o limite de três e o teto de
  bytes por link mantêm o custo previsível.
- As funções novas seguem o contrato das existentes: `security definer`,
  `search_path` vazio, validação de `auth.uid()` e de membership owner ativa,
  privilégios revogados de `public` e `anon`.
- Testes de banco devem cobrir: bloqueio sem força, remoção com força incluindo
  cobrança paga, isolamento por workspace das novas funções, liquidação em lote
  sem tocar em cobrança já paga ou cancelada, e desvínculo de catálogo
  preservando o serviço do cliente.

## Atualização em 2026-08-06

O diálogo de exclusão forçada perdeu a frase digitada: com contagem de impacto e
botão travado por três segundos já lidos antes de liberar, exigir também o nome
do serviço era atrito redundante, não proteção adicional. A decisão de banco
(exclusão forçada com `p_force`) continua igual; só a interface simplificou.
