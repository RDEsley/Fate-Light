# ADR-0006: Datas civis, instantes UTC e timezone do workspace

- Estado: aceita
- Data: 2026-07-30

## Contexto

Vencimentos e expirações representam um dia civil, enquanto pagamentos e auditoria representam um instante. Tratar ambos como JavaScript `Date` causa mudança de dia, especialmente entre UTC, Brasil e horário de verão de outros fusos.

## Decisão

### `date`

Usar para:

- vencimento;
- competência;
- início/fim de vigência;
- início/fim de período;
- renovação;
- expiração;
- próxima execução civil.

Transportar sempre como `YYYY-MM-DD`. Não construir `new Date('YYYY-MM-DD')`, não converter para UTC e não acrescentar horário artificial.

### `timestamptz`

Usar para:

- criação/atualização;
- auditoria;
- confirmação/cancelamento/reembolso de pagamento;
- upload/remoção;
- login/último acesso;
- execução de job;
- ações do usuário.

Persistir instantes em UTC e serializar como ISO 8601 com offset/`Z`.

### Timezone

- `workspaces.timezone` usa nome IANA.
- Regras financeiras de “hoje”, atraso, dia de cobrança e competência usam o timezone do workspace.
- Preferência pessoal pode formatar áreas pessoais; páginas financeiras priorizam o timezone do workspace.
- O job calcula o dia local com expressão equivalente a `(current_timestamp at time zone workspace.timezone)::date`.
- Mudança de timezone não altera datas civis já armazenadas; altera interpretação de instantes e futuras execuções, com aviso/auditoria.

### Fim de mês e DST

- Agenda no dia 29/30/31 usa regra “último dia válido do mês” quando o mês não contém o dia.
- Jobs são reentrantes e por data civil, portanto repetição/salto de hora por DST não duplica cobrança.
- Testes incluem virada de ano, fevereiro bissexto, offsets positivos/negativos e DST.

## Alternativas consideradas

### `timestamptz` para tudo

Rejeitada: vencimento não tem instante universal e pode mudar de dia na apresentação.

### `timestamp without time zone` para eventos

Rejeitada: perde o instante inequívoco.

### Timezone fixo da aplicação

Rejeitada: produto público precisa respeitar cada workspace.

### Timezone do navegador para regras financeiras

Rejeitada: dois usuários poderiam ver situação diferente para o mesmo workspace.

## Consequências

- A camada de datas distingue tipos civis e instantes.
- UI precisa mostrar timezone em ações críticas quando relevante.
- Conversões automáticas de bibliotecas devem ser encapsuladas/testadas.

## Verificação

- Testes que garantem que `YYYY-MM-DD` não muda.
- Matriz de timezones e limites do dia.
- Cobranças e alertas de fim de mês/DST.
- Formatação pt-BR sem alterar o valor civil.
