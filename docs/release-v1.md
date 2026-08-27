# Checklist de release V1

Este documento é o gate para promover o Fate Light de `0.6.1` a `1.0.0`. A versão só pode ser
alterada quando todos os itens aplicáveis estiverem verificados e os riscos restantes forem aceitos
explicitamente.

## Estado da auditoria de 27/08/2026

- Gates locais de aplicação aprovados; os gates PostgreSQL aguardam o CI porque a estação de
  trabalho não possui Docker.
- Cinco migrations deste hardening ainda estão somente no branch e não foram aplicadas ao projeto
  remoto.
- O projeto Vercel está vinculado e os deployments atuais estão prontos, porém a variável pública
  do Turnstile ainda não está cadastrada em Production/Preview.
- Confirmação de e-mail, SMTP e templates hospedados ainda precisam de validação manual no Supabase.

Por esses motivos, a versão continua 0.6.1 e **a promoção para 1.0.0 permanece bloqueada**.

## Código e qualidade

- [ ] `npm ci`
- [ ] `npm audit` sem vulnerabilidade alta ou crítica não tratada
- [ ] `npm run format:check`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run test:coverage`
- [ ] `npm run build`
- [ ] `npm run security:check`
- [ ] `git diff --check`

## Banco e isolamento

- [ ] reset local, migrations e tipos gerados reproduzíveis
- [ ] pgTAP, lint e advisors de segurança/performance aprovados
- [ ] cenário cross-workspace cobre leitura, escrita, remoção, RPC e documentos privados
- [ ] totais financeiros testados sem incluir verba de mídia como receita própria

## Jornadas de produto

- [ ] E2E de autenticação aprovado
- [ ] E2E financeiro cobre cliente, serviço, cobrança, baixa, despesa, domínio, alerta e histórico
- [ ] recorrência, promoção gratuita, parcelamento, pausa e encerramento cobertos por regressão
- [ ] importação transacional validada com dados fictícios
- [ ] documentos fiscais privados validados, inclusive remoção segura

## Segurança e produção

- [ ] confirmação de e-mail ativada e testada no Supabase de produção
- [ ] SMTP, template de confirmação, magic link e recuperação de senha testados
- [ ] Turnstile configurado para produção; secret somente no provedor
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
