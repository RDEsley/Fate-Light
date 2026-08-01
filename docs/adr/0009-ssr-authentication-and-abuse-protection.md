# ADR 0009 - Autenticação SSR e proteção contra abuso

- Status: aceito
- Data: 2026-07-31

## Contexto

A Fase 3B introduz magic link, confirmação de e-mail, sessão SSR e bloqueio de contas suspensas. O
limite precisa preservar cookies durante a renovação, impedir redirecionamentos externos, não
revelar se um e-mail existe e consultar o estado administrativo sem abrir leitura das tabelas
protegidas por RLS. Formulários públicos de autenticação também precisam de proteção contra robôs.

## Decisão

- O Supabase Auth aceita e-mail e senha com `signInWithPassword` e mantém o magic link com `signInWithOtp`; login usa
  `shouldCreateUser: false` e cadastro permite a criação explícita.
- `/auth/confirm` troca somente `token_hash` e tipo aceitos por uma sessão em cookie. Identidade é
  obtida de claims verificadas; e-mail, tokens e erros internos nunca são registrados.
- `src/proxy.ts` renova cookies e faz apenas o filtro otimista de rotas. Cada Route Handler, Server
  Action e Server Component protegido repete a verificação de identidade.
- Destinos recebidos do cliente aceitam apenas caminhos internos iniciados por `/`, sem barras
  duplas, esquema ou caracteres de controle.
- Uma RPC estreita, sem parâmetros e derivada de `auth.uid()`, retorna somente a existência e os
  estados do perfil e workspace. A função elevadora fica no schema `private`; o wrapper público é
  `SECURITY INVOKER` e executável apenas por `authenticated`.
- As respostas públicas de solicitação do link são genéricas e não distinguem conta inexistente,
  suspensa, limite do provedor ou falha de entrega.
- Cloudflare Turnstile é o provedor de CAPTCHA aprovado. A interface recebe apenas a site key
  pública e encaminha o token de curta duração ao Supabase Auth. O secret permanece configurado no
  painel do Supabase, nunca no repositório ou no cliente.
- A aplicação só renderiza e exige o CAPTCHA quando `NEXT_PUBLIC_TURNSTILE_SITE_KEY` estiver
  configurada. A ativação em produção é um gate de implantação conjunto: site key na aplicação,
  secret e provedor no Supabase, domínios permitidos e teste de ponta a ponta.
- Limites de envio, login e verificação continuam no Supabase Auth. A interface evita reenvio
  acidental, mas não implementa contador em memória, pois isso não seria consistente entre réplicas.

## Consequências

- O banco consegue distinguir pré-onboarding de suspensão sem conceder leitura do perfil suspenso.
- O proxy não substitui autorização e não executa consultas de domínio em toda navegação.
- Uma configuração parcial do CAPTCHA falha de forma genérica; o checklist de implantação deve
  impedir essa condição em produção.
- O widget Turnstile carrega recurso da Cloudflare somente nas telas públicas de autenticação e
  deve ser mencionado na versão definitiva da Política de Privacidade.

## Alternativas rejeitadas

- Confiar em `getSession()` ou apenas na presença de cookie: não verifica a identidade no servidor.
- Consultar `profiles` diretamente para suspensão: a política correta de RLS torna a linha invisível.
- Usar chave secret para contornar RLS: ampliaria desnecessariamente o privilégio da aplicação.
- Rate limit em memória do processo Next.js: não é global, durável nem confiável em múltiplas
  instâncias.
- Expor erros distintos para login e cadastro: permite enumeração de contas.
