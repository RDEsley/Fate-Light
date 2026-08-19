# Instruções do Fate Light para agentes

Estas regras são a fonte operacional do repositório. O produto se chama **Fate Light**, foi
desenvolvido pela Fate Eight Tech e atende também outras empresas. A marca usa a assinatura
“Clareza financeira. Caminho certo.”.

## Fontes de verdade e escopo atual

- Leia `README.md`, `docs/product-requirements.md`, `docs/architecture.md`, `docs/data-model.md`,
  `docs/implementation-plan.md`, `docs/decisions.md` e os ADRs relacionados antes de mudanças
  substanciais.
- O sistema já possui autenticação, onboarding, isolamento por workspace, clientes, catálogo e
  aplicação de serviços, cobranças, despesas, domínios, alertas, histórico, importação e
  configurações. Não trate o repositório como uma fundação vazia.
- Preserve invariantes financeiras, isolamento multi-tenant, histórico e privacidade. Registre um
  ADR antes de alterar uma decisão estrutural de segurança, dinheiro, datas, retenção ou
  infraestrutura.
- Não leia, copie ou processe arquivos em `private/` sem autorização explícita.

## Arquitetura e código

- Next.js App Router, React 19, TypeScript estrito e código da aplicação em `src/`.
- Use React Server Components por padrão. Adicione `"use client"` somente quando interação, estado
  ou API do navegador exigirem e mantenha a fronteira cliente pequena.
- Server Actions são endpoints públicos: autentique, autorize o workspace, valide todo `FormData` e
  filtre operações pelo identificador e pelo `workspace_id` obtido da sessão.
- Use o alias `@/*`, nomes técnicos em inglês e textos de interface em português do Brasil.
- Prefira funções pequenas, retornos antecipados e comentários que expliquem decisões, não sintaxe.
- Não use `any`, casts para ocultar incompatibilidades ou supressões de lint sem justificativa.
- Adicione dependências apenas com uso concreto, versões exatas e atualização do `package-lock.json`.

## Produto, UI e acessibilidade

- O Fate Light possui somente tema claro, suave e de baixo cansaço visual. Não reintroduza modo
  escuro nem controles de tema.
- Preserve a identidade clean-cartoon: formas amigáveis, cores semânticas e microinterações leves,
  sem aparência de template genérico, sombras duras excessivas ou bordas inconsistentes.
- Reutilize os tokens e componentes de `src/app/globals.css` e `src/components/ui/`; não crie uma
  variação visual isolada quando um padrão existente puder ser refinado.
- Formulários devem ser compactos, responsivos e mobile-first, com rótulo visível, foco claro,
  feedback junto ao campo e preservação dos valores após erro.
- Datas são exibidas em `DD/MM/AAAA`, trafegam como `YYYY-MM-DD` e usam o calendário PT-BR.
  Campos de data obrigatórios começam vazios em novos registros; só edições podem vir preenchidas.
- Ícones são SVG do componente `Icon`; não use emoji, bitmap ou caractere desfocado como ícone.
- Toda interação precisa funcionar por teclado, ter nome acessível, contraste suficiente e respeitar
  `prefers-reduced-motion` e as preferências internas de animação.
- Cores comunicam estado: verde para positivo/pago, vermelho para negativo/vencido/perigoso,
  amarelo para atenção e violeta/verde da marca para navegação e ações neutras.

## Dinheiro, datas e automação

- Valores monetários persistidos usam `numeric`; não use ponto flutuante para regras financeiras.
- Receita própria, verba de mídia e repasses permanecem separados conforme ADR-0001 e ADR-0018.
- Não reescreva cobranças já liquidadas ao editar serviços. Recorrências devem ser idempotentes.
- `date` nunca deve ser convertido com `new Date('YYYY-MM-DD')`; acrescente horário/UTC conforme os
  helpers existentes. Instantes são UTC e exibidos no locale/timezone apropriado.
- A automação deve reduzir edição manual sem tomar decisões financeiras silenciosas pelo usuário.

## Supabase, RLS e Storage

- Toda alteração de schema é uma migration criada pela CLI, revisada e coberta por pgTAP.
- Toda tabela em schema exposto usa RLS forçada e grants mínimos. Policies combinam autenticação com
  autorização de workspace; `to authenticated` sozinho não é autorização.
- Views expostas usam `security_invoker = true`. Funções `security definer` ficam no schema
  `private`, fixam `search_path`, verificam `auth.uid()` e têm grants explícitos.
- O navegador acessa somente `NEXT_PUBLIC_*`. Chave secret/service role nunca entra em Client
  Components, logs, commits ou respostas ao usuário.
- Documentos financeiros ficam em bucket privado, com MIME, extensão, assinatura e tamanho
  validados. URLs assinadas têm curta duração e nunca são persistidas.
- Upload, leitura e remoção no Storage precisam de policies por workspace; nunca use bucket público
  para notas fiscais, comprovantes ou dados de clientes.

## Segurança e privacidade

- Nunca exponha, registre, envie ou versione segredos, cookies, tokens, `.env`, chaves privadas,
  nomes originais sensíveis de arquivos ou dados reais de clientes.
- `.mcp.json`, artefatos locais, builds, dependências, cobertura e relatórios permanecem ignorados.
- Mensagens públicas não revelam existência de contas, detalhes internos do banco ou configuração.
- Execute `npm audit` e `npm run security:check`; corrija vulnerabilidades de forma compatível, sem
  `--force`, e documente riscos residuais.

## Testes e gates

- Toda correção de bug recebe teste de regressão no nível mais próximo: Vitest para regras/UI,
  pgTAP para banco/RLS/Storage e Playwright para jornadas e acessibilidade.
- Não reduza cobertura, não marque teste como skip para esconder falha e não altere expectativa para
  acomodar comportamento incorreto.
- Antes de publicar, execute: `npm ci`, `npm audit`, `npm run format:check`, `npm run lint`,
  `npm run typecheck`, `npm run test`, `npm run test:coverage`, `npm run build`,
  `npm run test:e2e`, `npm run security:check`, `git diff --check`.
- O computador local não possui Docker. Testes `db:*` e a jornada autenticada podem depender do CI;
  quando não puderem rodar localmente, valide SQL estaticamente e confirme esses gates no GitHub
  Actions antes de concluir.
- CI usa placeholders para o front-end e uma pilha Supabase efêmera; nunca depende de segredos ou do
  projeto remoto de produção.

## GitHub e documentação

- Remoto oficial: `https://github.com/RDEsley/Fate-Light.git`; branch padrão: `main`.
- Use Conventional Commits, issues com escopo e critérios de aceite, PRs com impacto/causa/testes e
  GitHub Projects para acompanhar trabalho solicitado.
- Actions de terceiros permanecem fixadas por SHA. Conceda apenas permissões mínimas ao workflow.
- Atualize documentação somente quando comportamento, operação ou decisão mudar; evite ruído de
  formatação sem relação com a entrega.

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
2. Confirme que `origin` aponta para `https://github.com/RDEsley/Fate-Light.git`.
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
