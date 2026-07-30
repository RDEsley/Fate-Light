# ADR-0001: Separar naturezas financeiras

- Estado: aceita
- Data: 2026-07-30

## Contexto

O valor relacionado a um cliente pode conter receita da empresa, verba administrada de mídia e valores destinados a terceiros. Somar tudo como receita superestima faturamento, resultado e margem. A planilha não representa essas naturezas com integridade suficiente.

## Decisão

Cada linha de cobrança possui exatamente uma `financial_nature`:

- `company_revenue`;
- `managed_media`;
- `pass_through`.

Cada despesa possui exatamente uma `expense_nature`:

- `operating_expense`;
- `direct_cost`;
- `managed_media_spend`;
- `pass_through_disbursement`.

Pagamentos não recebem natureza diretamente. `payment_allocations` ligam partes do pagamento a `charge_lines`, herdando a natureza da linha. Gasto de mídia e desembolso de repasse mantêm saldos separados.

Dashboard, filtros, exportações e relatórios usam essas mesmas classificações.

## Invariantes

- Mídia e repasse nunca entram em receita, resultado ou margem.
- Total bruto é a soma das três naturezas, mas não é rotulado como receita.
- Resultado inclui receita própria e somente despesa operacional/custo direto.
- Uma linha mista deve ser dividida antes de confirmar.
- Alterar natureza após emissão exige cancelar/substituir o documento.

## Alternativas consideradas

### Um campo “valor de mídia” dentro da cobrança

Rejeitada: não comporta múltiplos itens, alocação parcial, repasse ou auditoria por linha.

### Inferir natureza pelo nome do serviço

Rejeitada: nomes mudam, são ambíguos e não constituem regra financeira.

### Considerar todo recebimento receita e compensar com despesa

Rejeitada: distorce receita, margem e resultado, além de ocultar recursos de terceiros.

## Consequências

- Formulários exigem natureza por item/linha.
- Importação precisa de confirmação para colunas ambíguas.
- Pagamento parcial exige rateio.
- Métricas ficam mais explicáveis, com mais tabelas e invariantes.

## Verificação

- Testes com as três naturezas e pagamento parcial.
- Reconciliação de total bruto e saldos por natureza.
- Teste que mídia/repasse produzem zero impacto no resultado.
