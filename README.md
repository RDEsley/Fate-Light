# Fate Eight Finance

Fundação técnica do sistema financeiro da Fate Eight Tech. O produto será implementado em fases
conforme `PLAN.md`; esta base ainda não contém autenticação nem regras financeiras.

## Requisitos

- Node.js `24.18.1` (consulte `.nvmrc`)
- npm `11.16.0`
- Docker compatível com o Supabase CLI, somente quando o ambiente local de dados for necessário

## Configuração local

1. Instale as dependências com `npm ci`.
2. Copie `.env.example` para `.env.local`.
3. Preencha localmente as três variáveis públicas. A chave secret é reservada para código de
   servidor futuro e pode permanecer vazia nesta fase.
4. Inicie a aplicação com `npm run dev`.

Valores reais de ambiente nunca devem ser versionados. A aplicação valida as variáveis públicas no
carregamento e informa apenas o nome de uma variável inválida, sem revelar seu conteúdo.

## Comandos

| Comando                  | Finalidade                              |
| ------------------------ | --------------------------------------- |
| `npm run dev`            | Servidor de desenvolvimento             |
| `npm run build`          | Build de produção                       |
| `npm run lint`           | Regras ESLint e Next.js                 |
| `npm run typecheck`      | TypeScript estrito sem emissão          |
| `npm run format:check`   | Verificação de formatação               |
| `npm run test`           | Testes unitários e de componentes       |
| `npm run test:coverage`  | Testes com thresholds de cobertura      |
| `npm run test:e2e`       | Smoke test e acessibilidade no Chromium |
| `npm run security:check` | Arquivos proibidos e padrões de segredo |
| `npm run supabase:start` | Infraestrutura Supabase local           |
| `npm run supabase:stop`  | Encerra a infraestrutura local          |

## Estrutura inicial

- `src/app`: rotas e layout do App Router.
- `src/components/ui`: componentes visuais reutilizáveis.
- `src/config/env`: contratos público e servidor com Zod.
- `src/lib/supabase`: fábricas de cliente browser e server.
- `src/test`: testes unitários, de componente e E2E.
- `supabase`: configuração reproduzível do Supabase local, sem domínio.
- `docs`: requisitos, arquitetura, ADRs e plano de implementação.

As decisões de produto e de dados estão em `docs/`; `AGENTS.md` concentra as regras operacionais do
repositório.
