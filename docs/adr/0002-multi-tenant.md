# ADR-0002: Isolamento multi-tenant por workspace e RLS

- Estado: aceita
- Data: 2026-07-30

## Contexto

O produto será público e cada cadastro terá dados isolados. Filtros apenas na aplicação são insuficientes: uma consulta incorreta poderia retornar dados de outro tenant.

## Decisão

- `workspaces` é o limite do tenant.
- Toda entidade de negócio possui `workspace_id uuid not null`.
- `workspace_memberships` vincula Auth user e workspace.
- No MVP, somente `role = 'owner'` é funcional.
- RLS fica habilitada em toda tabela de schema exposto e no Storage.
- Policies específicas cobrem `select`, `insert`, `update` e `delete`, usando `USING` e `WITH CHECK`.
- A autorização consulta membership ativa e `(select auth.uid())`.
- FKs/constraints impedem relações cruzadas entre workspaces.
- Índices cobrem `workspace_id`, membership e filtros usados nas policies.
- O servidor resolve o workspace autorizado; não confia em um ID livre do formulário.

Não serão implementados convites, `admin`, `member` ou permissões granulares no MVP. O campo de papel fica restrito a `owner`; uma migration futura pode ampliar valores e policies.

## Operações privilegiadas

Onboarding, recorrência e ciclo de conta podem exigir funções internas. Quando uma função `SECURITY DEFINER` for inevitável:

- fica em schema não exposto;
- usa `set search_path = ''`;
- valida explicitamente a identidade/escopo;
- recebe grants mínimos;
- não retorna dados fora do caso de uso;
- gera auditoria;
- possui testes negativos.

Não haverá cliente de aplicação com privilégio amplo como solução normal para operações do usuário.

## Alternativas consideradas

### Um banco/schema por usuário

Rejeitada para o MVP: custo operacional, migrations e observabilidade desproporcionais.

### Filtrar apenas no Next.js

Rejeitada: não oferece defesa em profundidade.

### Colocar workspaces em claims do JWT

Rejeitada como fonte primária: membership pode mudar antes do refresh do token e listas crescem.

### Modelar somente `owner_user_id` em cada tabela

Rejeitada: duplica identidade e dificulta evolução limpa para múltiplos workspaces.

## Consequências

- Toda migration inclui RLS e índices no mesmo change set.
- Testes de usuário A contra dados de B são obrigatórios.
- Consultas e FKs ficam mais verbosas.
- Evolução futura de papéis permanece possível sem entregar complexidade não usada agora.

## Verificação

- Matriz CRUD cruzada em todas as tabelas.
- Tentativas com `workspace_id` adulterado.
- Testes de URL assinada e objeto do Storage entre tenants.
- Supabase Security Advisor após migrations.
