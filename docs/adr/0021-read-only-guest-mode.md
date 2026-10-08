# ADR-0021 — Modo visitante somente leitura, com dados fictícios em memória

Status: aceita em 2026-10-08.
Não altera: [ADR-0002](0002-multi-tenant.md) (isolamento por workspace) e
[ADR-0009](0009-ssr-authentication-and-abuse-protection.md) (autenticação SSR e proteção contra
abuso).

## Contexto

Quem chega ao Fate Light sem conta só via a página inicial e o formulário de login. Para conhecer o
produto era preciso criar conta, confirmar e-mail e passar pelo onboarding — atrito demais para
alguém que só quer ver como o sistema funciona, e também para avaliar o projeto como portfólio.

O requisito é mostrar o sistema de verdade, com as telas reais, sem que o visitante consiga alterar
nada e sem abrir um caminho novo até os dados de quem tem conta.

## Decisão

- O visitante **não tem sessão do Supabase**. O modo é ligado por um cookie próprio
  (`fate-light-guest`, `httpOnly`, `sameSite=lax`, `secure` em produção, validade de quatro horas),
  definido por uma Server Action acionada no botão "Explorar como visitante" do login. O cookie não é
  credencial: só troca a fonte de dados das telas.
- As telas do sistema obtêm o contexto por `requireWorkspaceContext()`. Sem sessão e com o cookie,
  ele devolve um contexto de demonstração: workspace e usuário fictícios e um **cliente em memória**
  (`src/lib/demo/`) no lugar do cliente do Supabase. Esse cliente não tem URL, chave nem sessão;
  implementa apenas a parte de leitura da API que as páginas usam e responde sobre um conjunto de
  dados fictícios montado a cada requisição, sempre relativo à data de hoje.
- Toda escrita no cliente de demonstração (`insert`, `update`, `upsert`, `delete`, RPCs que não sejam
  de leitura e Storage) devolve o erro `GUEST_READ_ONLY`. Não existe modo de escrita a habilitar.
- **A sessão real sempre vence o cookie.** Quem está autenticado nunca recebe dados fictícios; o
  proxy apaga o cookie assim que há sessão e o "Sair" também o remove.
- **Server Actions não rodam para o visitante.** `requireWorkspaceContext()` reconhece a requisição
  de ação (cabeçalho `next-action` ou envio de formulário) e redireciona para
  `/login?status=guest` antes de qualquer acesso a dados. As ações que autenticam por conta própria
  (perfil, senha, empresa, ciclo de vida da conta, onboarding) continuam recusando por falta de
  sessão, como já faziam para qualquer anônimo.
- O proxy libera para o visitante as rotas do sistema, **exceto `/onboarding`**, que é o cadastro de
  verdade.
- No navegador, um guarda intercepta o envio de formulários e a abertura de confirmações e mostra o
  aviso "Faça cadastro ou login para usar o sistema", com atalho para criar a conta. Busca e filtros
  (formulários `GET`) seguem funcionando. Esse guarda é conforto de uso; a garantia é do servidor.
- Os dados fictícios usam só domínios reservados (`.example`) e nomes inventados. Nenhum dado real
  de cliente entra no conjunto.

## Alternativas consideradas

- **Conta de demonstração compartilhada no banco real**, com um papel só de leitura: rejeitada.
  Exigiria publicar uma credencial, revisar cada policy de escrita para o novo papel e manter dados
  reais de exemplo que envelhecem (uma cobrança "vencida ontem" deixa de ser verdade amanhã).
  Qualquer falha de policy viraria vandalismo visível para todos.
- **Workspace real criado para cada visitante**: rejeitada. Cria registros reais a partir de tráfego
  anônimo, abre um vetor de abuso e obriga a ter rotina de limpeza.
- **Capturas de tela ou vídeo**: rejeitada. Não deixa navegar, filtrar nem abrir os detalhes, que é
  justamente o que mostra como o sistema funciona.

## Consequências

- O visitante não gera carga nem escrita no banco: cada requisição monta um conjunto pequeno em
  memória e o descarta.
- O cliente de demonstração precisa acompanhar as consultas das páginas. Uma tabela que ele não
  conhece devolve lista vazia; uma RPC de leitura nova precisa de um equivalente em
  `src/lib/demo/client.ts`, senão a tela mostra o estado de erro para o visitante.
- Página que cria o cliente do Supabase diretamente, em vez de usar `requireWorkspaceContext()`, não
  fica disponível no modo visitante: o guard dela redireciona para o login.
- A tipagem do cliente de demonstração é convertida para a do cliente do Supabase em um único ponto,
  documentado, em vez de espalhar um tipo mais estreito por todas as telas.
- Como o conjunto é relativo a hoje, a demonstração sempre tem algo vencido, algo para esta semana e
  algo recebido no mês, sem manutenção.

## Plano de verificação

- Vitest: consultas, relações embutidas, resumos e recusa de escrita do cliente de demonstração
  (`demo-client.test.ts`); prioridade da sessão real, recusa de Server Actions, cookie e proxy
  (`guest-session.test.ts`); guarda do navegador (`guest-guard.test.tsx`).
- Playwright (`guest.spec.ts`), sem depender do Supabase: entrada pelo login, navegação pelas telas,
  bloqueio de envio e de confirmação, filtros funcionando, recusa pelo servidor quando o navegador é
  contornado (`form.submit()`) e saída do modo.
