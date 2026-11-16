# ADR-0024 — Lembretes de cobrança pelo WhatsApp

Status: aceita em 2026-11-16.
Revê parcialmente: “Notificações por e-mail/push” fora do MVP ([decisions.md](../decisions.md)).

## Contexto

Quem usa o Fate Light cobra os clientes à mão no WhatsApp, copiando valor, vencimento e chave PIX
de cada cobrança. O pedido é que o sistema envie sozinho, no dia certo, uma mensagem com o nome do
contato e os dados da cobrança, configurada por cliente.

## Decisão

- **Canal:** somente a API oficial do WhatsApp Business (Meta Cloud API), com templates aprovados.
  APIs não oficiais (Baileys, Evolution) foram descartadas: violam os termos do WhatsApp e expõem
  o número da empresa a bloqueio.
- **Opt-in por cliente:** nada é enviado sem `client_whatsapp_preferences.enabled = true`. O
  workspace também precisa ligar a automação em `whatsapp_reminder_settings`.
- **Momentos:** até três lembretes por cobrança pendente — antes (`days_before`), no vencimento e
  depois (`days_after`). Cada um só existe se o template correspondente estiver configurado. O dia
  é calculado no fuso do workspace.
- **Idempotência:** `whatsapp_reminder_deliveries` é única por `(charge_id, kind, due_date)`. Rodar
  o agendador duas vezes no mesmo dia não duplica envios; mudar o vencimento rearma os lembretes.
  Falhas são tentadas de novo no mesmo dia até três vezes.
- **Agrupamento:** cobranças do mesmo cliente, no mesmo dia, para o mesmo modelo e telefone saem
  em uma única mensagem, com os serviços listados e o valor (total a pagar) somado. Cada cobrança
  mantém sua linha de entrega; só a primeira guarda o id da Meta e recebe os status do webhook, as
  demais guardam `<id>#n`. Vencimentos diferentes geram mensagens diferentes.
- **Cobrança paga ou cancelada não recebe lembrete.** A automação só lê cobranças; nunca baixa,
  cancela ou altera valores.
- **Agendamento:** Vercel Cron diário às 12:00 UTC (09:00 em Brasília) chama
  `/api/cron/whatsapp-reminders`, protegido por `CRON_SECRET`.
- **Status:** o webhook `/api/webhooks/whatsapp` valida `X-Hub-Signature-256` com
  `WHATSAPP_APP_SECRET` e atualiza enviado/entregue/lido/falhou sem regredir o status.
- **Cliente privilegiado:** as duas rotas usam `SUPABASE_SECRET_KEY` em
  `src/lib/supabase/admin.ts` (`server-only`). Elas só chamam RPCs com `execute` restrito a
  `service_role`; nenhuma tela usa esse cliente.
- **Token da Meta:** guardado por workspace em `private.whatsapp_credentials`, sem grant para
  `authenticated`. O owner grava ou remove pelo RPC `set_whatsapp_access_token`, que nunca devolve
  o valor; a tela só sabe se há token salvo.

## Alternativas consideradas

- **pg_cron + Edge Function:** exigiria uma segunda base de código (Deno) fora dos gates atuais de
  Vitest/ESLint. O Vercel Cron mantém o envio em TypeScript testado com o restante do app.
- **Token em variável de ambiente:** serviria só a um número. O Fate Light atende outras empresas,
  então cada workspace usa a própria conta da Meta.

## Consequências

- Novos segredos de deploy: `SUPABASE_SECRET_KEY`, `CRON_SECRET`, `WHATSAPP_APP_SECRET` e
  `WHATSAPP_WEBHOOK_VERIFY_TOKEN`. Sem eles, as rotas respondem 503 e nada é enviado.
- O destinatário e o nome usados ficam registrados no envio (snapshot), para o histórico não mudar
  quando o cadastro mudar.
- O modo visitante só lê: a tela de configuração mostra a automação desligada e sem envios.

## Verificação

pgTAP `whatsapp_charge_reminders_test.sql`; Vitest em `src/features/whatsapp/`.
