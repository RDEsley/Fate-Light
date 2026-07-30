# ADR-0005: Representação de dinheiro e arredondamento

- Estado: aceita
- Data: 2026-07-30

## Contexto

`float` e `number` binários podem introduzir erros de centavos. O produto precisa reconciliar cobranças, alocações e pagamentos parciais e preservar precisão entre PostgreSQL, API e TypeScript.

## Decisão

### Banco

- Valores monetários: `numeric(15,2)`.
- Quantidades: `numeric(12,4)`.
- Percentuais/taxas: `numeric(7,4)`.
- Valores monetários não negativos por padrão; direção/natureza representa entrada e saída.
- Uma moeda por workspace.

### Transporte e TypeScript

- Formulários e DTOs usam string decimal canônica.
- JSON devolve dinheiro como texto.
- Read models/RPCs convertem `numeric` para `text`.
- Mutations recebem texto validado e convertem para `numeric` em fronteira controlada.
- Componentes não recebem `numeric` bruto nem fazem `Number`, `parseFloat` ou aritmética nativa.
- Uma biblioteca decimal será avaliada, fixada e encapsulada na Fase 2.

### Arredondamento

- Política: metade para cima em magnitude (`ROUND_HALF_UP`), compatível para valores positivos com `round(numeric, 2)` do PostgreSQL; para sinais, o comportamento é metade afastada de zero.
- Calcular quantidade × unitário e descontos em precisão decimal; arredondar cada linha a 2 casas.
- Somar linhas já arredondadas para obter total do documento.
- Rateio proporcional calcula em precisão maior, trunca/arredonda conforme política e atribui o resíduo de centavos de forma determinística às linhas com maior resto; desempate pela ordem estável da linha.
- Persistir `line_amount` como snapshot validado e alocações em duas casas.

### Por que não centavos inteiros

Inteiros de centavos seriam exatos para BRL simples, mas complicariam taxas, quantidades fracionárias, importação, SQL e futuras moedas com escala diferente. `numeric` mantém semântica financeira no PostgreSQL e reduz conversões. A segurança no JavaScript será obtida por decimal strings, não por `number`.

## Alternativas consideradas

### `double precision`/`number`

Rejeitada por erro binário e reconciliação instável.

### Inteiro em centavos

Não escolhido pelos motivos acima; pode ser reconsiderado apenas com uma camada monetária completa e estudo de moedas.

### Arredondar apenas o total

Rejeitada: documentos e rateios não reconciliariam com linhas exibidas.

### Guardar totais de dashboard

Rejeitada: cria divergência; indicadores são derivados.

## Consequências

- DTOs têm mais conversão e tipos próprios.
- Consultas públicas precisam de read models textuais.
- Testes de centavos, limites, negativos de ajuste e rateio são obrigatórios.

## Verificação

- Casos `0.1 + 0.2`, metade de centavo, quantidade fracionária e limite de precisão.
- Rateios em 2, 3 e muitas linhas com soma exata.
- Paridade PostgreSQL e biblioteca decimal.
- Nenhuma ocorrência de aritmética monetária com `number` em revisão/lint customizado futuro.
