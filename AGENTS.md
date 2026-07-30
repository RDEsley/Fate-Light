# Instruções do projeto para o Codex

Estas regras valem para todo o repositório.

## Contexto do projeto

- Leia `CLAUDE.md` e os arquivos relevantes dentro de `claude/` antes de
  iniciar mudanças substanciais.
- Preserve os guardrails de segurança existentes.
- Nunca exponha, registre ou envie segredos, credenciais, tokens, arquivos
  `.env`, `SUPABASE_SERVICE_ROLE_KEY` ou `JWT_SECRET`.

## Identidade Git obrigatória

Antes de criar commits ou tags, confirme a configuração local do repositório:

```text
user.name=RDEsley
user.email=richardesleyso@gmail.com
```

Todos os commits e tags devem ter somente essa identidade. Nunca inclua Codex,
OpenAI, Claude, Anthropic, agente, bot ou qualquer IA como autor, coautor,
committer, tagger, contribuidor ou trailer. Não adicione mensagens como
`Co-authored-by`, `Generated-by` ou equivalentes.

## Gatilho "Manda pro github"

Quando Richard disser **"Manda pro github"** (incluindo variações inequívocas
como "manda pro git", "sobe pro GitHub" ou "commita e envia"), execute o fluxo
completo abaixo sem pedir uma confirmação adicional:

1. Leia `git status`, o diff completo, o histórico recente, a branch atual, os
   remotes e as tags existentes.
2. Confirme que o remote `origin` aponta para
   `https://github.com/RDEsley/FateEight.git`.
3. Configure e valide localmente a identidade Git obrigatória.
4. Verifique se há segredos ou arquivos gerados no conjunto de mudanças. Nunca
   envie `.env`, credenciais, dependências instaladas, artefatos de build ou
   dados privados.
5. Separe assuntos logicamente distintos em commits diferentes. Faça staging
   explícito por arquivo ou grupo; nunca use `git add .` ou `git add -A`
   cegamente.
6. Use Conventional Commits:
   - título em inglês, no imperativo, com no máximo 72 caracteres;
   - corpo em português, explicando o que mudou e principalmente o motivo;
   - tipos permitidos: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`,
     `test`, `perf`, `build` e `ci`;
   - nenhuma referência a IA na mensagem ou nos trailers.
7. Rode as verificações adequadas ao projeto e só prossiga se estiverem
   aprovadas. Se uma verificação não puder ser executada, registre isso no
   resumo ao usuário.
8. Revise `git diff --cached` e a autoria final antes de cada commit.
9. Envie os commits para a branch correspondente no `origin`.
10. Crie uma tag anotada SemVer única no commit final do envio:
    - determine a próxima versão a partir das tags existentes;
    - use incremento `major` para mudança incompatível, `minor` para nova
      funcionalidade e `patch` para correção/manutenção;
    - se ainda não houver tags, comece em `v0.1.0`;
    - escreva um título curto em inglês e um changelog em português;
    - não inclua referências ou trailers de IA.
11. Envie apenas a nova tag ao `origin` e confira se branch e tag foram
    publicadas com sucesso.
12. Informe ao Richard os commits criados, a tag publicada, as verificações
    executadas e qualquer ressalva relevante.

Se não houver mudanças para commitar, não crie commit vazio nem tag vazia.
Explique que o repositório já está atualizado.

