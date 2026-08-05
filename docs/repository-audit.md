# Auditoria inicial do repositório

Data da inspeção: 2026-07-30.

## Método e limites

- Inspeção de arquivos, workflows, configuração local, branch, status e histórico.
- Valores de configuração potencialmente sensíveis foram classificados sem serem reproduzidos.
- Nenhum arquivo foi apagado.
- Nenhuma credencial foi testada.
- A planilha foi analisada estruturalmente; seus dados reais não aparecem aqui.

## Estado encontrado

- Branch: `main`.
- Histórico: um commit inicial contendo somente `LICENSE`.
- Não havia aplicação, dependências, migrations, `PLAN.md`, documentação de produto ou `.gitignore`.
- Os demais arquivos estavam não rastreados.

## Arquivos herdados

| Caminho relativo | Situação | Risco/inconsistência | Recomendação |
|---|---|---|---|
| `.github/workflows/ci.yml` | Não rastreado | Workflow de Vite/Node 20, variáveis legadas e comandos que falham sem projeto Node. Não corresponde à arquitetura aprovada. | Não habilitar. Substituir na Fase 2 por CI do Next.js/Node LTS atual, com instalação reproduzível. |
| `.github/workflows/keep-supabase-alive.yml` | Não rastreado | Consulta uma tabela de domínio alheio ao projeto, usa nomenclatura de chave legada, repete chave em `Authorization` e contém diagnóstico verboso que pode revelar endpoint/contexto. | Remover ou reescrever antes de versionar. Para o produto, preferir monitoramento explícito; não reutilizar o ping atual. |
| `.mcp.json` | Não rastreado e agora ignorado | Configuração local específica. A inspeção estrutural não encontrou campo de token inline, mas o endpoint não precisa ser público. | Manter local/ignorado. Se integração compartilhada for necessária, criar exemplo sanitizado separado. |
| `private/legacy/Finance Fate Eight Tech.xlsx` | Não rastreado e agora ignorado | Contém dados reais e não pode ir ao Git/CI. | Manter somente em armazenamento local/externo autorizado e criptografado. Excluir a cópia local apenas após backup e decisão do proprietário. |
| `AGENTS.md` | Não rastreado | Guardrails importantes; não deve ser ignorado. | Revisar e versionar na Fase 2. |
| `CLAUDE.md` | Não rastreado | Guardrails importantes, parcialmente sobrepostos ao `AGENTS.md`. | Consolidar sem segredos e definir documento canônico antes de versionar. |
| `claude/.claude/skills/manda-pro-github/SKILL.md` | Não rastreado | Regra herdada de automação Git contém uma instrução de identidade divergente da política raiz. | Atualizar ou remover o artefato herdado antes de versionar; a política raiz é canônica. |
| `LICENSE` | Rastreado | Único arquivo no histórico inicial. | Manter. Confirmar compatibilidade com estratégia pública no hardening. |

Nenhum e-mail, ID, endpoint ou valor real foi copiado para este relatório.

## Git e histórico

- O commit inicial não contém a planilha, arquivo de ambiente ou código.
- A planilha e configurações locais estavam apenas no working tree.
- O `.gitignore` agora bloqueia `private/`, planilhas, CSVs, envs, credenciais, dumps, builds, caches e configurações MCP locais.
- `AGENTS.md`, documentação, lockfile, migrations e seed fictício não são ignorados.

Antes da publicação:

1. executar secret scanning no working tree e no histórico;
2. revisar todos os arquivos não rastreados;
3. substituir workflows herdados;
4. revisar arquivos de instrução para remover conflito;
5. confirmar que somente fixtures fictícias entram no Git.

## Workflows

### CI herdado

Não deve ser executado como está porque:

- espera Vite, enquanto a arquitetura aprovada usa Next.js;
- usa Node 20 sem revalidação da versão LTS da Fase 2;
- referencia variáveis de ambiente legadas;
- pressupõe `package.json`/lockfile inexistentes;
- executa TypeScript fora de um baseline configurado.

### Keep-alive herdado

Não deve ser reaproveitado porque:

- o path padrão referencia modelo de outro projeto;
- uma resposta inesperada pode ser tratada como sucesso;
- o modo de autenticação está desatualizado para novas chaves;
- diagnóstico verboso aumenta risco de log;
- “manter vivo” não substitui health check, alertas ou escolha consciente de plano.

Nenhum workflow foi apagado nesta fase para preservar evidência e permitir decisão explícita.

## Configuração local

`.mcp.json` foi analisado apenas por estrutura. Ele contém configuração de servidor, sem campo de credencial inline detectado. Por ser específico do ambiente, foi incluído no `.gitignore`. Um exemplo público só deve ser criado se houver caso de uso e sem project ref real.

## Recomendações por prioridade

### Antes de qualquer commit amplo

