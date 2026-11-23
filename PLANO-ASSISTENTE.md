# Plano do Assistente com IA

Agente com tool calling em vários passos, escrita somente com aprovação e custo zero (Gemini no
plano gratuito, Groq como fallback opcional). Decisões estruturais em
[ADR-0026](docs/adr/0026-ai-assistant.md).

## Fases

| Fase | Entrega | Principais arquivos |
| --- | --- | --- |
| 0. Preparação | Plano, ADR e dependências | `PLANO-ASSISTENTE.md`, `docs/adr/0026-ai-assistant.md` |
| 1. Integração | Migration, tools, rota e painel | `supabase/migrations/`, `src/features/assistant/`, `src/app/api/agent/`, `src/app/_components/assistant/` |
| 2. Produto | Demo, limites, erros, fallback, registro, testes, evals e README | `src/lib/demo/`, `evals/`, `src/test/`, `README.md` |
| 3. Entrega | Variáveis, build e guias | `.env.example`, `RESUMO-ASSISTENTE.md`, `PASSOS-NAVEGADOR.md` |

## Regras de segurança

- Leitura por uma camada que só expõe consultas permitidas, sobre a sessão com RLS.
- Escrita somente após aprovação assinada no servidor e revalidada no banco.
- Retornos de tools são dados delimitados, nunca instruções.
- O modelo recebe o mínimo: sem documento, telefone, e-mail, endereço ou observações.
- Contas reais só com `AGENT_REAL_DATA_ENABLED=true` e aceite do workspace.
- Lembretes ficam em `manual_alerts` e não disparam WhatsApp.

## Riscos

- O plano gratuito pode usar o conteúdo enviado: a demo usa dados fictícios e contas reais ficam
  desligadas até a revisão da política de privacidade.
- O cookie de visitante é falsificável: limite por hash de IP e teto global diário.
- Cotas e nomes de modelo mudam: modelo configurável por variável de ambiente.
- Sem Docker local: pgTAP e jornada autenticada são confirmados no CI do PR.
