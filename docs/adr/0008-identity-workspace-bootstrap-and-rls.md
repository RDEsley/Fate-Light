# ADR-0008: Bootstrap explícito de identidade e isolamento RLS

- Estado: aceita
- Data: 2026-07-31

## Contexto

A primeira persistência autenticada precisa criar perfil, workspace, owner,
configurações e aceites legais como uma única unidade. Inserções independentes pelo
cliente permitiriam estado parcial, adulteração de ownership e referências entre
tenants. Um trigger em `auth.users` também poderia transformar uma falha do domínio
em falha de cadastro.

Esta fase não entrega telas de autenticação ou onboarding. Ela prepara somente o
contrato persistente que a Fase 3B chamará depois de uma autenticação válida e de
um aceite legal explícito.

## Decisão

- O limite de tenant continua sendo `workspaces`.
- `workspace_members` substitui o nome planejado `workspace_memberships` e é a
  fonte de autorização do workspace.
- No MVP, cada usuário pode possuir e integrar somente um workspace. Constraints
  únicas em `workspaces.created_by` e `workspace_members.user_id` materializam essa
  regra.
- `workspace_members` aceita somente `role = 'owner'`. Uma constraint única parcial
  impede mais de um owner ativo por workspace. A existência do owner é garantida na
  mesma transação que cria o workspace; remoção e alteração direta de membership
  não recebem grants de cliente.
- Configurações empresariais ficam em `workspace_settings`, com endereço em colunas
  estruturadas. `general_settings` permanece JSON validado somente para flags raras
  que não sejam filtradas nem usadas como fonte de autorização.
- Aceites legais referenciam o documento e preservam também a versão aceita. Não
  são coletados IP ou user-agent nesta fase porque a necessidade e a política de
  privacidade ainda não os justificam.
- O bootstrap é uma função idempotente e transacional em schema `private`. Ela é
  `SECURITY DEFINER` porque os clientes não recebem `INSERT` direto nas tabelas que
  compõem a operação. A função usa `search_path` vazio, deriva a identidade apenas
  de `(select auth.uid())`, usa lock transacional por usuário, valida os documentos
  exigidos e registra auditoria.
- Um wrapper no schema `public`, executado como `SECURITY INVOKER`, é a única RPC
  exposta. Ele não recebe `user_id` e apenas encaminha parâmetros validados para a
  função privada.
- Funções auxiliares de policy ficam em `private`, com `search_path` vazio e grants
  restritos a `authenticated`. O schema privado não é exposto pela Data API.
- Todas as tabelas públicas desta fase usam RLS, policies específicas por operação
  e grants mínimos. `anon` não recebe acesso.
- Suspensão do perfil, membership ou workspace bloqueia toda leitura e alteração de
  dados do tenant.
- Nenhum trigger é criado em `auth.users`.
- Avatar, bucket, upload, processamento de imagens e qualquer imagem controlada pelo
  usuário permanecem adiados. A interface futura usará iniciais ou placeholder até
  a reavaliação do advisory de `sharp`.

## Alternativas consideradas

### Inserts diretos protegidos somente por RLS

Rejeitada: ainda permitiria estado parcial entre cinco recursos e ampliaria os
grants necessários ao cliente.

### Trigger após inserção em `auth.users`

Rejeitada: acopla disponibilidade do cadastro ao domínio e não representa aceite
legal nem escolhas de onboarding.

### Função elevadora no schema público

Rejeitada: amplia a superfície exposta da Data API. O schema público contém apenas
o wrapper invoker estritamente necessário.

### Ownership em metadata do JWT

Rejeitada: claims podem ficar desatualizadas e metadata editável não é fonte segura
de autorização.

## Consequências

- A Fase 3B deve chamar o bootstrap somente depois de apresentar as versões legais
  vigentes e receber consentimento explícito.
- A regra de um workspace por usuário exigirá migration antes de habilitar múltiplos
  workspaces ou membros em versão futura.
- A garantia de exatamente um owner combina constraints de unicidade com a criação
  transacional e a ausência de grants de remoção; uma constraint declarativa isolada
  não consegue garantir existência durante a criação de duas tabelas relacionadas.
- Operações administrativas futuras precisarão de funções próprias, auditadas e fora
  das policies normais do workspace.

## Verificação

- `supabase db reset` reproduz schema e seed local.
- Testes pgTAP exercitam usuários A/B, anon, suspensão, grants, campos imutáveis,
  adulteração de workspace e chamadas repetidas/abusivas do bootstrap.
- Geração de tipos parte do banco local e a CI detecta tipos desatualizados.
- `supabase db lint` e advisors locais verificam erros, segurança e desempenho.
