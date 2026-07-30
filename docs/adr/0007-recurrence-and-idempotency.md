# ADR-0007: Supabase Cron com geração idempotente

- Estado: aceita
- Data: 2026-07-30

## Contexto

Agendas de cobrança precisam executar mesmo se ninguém abrir o produto. Falhas, retries e execuções concorrentes não podem duplicar cobranças.

## Comparação

| Opção | Pontos fortes | Limitações | Decisão |
|---|---|---|---|
| Supabase Cron | Próximo ao banco; executa SQL/função; monitoramento no Postgres; sem dependência do app | Exige disciplinar duração, privilégios e retenção dos logs do `pg_cron` | Escolhida |
| Edge Function agendada | Boa para HTTP, e-mail e integrações; TypeScript | Requer `pg_cron`/scheduler chamando HTTP, segredo/Vault e mais pontos de falha | Reservada a orquestrações futuras |
| Vercel Cron | Integra ao deploy web | Acopla agenda ao provedor, usa endpoint/segredo e adiciona rede | Não canônica |
| Geração oportunista | Simples e pode reparar pendências ao abrir o app | Falha quando ninguém acessa e aumenta latência/concorrência | Somente sinal de reparo |

## Decisão

Supabase Cron executa um job curto em frequência regular. O job chama uma função interna que:

1. identifica agendas ativas cuja `next_run_on` venceu no dia local do workspace;
2. deriva `period_start`, `period_end` e `generation_key`;
3. adquire/insere a chave única da agenda/período;
4. cria cobrança e linhas em uma transação;
5. avança `next_run_on`;
6. grava status técnico e correlação.

Constraints:

- `unique(billing_schedule_id, period_start)`;
- `unique(generation_key)`.

Formato lógico da chave:

```text
billing:{billing_schedule_uuid}:{period_start_yyyy-mm-dd}
```

Reprocessamento retorna a cobrança existente ou conclui reparo consistente. Nunca cria uma segunda.

O job não depende de cookie, browser ou usuário online. Sua função fica em schema não exposto, com privilégio mínimo e sem payload sensível em logs.

Supabase Cron não deve manter histórico ilimitado de `cron.job_run_details`; a operação futura incluirá política de retenção/limpeza.

## Execução oportunista

A abertura do dashboard pode detectar atraso técnico e enfileirar/solicitar uma verificação autorizada, mas não gera cobrança diretamente e não substitui o Cron.

## Alternativas consideradas

### Apenas criar a próxima cobrança no acesso

Rejeitada: workspaces inativos ficariam sem cobranças.

### Pré-gerar todas as cobranças do contrato

Rejeitada: alterações de vigência, pausas e cancelamentos tornam o futuro obsoleto.

### Confiar apenas em lock de aplicação

Rejeitada: não protege contra processos concorrentes/retries no banco.

## Consequências

- Migrations futuras incluem extensão/configuração Cron e função transacional.
- Agenda precisa de regra explícita de fim de mês.
- Operação precisa alertar job travado/falho sem expor dados.
- Edge Function permanece disponível para e-mail/push, fora do MVP.

## Verificação

- Execuções simultâneas e repetidas.
- Falha após reservar chave e antes/depois de criar linhas.
- Mudança de timezone, fim de mês, pausa e término.
- Backfill de períodos perdidos com limite e revisão.
- Garantia de uma cobrança por agenda/período.

## Referência

- [Supabase Cron](https://supabase.com/docs/guides/cron)
- [Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions)
