# CLAUDE.md

## Workflow de execução em fases (prompts grandes)

Prompts extensos são divididos em fases por modelo pra economizar tokens:
tarefas complexas/multissistema ficam com o modelo forte (**Opus 4.8** ou
**Fable**); tarefas contidas (CSS, textos, bugs pontuais) ficam com o
**Sonnet 5**. Ao fim de cada fase: validar build/testes e **parar**
(barreira) avisando o Richard para trocar o modelo antes de continuar a
fase seguinte do todo list.

## Docs — leia antes de assumir, não repita conteúdo aqui

- `README.md` — visão geral do produto
- `docs/GUIA-DO-USUARIO.md` — regras de gamificação
- `docs/private/NOTES.md` — notas internas do Richard (git-ignored).
  Grave aqui sugestões, dívida técnica e decisões pendentes.
  **Nunca** transforme isso em comentário no código.

## Convenções de código

- Comentários: só o essencial pra manutenção. Sem comentário óbvio, sem
  qualquer marca de "gerado por IA" (nunca `// added by Claude` etc).
- Server segue camadas `domain/ → repositories/ → services/ → routes/`.
  Manter esse padrão em features novas.
- Cliente único de dados: **Supabase Postgres**. Proibido reintroduzir
  MongoDB ou qualquer driver relacionado.
- TypeScript estrito. Evitar `any`.

## Git — identidade obrigatória (inegociável)

```
user.name  = RDEsley
user.email = richardesleyso@gmail.com
```

Claude/Anthropic **nunca** aparece como autor, co-author, contribuidor ou
trailer de commit/tag. Sem `Co-authored-by: Claude` nem variações.

## Gatilho "Manda pro github"

Definido em `.claude/skills/manda-pro-github/SKILL.md`. Resumo: commit
direto na `main`, título em inglês (Conventional Commits), corpo em
português explicando o porquê, sem qualquer menção a IA.
