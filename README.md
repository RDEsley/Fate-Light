# Fate Eight Finance

Sistema financeiro da Fate Eight Tech, implementado incrementalmente conforme `PLAN.md`. A Fase 3B
entrega autenticação passwordless SSR, onboarding, perfil, configurações do workspace e registro
seguro de pedidos de exportação/exclusão. Funcionalidades financeiras ainda não foram iniciadas.

## Requisitos

- Node.js `24.18.1` (consulte `.nvmrc`)
- npm `11.16.0`
- Docker Desktop ou runtime compatível com o Supabase CLI para banco, autenticação e E2E real

## Configuração local

1. Instale as dependências com `npm ci`.
2. Inicie os serviços locais com `npm run supabase:start`.
3. Recrie o banco com `npx supabase db reset --local`.
4. Copie `.env.example` para `.env.local` e preencha `NEXT_PUBLIC_APP_URL`, a URL local da API e a
   publishable key local. `NEXT_PUBLIC_TURNSTILE_SITE_KEY` é opcional no desenvolvimento.
5. Mantenha `SUPABASE_SECRET_KEY` vazia: nenhum caso de uso desta fase precisa de cliente
   privilegiado.
6. Inicie a aplicação com `npm run dev`.

O Mailpit local fica em `http://127.0.0.1:54324` e recebe apenas mensagens do ambiente local. A
saída completa de `supabase status` também contém credenciais privilegiadas locais; copie somente o
contrato público necessário e não publique essa saída.

O gate `test:e2e:auth` respeita os limites reais de envio. Várias execuções seguidas podem atingir o
rate limit local; aguarde a janela ou reinicie a pilha de desenvolvimento antes de repetir.

Valores reais de ambiente nunca devem ser versionados. A aplicação valida as variáveis públicas no
carregamento e informa apenas o nome de uma variável inválida, sem revelar seu conteúdo.

## Comandos

| Comando                  | Finalidade                                  |
| ------------------------ | ------------------------------------------- |
| `npm run dev`            | Servidor de desenvolvimento                 |
| `npm run build`          | Build de produção                           |
| `npm run lint`           | Regras ESLint e Next.js                     |
| `npm run typecheck`      | TypeScript estrito sem emissão              |
| `npm run format:check`   | Verificação de formatação                   |
| `npm run test`           | Testes unitários e de componentes           |
| `npm run test:coverage`  | Testes com thresholds de cobertura          |
| `npm run test:e2e`       | Smoke test e acessibilidade no Chromium     |
| `npm run test:e2e:auth`  | Jornada autenticada real com Supabase local |
| `npm run security:check` | Arquivos proibidos e padrões de segredo     |
| `npm run db:test`        | Isolamento e contratos PostgreSQL com pgTAP |
| `npm run db:types:check` | Tipos gerados correspondem ao banco local   |
| `npm run db:lint`        | Funções e schema PostgreSQL                 |
| `npm run supabase:start` | Infraestrutura Supabase local               |
| `npm run supabase:stop`  | Encerra a infraestrutura local              |

## Estrutura inicial

- `src/app`: rotas e layout do App Router.
- `src/components/ui`: componentes visuais reutilizáveis.
- `src/config/env`: contratos público e servidor com Zod.
- `src/lib/supabase`: fábricas de cliente browser e server.
- `src/test`: testes unitários, de componente e E2E.
- `supabase`: migrations, testes, templates e configuração local reproduzível.
- `docs`: requisitos, arquitetura, ADRs e plano de implementação.

As decisões de produto e de dados estão em `docs/`; `AGENTS.md` concentra as regras operacionais do
repositório.

## Limites e publicação

- Pedidos de exportação e exclusão apenas registram estado sanitizado. Não há job, artefato, URL,
  suspensão ou exclusão automática nesta fase.
- Avatar e upload permanecem desabilitados.
- Antes de produção, configure URLs permitidas e templates equivalentes no Supabase hospedado,
  defina o SMTP transacional e valide entrega de magic links.
- Turnstile deve ser habilitado em conjunto: site key na aplicação, secret no Supabase Auth e
  domínios permitidos no provedor.
- Os documentos legais do seed são fictícios e precisam ser substituídos por versões aprovadas.
- Retenção, verificação administrativa e execução de exportação/exclusão pertencem à Fase 11.
