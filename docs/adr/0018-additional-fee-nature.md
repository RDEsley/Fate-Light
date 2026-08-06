# ADR-0018 — Natureza do custo adicional do serviço

Status: aceita em 2026-08-06.

## Contexto

`client_services.additional_fee` e `charges.additional_fee` guardam um valor
extra cobrado junto do serviço. O campo nasceu sem natureza declarada, e cada
tela decidiu por conta própria o que ele significa:

| Onde | Tratamento até aqui |
| --- | --- |
| Dashboard, "Receita própria recebida" | `company_revenue + additional_fee` — conta como receita |
| Cliente, "Já recebido" e "A receber" | só `company_revenue` — não conta como receita |
| Card do serviço, "Mídia + adicional" | `media_budget + additional_fee` — agrupado com repasse |

Três lugares tratam como repasse, um trata como receita. O número do dashboard
nunca fechou com o do cliente, e quem preenchia o campo não tinha como saber
qual dos dois comportamentos valia.

A [ADR-0001](0001-financial-natures.md) já resolveu esse problema em tese:
cada valor tem exatamente uma natureza, e mídia/repasse nunca entram em
receita, resultado ou margem. O `additional_fee` do MVP simplesmente nunca
recebeu a sua.

Richard confirmou que o campo é genuinamente ambíguo no uso real: às vezes é
taxa própria (setup, urgência, serviço extra pontual), às vezes é repasse
(freelancer, fornecedor). Não dá para resolver escolhendo um dos dois.

## Decisão

- **O adicional passa a declarar sua natureza**, via
  `additional_fee_is_revenue boolean not null default true` em
  `client_services` e em `charges`. `true` significa receita própria; `false`,
  repasse — a mesma separação da ADR-0001, aplicada a um campo que ficou de
  fora dela.
- **A marcação vive no serviço e é herdada pelas cobranças que ele gera.**
  `apply_service_to_client` grava nas cobranças iniciais e
  `settle_charge_and_schedule_next` copia para cada ciclo novo. Um serviço
  costuma ter sempre a mesma composição; pedir a natureza a cada cobrança
  gerada automaticamente seria atrito sem ganho.
- **Cobrança avulsa declara a própria natureza**, porque não nasce de serviço
  nenhum e não teria de quem herdar.
- **Toda leitura financeira passa a respeitar a marcação.** Receita é
  `company_revenue + additional_fee` somente quando `additional_fee_is_revenue`;
  caso contrário o adicional entra junto de `media_budget` como repasse.
  Isso alinha dashboard, página do cliente e card do serviço num único
  critério.
- **O padrão é `true` e vale para todo dado existente.** É o comportamento que
  o dashboard já praticava, então nenhuma receita histórica muda de valor com
  a migration. Onde o adicional era de fato repasse, o dono corrige serviço a
  serviço pela interface.

## Alternativas consideradas

- *Fixar o adicional como receita própria e só corrigir as outras três telas*:
  rejeitada. Resolveria a inconsistência, mas obrigaria a lançar repasse de
  terceiro como se fosse faturamento — exatamente o que a ADR-0001 proíbe.
- *Fixar como repasse*: rejeitada pelo motivo simétrico, e ainda derrubaria a
  receita histórica já exibida no dashboard.
- *Marcação por cobrança individual*: rejeitada. Dá mais flexibilidade, mas
  cobra a decisão em toda cobrança recorrente gerada automaticamente, onde a
  resposta é sempre a mesma do serviço.
- *Reaproveitar `financial_nature` da ADR-0001 como enum de três valores*:
  adiada. O MVP não tem `charge_lines` nem `pass_through` separado de mídia; um
  booleano cobre a distinção que existe hoje sem inventar estrutura que ainda
  não é usada.

## Consequências

- `apply_service_to_client` muda de assinatura (novo parâmetro booleano), então
  precisa de `drop function` explícito e atualização das chamadas posicionais
  nos testes de banco.
- Relatórios comparados antes e depois da migration continuam iguais enquanto
  ninguém marcar um adicional como repasse — o default preserva o número atual.
- Quem marcar um adicional já existente como repasse verá a receita daquele
  período cair. É correção, não perda: o valor deixa de ser contado como
  faturamento próprio.
- A interface precisa deixar a natureza visível onde o valor aparece, senão o
  campo volta a ser ambíguo — agora com dois comportamentos possíveis em vez
  de um errado.
