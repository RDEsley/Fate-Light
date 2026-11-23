# ADR-0026 — Assistente com IA e aprovação para escrita

Status: aceita em 2026-11-23.
Abre exceção controlada à regra de não enviar dados de clientes a terceiros (`AGENTS.md`).

## Contexto

O Fate Light ganha um assistente que consulta cobranças e propõe lembretes por tool calling. O
custo precisa ser zero, então o provedor é o plano gratuito da Gemini, com Groq opcional. Nesse
plano o conteúdo enviado pode ser usado pelo provedor para melhorar seus produtos, e o sistema
guarda dados de clientes de outras empresas.

## Decisão

- **Demo primeiro:** visitantes usam só dados fictícios em memória. Aprovar um lembrete na demo é
  uma simulação guardada no navegador; `src/lib/demo/` continua sem escrita.
- **Contas reais:** exigem `AGENT_REAL_DATA_ENABLED=true` **e** aceite versionado do workspace em
  `agent_consents`, com aviso que nomeia os provedores. A variável nasce desligada e só deve ser
  ligada depois de Richard revisar a política de privacidade, versionada no banco.
- **Minimização:** o modelo recebe id da cobrança, nome do cliente, descrição, valor, vencimento e
  dias de atraso. Nunca documento, telefone, e-mail, endereço, observações ou arquivos.
- **Leitura restrita:** as tools usam uma camada com consultas fixas sobre o cliente da sessão, com
  RLS. Não há papel de banco separado porque a RLS depende do JWT do usuário.
- **Escrita com aprovação:** `criarLembreteCobranca` usa `toolApproval` e aprovação assinada por
  HMAC (`AGENT_APPROVAL_SECRET`). Sem o segredo, a escrita é negada. A RPC revalida workspace,
  status e atraso e é idempotente por cobrança com lembrete aberto.
- **Sem WhatsApp:** o lembrete fica em `manual_alerts`, que o agendador de envios não lê.
- **Dados não confiáveis:** retornos de tools são delimitados e o prompt proíbe seguir instruções
  contidas neles. A aprovação humana é a barreira final contra injeção.
- **Limites:** 10 mensagens por dia por usuário ou hash de IP com sal, além de teto global diário
  para visitantes. Se o contador falhar em produção, o pedido é recusado.
- **Admin client:** exceção ao ADR-0024, restrita às RPCs de cota e registro do visitante, que não
  tem sessão. Essas RPCs só aceitam `service_role`.
- **Registro:** `agent_runs` guarda pergunta mascarada e truncada, tools, argumentos sem nomes,
  resultado, duração e modelo, por 30 dias.

## Alternativas

- **Só demo, sem código para contas reais:** mais simples, mas não demonstra isolamento real.
- **Pseudônimos para o modelo:** reduz exposição, mas foi preterido por Richard em favor do opt-in.
- **Aprovação sem assinatura:** o histórico vem do cliente, e uma aprovação poderia ser forjada.
- **Limite só por cookie:** o cookie de visitante é falsificável.

## Consequências

- Nova dependência externa opcional; sem chave, o painel explica que está indisponível.
- Ligar contas reais exige revisar a política de privacidade e aceitar o risco do plano gratuito.
- O hash de IP é um dado pseudonimizado e fica somente no contador diário.

## Verificação

- pgTAP para RLS, idempotência, revalidação e RPCs restritas.
- Vitest com modelo falso para roteamento, aprovação, isolamento, injeção, fallback e limites.
- Playwright na demo: pergunta, tool, cartão, aprovação e lembrete simulado.
