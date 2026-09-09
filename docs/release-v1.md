# Checklist de release V1

Este documento é o gate para promover o Fate Light de `0.8.2` a `1.0.0`. A versão só pode ser
alterada quando todos os itens aplicáveis estiverem verificados e os riscos restantes forem aceitos
explicitamente. **Não promove o projeto a 1.0** enquanto houver pendências de produção abaixo.

## Estado da auditoria de 09/09/2026

- Linha atual publicada: `0.8.2` (tag `v0.8.2` na `main`).
- Gates de aplicação e banco limpo estão cobertos pelo CI da `main` (quality, database isolation e
  Authenticated browser flow).
- Migrations do repositório estão aplicadas no projeto remoto; não há lote pendente “somente em
  branch”.
- Domínio canônico de divulgação: `https://fatelight-alpha.vercel.app`.
- Confirmação de e-mail, SMTP, Turnstile de produção, Leaked Password Protection (se ainda
  desativado no Auth remoto) e demais validações manuais de produção **permanecem abertas**.

Por esses motivos, a promoção para 1.0.0 **permanece bloqueada**; a linha `0.x` segue em `0.8.2`
enquanto os itens de produção abaixo não forem fechados.

## Código e qualidade

Itens marcados refletem o que o CI da `main` executa de forma recorrente; revalidar no run da
release candidate antes de promover a 1.0.

- [x] `npm ci`
- [x] `npm audit` sem vulnerabilidade alta ou crítica não tratada
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run test`
- [x] `npm run test:coverage`
- [x] `npm run build`
- [x] `npm run security:check`
- [x] `git diff --check`

## Banco e isolamento

- [x] reset local, migrations e tipos gerados reproduzíveis (job Database isolation no CI)
- [x] pgTAP, lint e advisors de segurança/performance aprovados (CI)
- [x] cenário cross-workspace cobre leitura, escrita, remoção, RPC e documentos privados (pgTAP/CI)
- [x] totais financeiros testados sem incluir verba de mídia como receita própria (testes/regressão)

## Jornadas de produto

- [x] E2E de autenticação aprovado (Authenticated browser flow no CI)
- [x] E2E financeiro cobre cliente, empresas/marcas, serviço, cobrança, baixa, despesa, domínio, alerta e histórico (jornada autenticada no CI)
- [ ] consolidação de cliente em entidade validada com prévia e frase `CONSOLIDAR` (ou cobertura equivalente) — revalidar manualmente na release candidate
- [x] recorrência, promoção gratuita, parcelamento, pausa e encerramento cobertos por regressão
- [x] importação transacional validada com dados fictícios (incluindo linha opcional `empresa/marca`)
- [x] documentos fiscais privados validados, inclusive remoção segura

## Segurança e produção

- [ ] confirmação de e-mail ativada e testada no Supabase de produção
- [ ] SMTP, template de confirmação e recuperação de senha testados
- [ ] Magic link (implementado, fora da UX pública) validado após SMTP de produção
- [ ] Turnstile configurado para produção; secret somente no provedor
- [ ] Leaked Password Protection revisado/ativado no Auth do projeto remoto, se ainda desativado
- [ ] variáveis da Vercel revisadas; nenhum segredo em `NEXT_PUBLIC_*`
- [ ] security headers validados sem quebrar autenticação, Turnstile ou Supabase
- [ ] URLs do Supabase Auth, domínio canônico e redirects de preview revisados
- [ ] bucket e RLS privados revisados

## UX e acessibilidade

- [ ] principais rotas verificadas em 360px, 390px, 768px e desktop
- [ ] teclado, foco, modais, zoom 200%, contraste e reduced motion revisados
- [ ] Axe sem violações críticas nas rotas públicas e autenticadas relevantes
- [ ] estados de loading, vazio, erro, sucesso, permissão e não encontrado revisados

## Operação e comunicação

- [ ] backup e restauração validados conforme [backup-and-restore.md](operations/backup-and-restore.md)
- [ ] ciclo de conta revisado conforme [account-lifecycle.md](operations/account-lifecycle.md)
- [ ] deploy e rollback revisados em [deployment-vercel.md](deployment-vercel.md)
- [ ] README, CHANGELOG e SECURITY revisados
- [ ] tag anotada e notas de release preparadas após aprovação final
