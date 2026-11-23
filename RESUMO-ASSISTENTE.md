# Resumo do Assistente com IA

## O que foi feito

- Painel **Assistente** no topo do sistema, com chat em streaming, passos visíveis e cartão
  Aprovar/Cancelar.
- Rota `/api/agent` com AI SDK 7, limite de 5 passos e três tools: `listarClientesEmAtraso`,
  `resumirMes` e `criarLembreteCobranca`.
- Escrita com aprovação assinada por HMAC e revalidada no banco, sem duplicar lembretes.
- Modo demo com dados fictícios, em que aprovar gera um lembrete simulado.
- Limite de 10 mensagens por dia, teto global para visitantes, fallback Groq e erros amigáveis.
- Tabela `agent_runs`, com pergunta mascarada e retenção de 30 dias.
- Testes com modelo falso, pgTAP, Playwright com modelo roteirizado e avaliação em `evals/`.

## Como testar

```bash
npm run test                 # unitários, sem chamar API
npm run test:e2e             # fluxo completo com modelo roteirizado
npm run evals                # local, contra o modelo real; precisa de chave e gasta cota
```

Manualmente: rode `npm run dev`, entre como visitante, abra o ícone de brilho e pergunte _"Quem
está me devendo há mais de 30 dias? Cria um lembrete pra cada um"_.

## Limitações conhecidas

- Contas reais ficam desligadas até a revisão da política de privacidade, versionada no banco.
- No plano gratuito, o provedor pode usar o conteúdo enviado.
- A cota gratuita é baixa e muda sem aviso. Cada pergunta consome de 2 a 4 chamadas.
- A conversa não é salva e some ao recarregar a página.
- O limite por IP pode ser contornado trocando de rede; o teto global protege a cota.
- Na demo, o lembrete é simulado e não aparece na tela de Alertas.

## Próximos passos possíveis

- Integração real com WhatsApp, reaproveitando o fluxo de aprovação.
- Memória de conversa por workspace.
- Mais tools: domínios a vencer, despesas e previsão de caixa.
- Painel de observabilidade sobre `agent_runs`.
