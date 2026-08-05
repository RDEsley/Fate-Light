# Instruções do projeto para agentes

Estas regras são a fonte operacional única para todo o repositório.

## Contexto e fontes de verdade

- Leia `PLAN.md` e os documentos relevantes em `docs/` antes de mudanças substanciais.
- Preserve os guardrails de segurança, as invariantes dos ADRs e o escopo da fase aprovada.
- Não implemente antecipadamente autenticação, domínio financeiro ou infraestrutura de fases
  futuras.
- Se uma decisão alterar segurança, isolamento, privacidade, invariantes financeiras, datas ou
  infraestrutura, registre um ADR antes da implementação.

## Fundação técnica

- Next.js com App Router, React Server Components por padrão, TypeScript estrito e código em `src/`.
- Componentes cliente devem ter justificativa concreta e começar com `"use client"`.
- Use o alias `@/*` para imports a partir de `src/`.
- Reutilize tokens de `src/app/globals.css`; mantenha tema claro/escuro, foco visível, contraste e
  `prefers-reduced-motion`.
- Adicione dependências somente quando usadas. Fixe versões exatas e mantenha `package-lock.json`.
- Não inicialize shadcn/ui nem bibliotecas de formulário, tabela ou gráfico antes do primeiro uso.

## Supabase e banco de dados

- Use somente as chaves publishable e secret nos contratos de ambiente.
- O cliente do navegador pode acessar apenas variáveis `NEXT_PUBLIC_*`.
- A chave secret é exclusiva do servidor, nunca deve aparecer em Client Components e não deve criar
  um cliente privilegiado até existir um caso de uso aprovado.
- Nesta fundação, mantenha apenas clientes browser/server e configuração local reproduzível.
- Não crie autenticação, proxy de sessão, tabelas, migrations de domínio, RLS, Storage, Functions,
  Cron ou seed sem a fase correspondente aprovada.
- Mudanças futuras de schema devem ser versionadas em migrations, revisadas com foco em RLS e
  validadas localmente antes de qualquer aplicação remota.

## Segurança e dados privados

- Nunca exponha, registre, envie ou versione segredos, credenciais, tokens, arquivos `.env`, chaves
  privadas ou valores de ambiente reais.
- Nunca leia, copie ou versione planilhas e dados em `private/` sem autorização explícita.
- `.mcp.json` e configurações locais equivalentes permanecem ignoradas e privadas.
- Não registre valores de configuração em erros. Mensagens de validação podem informar somente os
  nomes das variáveis inválidas.
- Execute `npm run security:check` antes de preparar uma publicação.
- Preserve os bloqueios do `.gitignore`; não versione dependências, builds, cobertura ou relatórios
  de teste.

## Qualidade e verificação

- Antes de concluir uma mudança de código, execute em ordem: `npm run format:check`, `npm run lint`,
  `npm run typecheck`, `npm run test`, `npm run test:coverage`, `npm run build` e
  `npm run test:e2e`.
- Testes devem cobrir comportamento, limites público/servidor e acessibilidade relevante.
- Não reduza thresholds de cobertura para mascarar código não testado.
- CI usa somente placeholders e não depende de um projeto Supabase real.
- Se um gate não puder ser executado, informe exatamente qual foi o impedimento.

## Convenções de código

- Prefira nomes claros, funções pequenas, validação nas bordas e comentários apenas para decisões
  não óbvias.
- Não use `any` sem uma justificativa documentada.
- Server Components não devem importar módulos marcados com `"use client"` fora da composição normal
  de React.
- Não acople componentes de interface diretamente a clientes privilegiados ou segredos.
- Preserve textos de interface em português do Brasil e nomes técnicos de código em inglês.

## Identidade Git obrigatória

Antes de criar commits ou tags, confirme a configuração local do repositório:

```text
user.name=RDEsley
user.email=richardesleyso@gmail.com
```

Todos os commits e tags devem ter somente essa identidade. Nunca inclua Codex, OpenAI, Claude,
Anthropic, agente, bot ou qualquer IA como autor, coautor, committer, tagger, contribuidor ou
trailer. Não adicione mensagens como `Co-authored-by`, `Generated-by` ou equivalentes.

## Gatilho "Manda pro github"

Quando Richard disser **"Manda pro github"** — incluindo variações inequívocas como "manda pro git",
"sobe pro GitHub" ou "commita e envia" — execute o fluxo completo sem confirmação adicional:

1. Leia `git status`, o diff completo, o histórico recente, a branch atual, os remotes e as tags.
2. Confirme que `origin` aponta para `https://github.com/RDEsley/FateEight.git`.
3. Configure e valide localmente a identidade Git obrigatória.
4. Execute `npm run security:check` e verifique segredos e gerados no conjunto de mudanças.
5. Separe assuntos logicamente distintos; faça staging explícito e nunca use `git add .` ou
   `git add -A` cegamente.
6. Use Conventional Commits: título em inglês, imperativo, até 72 caracteres; corpo em português
   explicando o que mudou e por quê; tipos permitidos `feat`, `fix`, `refactor`, `chore`, `docs`,
   `style`, `test`, `perf`, `build` e `ci`; nenhuma referência a IA.
7. Rode os gates adequados e só prossiga quando aprovados. Registre qualquer gate impossível.
8. Revise `git diff --cached` e a autoria final antes de cada commit.
9. Envie os commits para a branch correspondente em `origin`.
10. Crie uma tag anotada SemVer única no commit final: determine a próxima versão; use `major` para
    incompatibilidade, `minor` para funcionalidade e `patch` para correção/manutenção; sem tags,
    comece em `v0.1.0`; título curto em inglês e changelog em português; nenhuma referência a IA.
11. Envie somente a nova tag e confira a publicação da branch e da tag.
12. Informe commits, tag, verificações e ressalvas.

Se não houver mudanças, não crie commit ou tag vazios. Explique que o repositório está atualizado.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
