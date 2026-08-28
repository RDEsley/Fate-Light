# ADR-0014 — Dispensa temporária da confirmação de e-mail no cadastro por senha

Status: superada para produção; pendente de ativação manual no ambiente remoto.

> A dispensa descrita abaixo continua sendo o registro fiel do contexto de testes internos em
> 2026-08-05. Ela não é aceitável para a preparação do release 1.0. A ativação de **Confirm email**
> no Supabase de produção, junto com a validação do SMTP e dos redirects, é um passo manual ainda
> pendente; consulte [deployment-vercel.md](../deployment-vercel.md).

## Contexto

O ADR-0009 e o `PLAN.md` definem confirmação de e-mail como parte do cadastro público aprovado
para o MVP. Durante esta fase de testes internos, ainda sem usuários reais, exigir clique em
e-mail de confirmação a cada cadastro atrapalha a validação manual do fluxo e não há necessidade
de comprovar a posse de uma caixa de entrada real. O projeto Supabase hospedado usado pelo
ambiente atual (`ekqgfscnahttlfviiqbv`, "Fate Light") é o mesmo referenciado por
`NEXT_PUBLIC_SUPABASE_URL` em `.env.local`.

O código de `src/app/(auth)/actions.ts` já era condicional: `authenticateWithPassword` só
redireciona para a tela "confirme seu e-mail" quando `supabase.auth.signUp` não devolve sessão.
Quando a confirmação está desligada no projeto, o Supabase devolve sessão imediatamente e o
cadastro por senha já segue direto para o gate de conta (`getAccountDestination`), sem qualquer
mudança de código.

## Decisão

- A opção "Confirm email" do Supabase Auth é desligada manualmente, pelo painel do projeto
  hospedado "Fate Light", em vez de aplicada por `supabase config push`. `config push` foi
  rejeitado porque sincronizaria todo o `supabase/config.toml` local (rate limits, templates,
  SMTP) para o projeto real, criando risco de sobrescrever configuração de e-mail não versionada.
- O cadastro por senha continua pedindo um valor de e-mail com formato válido — o Supabase Auth
  exige um identificador de e-mail ou telefone para criar o usuário — mas nenhuma mensagem
  precisa ser recebida ou confirmada para a conta ficar ativa.
- O magic link permanece inalterado: por natureza ele depende de um e-mail alcançável e continua
  disponível como método alternativo em `/login` e `/cadastro`.
- Nenhuma tabela, RLS ou RPC de identidade depende de `email_confirmed_at`; o único efeito da
  configuração é se `signUp` devolve sessão imediata ou exige confirmação antes do primeiro login.
- Esta é uma exceção declarada, não uma revisão do ADR-0009: o requisito de confirmação de e-mail
  do MVP permanece o padrão para publicação. Antes de abrir cadastro público ou migrar para
  produção (Fase 12), a opção deve ser reativada no painel e este ADR marcado como superado.

## Consequências

- Qualquer pessoa pode criar conta com um e-mail que não controla enquanto a opção estiver
  desligada; aceitável apenas durante testes internos sem dados de clientes reais.
- Nenhuma mudança de código foi necessária; o branch existente de `hasSession` em
  `authenticateWithPassword` já cobre os dois estados da configuração.
- A configuração do projeto hospedado diverge de `supabase/config.toml` até ser resolvida; isso é
  aceitável porque `config.toml` já teria o valor local correto (`enable_confirmations = false`)
  se um dia for sincronizado com cuidado, campo a campo, em vez de um push completo.

## Alternativas rejeitadas

- `supabase config push`: aplicaria a configuração correta de confirmação de e-mail, mas junto
  com todos os outros campos de `[auth]`, `[auth.email]` e `[auth.rate_limit]` do arquivo local,
  incluindo SMTP — risco desnecessário para uma mudança de um único campo.
- Bypass no código da confirmação do Supabase: exigiria ignorar `data.session` mesmo quando
  ausente e criar sessão por fora do fluxo do Supabase Auth, quebrando a invariante do ADR-0009 de
  que a identidade vem sempre de claims verificadas pelo próprio Supabase.

## Reversão

Reativar "Confirm email" no painel do projeto "Fate Light" antes da Fase 12 (hardening e
publicação) ou assim que o cadastro deixar de ser uso interno. Nenhuma reversão de código é
necessária.
