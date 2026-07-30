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
