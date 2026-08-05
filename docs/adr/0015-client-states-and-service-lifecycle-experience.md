# ADR-0015 — Estados do cliente, pausa de serviço e ciclos promocionais gratuitos

Status: aceita em 2026-08-05.

## Contexto

A operação diária expôs limites do modelo aprovado na ADR-0013:

- Um serviço com preço promocional zerado é impossível de registrar. A função
  `apply_service_to_client` cria a primeira cobrança com
  `coalesce(p_promotional_price, v_company_revenue)`, e a restrição
  `charges_values_check` exige `gross_total > 0`. Uma promoção de cortesia nos
  primeiros ciclos, prática comercial comum, falha com erro genérico.
- O cliente só admite `active`, `inactive` e `archived`. A operação real precisa
  distinguir orçamento em aberto, pendência e cliente vetado, hoje todos
  colapsados em `inactive`.
- O serviço só admite `active` e `ended`. Uma pausa combinada com o cliente
  obriga a encerrar o serviço e recriá-lo depois, perdendo o vínculo do
  histórico e a contagem de ciclos promocionais já consumidos.
- Cancelar uma cobrança não registra motivo, embora atraso já registre
  (`charges_delay_reason_check`). O histórico fica incompleto justamente no
  evento que mais gera dúvida meses depois.
- Serviços personalizados criados a partir do cliente não entram no catálogo,
  então o mesmo serviço é redigitado a cada cliente novo.

## Decisão

- **Cobranças de valor zero passam a ser válidas.** `charges_values_check` muda
  de `gross_total > 0` para `gross_total >= 0`. Um ciclo promocional gratuito
  gera uma cobrança real de R$ 0,00 em vez de não gerar nada. Isso preserva a
  invariante central de que receita é a soma das cobranças e mantém
  `settle_charge_and_schedule_next` como único caminho de avanço de ciclo — um
  serviço gratuito continua avançando normalmente.
- **A promoção conta a partir do primeiro vencimento**, nunca da data de início
  do serviço. `promotional_cycles_used` parte de zero na aplicação do serviço,
  independentemente de há quanto tempo o contrato existe. A regra é previsível e
  auditável: são exatamente `promotional_cycles` cobranças com o valor
  promocional, seguidas do valor cheio.
- **O cliente admite seis situações comerciais**: `budget` (orçamento),
  `pending` (pendente), `active`, `inactive`, `blacklist` (lista negra) e
  `archived`. `archived` permanece amarrado a `archived_at` pela restrição
  existente. `blacklist` é um estado terminal explícito, distinto de inativo, e
  não deve gerar cobranças novas.
- **O serviço admite `active`, `paused` e `ended`.** Pausa suspende alertas e a
  geração de cobranças futuras preservando valores, ciclos promocionais
  consumidos e vínculo com o catálogo. Encerramento continua definitivo e é o
  único estado que exige `ended_at`.
- **Cancelamento de cobrança exige motivo**, com código controlado e texto
  livre, espelhando a estrutura já aprovada para atraso.
- **Serviço aplicado a um cliente entra no catálogo do workspace.** Quando não
  há serviço de catálogo escolhido, a função reaproveita o serviço ativo de mesmo
  nome ou cria um novo, apoiada na unique index
  `services_workspace_active_name_unique` que já garante unicidade por
  workspace. O preço do catálogo é apenas sugestão inicial: o valor aplicado ao
  cliente permanece independente e editável.
- **Exclusão em cascata controlada.** `delete_client_service_cascade` remove o
  serviço e suas cobranças **não pagas**; qualquer cobrança paga bloqueia a
  operação. `delete_catalog_service` bloqueia enquanto houver serviço de cliente
  vinculado. Nenhum movimento financeiro confirmado é removível, mantendo a
  regra da ADR-0013.

## Alternativas consideradas

- *Não criar cobrança quando o ciclo é gratuito*: rejeitada. Sem cobrança não há
  o que liquidar, e `settle_charge_and_schedule_next` nunca avançaria o ciclo —
  o serviço ficaria congelado no primeiro vencimento para sempre.
- *Guardar o total histórico do cliente numa coluna*: rejeitada. Quebraria a
  invariante de que receita é a soma das cobranças e obrigaria todo cálculo
  financeiro a somar duas fontes. O histórico anterior é registrado como uma
  cobrança já paga.
- *Contar a promoção a partir da data de início do serviço*: rejeitada por ser
  imprevisível ao cadastrar contratos antigos, onde a promoção nasceria total ou
  parcialmente consumida sem sinal claro na interface.

## Consequências

- Relatórios e listagens precisam tratar cobrança de R$ 0,00 como válida e
  rotulá-la como cortesia, não como erro de cadastro.
- `clients_commercial_status_check` fica mais permissivo; a interface passa a ser
  responsável por comunicar o significado de cada situação, incluindo o
  tratamento visual de lista negra.
- Consultas que assumem `status = 'active'` para serviços precisam decidir
  explicitamente se incluem `paused`. Alertas e geração de cobrança **excluem**
  pausados.
- As funções novas seguem o contrato das existentes: `security definer`,
  `search_path` vazio, validação de `auth.uid()` e de membership owner ativa,
  privilégios revogados de `public` e `anon`.
- Testes de banco devem cobrir ciclo promocional gratuito completo, isolamento
  por workspace das novas funções e o bloqueio de exclusão diante de cobrança
  paga.
