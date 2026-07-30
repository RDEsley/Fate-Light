# Análise da planilha de origem

## Escopo e privacidade

A análise foi feita sobre a cópia local em `private/legacy/`. Este documento registra somente estrutura, fórmulas e riscos. Nomes, contatos, valores e demais dados reais não foram copiados.

A pasta `private/` e formatos de planilha estão no `.gitignore`. O arquivo de origem não é fonte pública nem deve ser versionado.

## Estrutura observada

- Uma planilha visível, com uma tabela de 18 colunas.
- Cabeçalho congelado e filtros de tabela.
- Área preparada para aproximadamente mil linhas, mas apenas um pequeno conjunto está preenchido.
- Uma linha intermediária de instrução/modelo dentro da própria tabela.
- Listas de validação inseridas diretamente na planilha.
- Validações de data e número em campos selecionados.
- Formatação condicional para vencimentos, expirações e sinais financeiros.
- Nenhum gráfico, tabela dinâmica ou conexão externa detectado.

## Mapeamento das 18 colunas

| # | Coluna de origem | Interpretação | Destino proposto | Regra de migração |
|---:|---|---|---|---|
| 1 | `Start Date` | Início do relacionamento ou serviço | `contracts.start_date` e `contract_item_versions.effective_from` | Exigir confirmação quando houver mais de um item. |
| 2 | `Client` | Cliente | `clients.name` | Resolver ou criar cliente dentro do workspace; nunca usar nome como chave. |
| 3 | `Service DEV` | Serviço de desenvolvimento | `services` + item de contrato | Mapear cada serviço para um item independente. |
| 4 | `Payment type` | Provável modalidade/cadência de cobrança | `contract_item_versions.billing_type` e `billing_schedules` | Não confundir com método do pagamento; confirmar na prévia. |
| 5 | `Service Value` | Valor único de serviço | item/linha `company_revenue` | Importar como decimal exato e receita própria. |
| 6 | `Next pay/ mens/` | Próxima cobrança de mensalidade | `billing_schedules.next_run_on` | Recalcular após importar a agenda; não tratá-la como histórico de pagamento. |
| 7 | `Mens/ value` | Mensalidade de serviço | item recorrente `company_revenue` | Criar item e agenda recorrente. |
| 8 | `Site Mens/` | Indicador de mensalidade de site | item explícito de manutenção/hospedagem | Substituir o booleano por serviço e agenda. |
| 9 | `Service ADS` | Serviço relacionado a Ads | `services` + item de contrato | Separar taxa própria de gestão da verba administrada. |
| 10 | `Planning Value` | Valor de planejamento/setup de Ads | item único, natureza a confirmar | Hipótese padrão: `company_revenue`; a prévia deve permitir reclassificação. |
| 11 | `Next pay/ ADS` | Próxima cobrança ligada a Ads | `billing_schedules.next_run_on` | Associar à agenda do item correto. |
| 12 | `Mens/ ADS` | Mensalidade de gestão de Ads | item recorrente `company_revenue` | Não usar este campo para verba de mídia sem confirmação explícita. |
| 13 | `ADS Mens/` | Indicador de recorrência de Ads | `billing_schedules` | Transformar em regra de recorrência, não manter como booleano isolado. |
| 14 | `Total Row` | Total calculado por linha | Derivado de `charge_lines` | Não importar como fonte de verdade; recalcular e comparar. |
| 15 | `Expenses` | Despesa agregada/manual | `expenses.amount` + `expense_nature` | Exigir categoria e natureza; normalizar sinal. |
| 16 | `Gross Total` | Total bruto agregado | Métrica derivada | Não armazenar como linha de negócio. |
| 17 | `Net Total` | Total líquido agregado | Métrica derivada com definição explícita | Não importar; substituir por resultado canônico. |
| 18 | `DOMAIN EXPIRATION` | Expiração de domínio | `domains.expires_on` | Criar domínio e regras de alerta configuráveis. |

Todas as colunas têm destino, mas as colunas 4, 10 e 12 exigem confirmação semântica por registro ou lote antes da importação final.

## Fórmulas e validações observadas

- O total de linha soma somente os campos de serviço principal e mensalidade.
- Campos ligados a Ads não participam desse total, criando subcontagem potencial.
- Algumas primeiras linhas usam valores estáticos onde a maioria usa fórmula.
- As fórmulas são divididas antes e depois da linha intermediária de modelo.
- Totais gerais usam intervalos estáticos e não cobrem de forma uniforme toda a área preparada.
- O total bruto agrega o total de linha.
- O total líquido agrega o total de linha com a coluna de despesas, dependendo de convenção manual de sinal.
- Há uma fórmula com aritmética hardcoded dentro de uma célula de valor, em vez de premissas identificáveis.
- Validações de listas para cliente, serviço e pagamento são hardcoded; novas opções exigem edição manual.
- Datas de próximas cobranças e expiração recebem realce relativo ao dia atual.

## Regras inferidas

- Um cliente pode contratar desenvolvimento, mensalidades e serviços de Ads.
- Existem cobranças únicas e recorrentes.
- Próximos vencimentos são controlados manualmente.
- Domínios são tratados como obrigação renovável.
- Despesas são usadas para chegar a um “líquido”, mas não têm classificação operacional.
- A planilha tenta combinar cadastro, contrato, agenda, cobrança, pagamento, despesa e relatório em uma única linha.

Estas inferências não substituem validação de importação.

## Limitações e riscos atuais

- Não há IDs estáveis, relações ou integridade referencial.
- Cliente, contrato, itens e recorrência ficam acoplados na mesma linha.
- Receita própria, mídia administrada e repasse não estão representados separadamente.
- O campo de despesa não distingue gasto de mídia, custo direto e despesa operacional.
- Pagamento parcial, alocação, cancelamento, estorno e histórico não são modelados.
- Valores calculados podem ser substituídos manualmente.
- Intervalos estáticos e a linha de modelo criam lacunas e risco de totais incorretos.
- Listas hardcoded podem divergir do cadastro real.
- Datas não têm timezone nem regra explícita para o dia local.
- Não há trilha de auditoria, responsável por alteração ou versionamento.
- Anexos, comprovantes e renovações ficam fora do mesmo fluxo.

## Estratégia de importação

1. Receber o arquivo somente em área privada e temporária.
2. Detectar cabeçalhos por nome e aliases, nunca apenas por posição.
3. Exibir prévia sem registrar dados.
4. Permitir mapear e classificar valores ambíguos.
5. Normalizar datas como `YYYY-MM-DD` e dinheiro como string decimal.
6. Recalcular totais e apresentar divergências com a planilha.
7. Deduplicar por chave composta de importação, nunca por nome isolado.
8. Validar todas as linhas antes da confirmação.
9. Gravar o lote em transação ou não gravar nada.
10. Produzir relatório de sucesso, aviso e erro sem dados sensíveis em logs.
11. Armazenar apenas metadados necessários do lote; remover o arquivo temporário conforme retenção definida.

O importador deve criar clientes, contratos, itens, agendas, cobranças e despesas de forma explícita. Totais derivados não serão importados como fonte de verdade.

## Critério de aceite da migração

- As 18 colunas foram reconhecidas.
- Nenhum valor real aparece em fixtures públicas ou documentação.
- Toda linha ambígua exige decisão visível.
- Receita própria, mídia e repasse ficam separados.
- Totais recalculados reconciliam ou geram divergência explicada.
- O mesmo lote não pode ser confirmado duas vezes.
- Erro em uma linha impede confirmação parcial silenciosa.