- Revisar o conjunto exato com `git status` e staging por arquivo.
- Confirmar que `.gitignore` cobre novos artefatos.
- Não adicionar `private/`, `.mcp.json`, envs ou planilha.

### Fase 2

- Substituir os dois workflows.
- Consolidar instruções de agentes.
- Criar secret scanning e análise de dependências.
- Fixar versões/lockfile.

### Antes de produção/publicação

- Rever histórico completo.
- Habilitar proteção de branch e push protection.
- Definir retenção de anexos/importação/auditoria.
- Validar backup/restore.

## Resultado

Não foi detectado segredo no histórico rastreado. Há arquivos privados e herdados no working tree que não devem ser adicionados sem revisão. O `.gitignore` reduz o risco de inclusão acidental, mas não substitui revisão de staging e secret scanning.

## Resolução e revisão corretiva da Fase 2

Em 2026-07-30, o CI legado foi substituído pelos gates do Next.js, o keep-alive inseguro foi
removido, `AGENTS.md` foi consolidado, o contrato de ambiente foi sanitizado e um scanner local/CI
passou a impedir arquivos proibidos e padrões de segredo sem imprimir seus valores.

### Runtime e lockfile

- Node.js `24.18.1` foi confirmado no índice e nos arquivos oficiais da linha 24, inclusive nos
  artefatos Linux x64 usados pelo CI.
- O manifesto oficial do `actions/node-versions`, consumido pelo `actions/setup-node`, classifica
  `24.18.1` como estável/LTS e publica o respectivo artefato Linux x64.
- npm `11.16.0` acompanha essa distribuição e foi usado para gerar o lockfile v3 e executar
  `npm ci`.
- Todas as dependências diretas estão fixadas sem ranges. Next.js `16.3.0` e React/React DOM
  `19.2.8` são estáveis, sem preview ou canary.
- `@types/node` foi corrigido da linha 26 para `24.13.3`, compatível com o runtime.
- Os únicos scripts de instalação transitivos foram revisados e permitidos por versão exata:
  `sharp@0.35.3` apenas verifica a disponibilidade do binário/libvips, e
  `unrs-resolver@1.12.2` prepara o binding nativo já declarado como dependência opcional.

### Revisão individual dos overrides

| Dependência | Pacote pai e versão resolvida | Advisory | Decisão e compatibilidade | Alternativa pelo pai |
|---|---|---|---|---|
| PostCSS | Next.js `16.3.0` instala `8.5.23`; Tailwind e Vite usam a dependência direta `8.5.25` | `GHSA-qx2v-qp2m-jg93` afeta `<8.5.10`; `GHSA-6g55-p6wh-862q` afeta `<=8.5.11`; `GHSA-r28c-9q8g-f849` afeta `<=8.5.17` | Override removido. As duas versões instaladas estão corrigidas e cada pacote permanece dentro do próprio contrato semântico. | Resolvido pela atualização do pacote pai; não é mais necessário forçar uma única versão. |
| Sharp | Next.js `16.3.0` declara o opcional `^0.35.3` e resolve `0.35.3` | `GHSA-f88m-g3jw-g9cj` afeta `<0.35.0` | Sem override. A versão corrigida agora pertence ao range oficialmente aceito pelo Next.js. | Resolvido pela atualização direta do Next.js para a versão estável `16.3.0`. |
| minimatch | ESLint `9.39.5`, `@eslint/config-array` `0.21.2`, `@eslint/eslintrc` `3.3.6` e os plugins import/jsx-a11y/react declaram `^3.1.x`, resolvendo `3.1.5` | Exposto por `brace-expansion` no `GHSA-mh99-v99m-4gvg`; o audit marca `2.0.0 - 10.0.2` | Override `10.2.6` removido por exceder todos os ranges `^3.1.x`. | ESLint 10 atualiza parte da árvore, mas os plugins estáveis carregados pelo `eslint-config-next` ainda declaram `^3.1.x`. |
| brace-expansion | Introduzido por `minimatch 3.1.5`, que declara a linha 1 e resolvia `1.1.18` | `GHSA-mh99-v99m-4gvg` afeta `<=5.0.7` | Override `5.0.9` removido: ele está fora da linha aceita e sua API não é compatível com minimatch 3. | Não há release corrigida na linha 1 nem atualização estável de todos os pais. |

### Resultado do npm audit

Em 2026-08-03, um novo advisory de alta severidade para Sharp `<0.35.0` passou a ser reportado.
O projeto foi atualizado diretamente de Next.js `16.2.12` para a release estável `16.3.0`, cujo
contrato aceita Sharp `^0.35.3`. Depois de `npm ci`, o lockfile resolve Sharp `0.35.3`, PostCSS
`8.5.23` para Next e PostCSS `8.5.25` para Tailwind/Vite, todos sem override.

O `npm audit` atual reporta **zero vulnerabilidades** em 514 pacotes auditados. `npm audit fix --force`
não foi executado em nenhuma etapa.
