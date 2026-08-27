# Deploy do Fate Light na Vercel

## Configuração versionada

O projeto usa o suporte nativo da Vercel para Next.js e mantém em `vercel.json` somente as decisões
que precisam ser reproduzíveis:

- instalação determinística com `npm ci`;
- execução das Functions em São Paulo (`gru1`), na mesma região do Supabase (`sa-east-1`);
- detecção explícita do framework Next.js.

A produção utiliza a autenticação do próprio Fate Light. Por isso, **Vercel Authentication/SSO deve
ficar desativado em Production**; caso contrário, visitantes são enviados ao login da Vercel antes de
chegar à aplicação. A proteção de forks Git pode permanecer ativa.

O importador usa o runtime Node.js, duração máxima de 30 segundos e aceita arquivos `.xlsx` ou
`.csv` de até 4.000.000 bytes. O limite da Server Action é 4,2 MB para manter o corpo multipart
abaixo do limite de 4,5 MB das Vercel Functions.

## Criar ou vincular o projeto

No diretório raiz:

```powershell
npx vercel@latest login
npx vercel@latest link
```

Ao criar o projeto, selecione o repositório `RDEsley/Fate-Light` e use:

| Campo | Valor |
| --- | --- |
| Framework Preset | Next.js |
| Root Directory | `./` |
| Install Command | definido pelo `vercel.json`: `npm ci` |
| Build Command | padrão: `npm run build` |
| Output Directory | padrão do Next.js; não preencher |
| Node.js Version | `24.x` |
| Function Region | São Paulo (`gru1`) |

O repositório fixa `24.18.1` para desenvolvimento e CI. Em `engines`, declara compatibilidade com
Node.js `24.x` e npm `11.x`, pois a Vercel atualiza minor e patch automaticamente e garante apenas a
linha major.

## Variáveis de ambiente

Cadastre em **Project → Settings → Environment Variables**. Os valores reais nunca devem entrar no
Git, em logs ou em capturas de tela.

| Variável | Produção | Preview | Observação |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | `https://seu-dominio` | a mesma URL canônica | Sem barra final; controla metadata e links de autenticação |
| `NEXT_PUBLIC_SUPABASE_URL` | URL da API do projeto | mesma URL ou projeto separado | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | chave `sb_publishable_...` | mesma chave ou projeto separado | É pública por definição; nunca use a secret key no navegador |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | obrigatória | opcional | Site key pública do Turnstile; em produção o deploy não é elegível sem ela |
| `SUPABASE_SECRET_KEY` | deixar vazio | deixar vazio | O MVP não usa cliente privilegiado |

As variáveis `NEXT_PUBLIC_*` são incorporadas no build. Qualquer alteração exige um novo deploy.

Pela CLI, depois de vincular o projeto:

```powershell
npx vercel@latest env add NEXT_PUBLIC_APP_URL production
npx vercel@latest env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel@latest env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
npx vercel@latest env ls production
```

Repita para `preview` se esse ambiente também for usado. Os comandos solicitam os valores de forma
interativa para evitar que segredos apareçam no histórico do terminal.

## Configuração obrigatória no Supabase

Em **Authentication → URL Configuration**:

1. defina **Site URL** como `https://seu-dominio`;
2. adicione `https://seu-dominio/**` às Redirect URLs;
3. mantenha `http://localhost:3000/**` para desenvolvimento;
4. se usar previews, adicione o padrão da sua conta, por exemplo
   `https://*-<slug-da-equipe>.vercel.app/**`;
5. confira se os templates hospedados usam `{{ .RedirectTo }}` nos links de confirmação.

Antes de habilitar a importação em produção, aplique a migration pendente de forma controlada:

```powershell
npx supabase db push --dry-run --linked
npx supabase db push --linked
```

O primeiro comando apenas lista o que seria aplicado. O segundo altera o banco remoto e só deve ser
executado após os gates e a revisão do SQL.

Para usar Cloudflare Turnstile, cadastre os domínios na Cloudflare, informe a site key na Vercel e a
secret key diretamente em **Supabase → Authentication → Bot and Abuse Protection**. A aplicação não
precisa nem deve receber a secret do Turnstile. Em produção, aplique o Turnstile a cadastro, login,
magic link e recuperação de senha; previews podem usar a configuração de desenvolvimento.

## Autenticação de produção

Antes de liberar o cadastro público, em **Supabase → Authentication**:

1. ative **Confirm email**;
2. configure um SMTP/remetente de produção e teste a entrega em caixa real;
3. revise os templates de confirmação, magic link e recuperação de senha para usar
   `{{ .RedirectTo }}` e links SSR seguros;
4. configure a URL de recuperação para a rota pública de redefinição do Fate Light;
5. execute os fluxos completos de cadastro, confirmação, login por senha, magic link e recuperação
   com URLs de produção e preview permitidas.

O requisito de confirmação foi temporariamente dispensado para testes internos e está registrado no
[ADR-0014](adr/0014-temporary-email-confirmation-waiver.md). A ativação é manual no dashboard:
não execute `supabase config push` para esse único ajuste.

## Headers e superfície pública

Antes da promoção a produção, valide no navegador e em uma resposta HTTP real que os headers de
segurança definidos pela aplicação estão ativos e não quebram Supabase, Turnstile, fontes ou imagens:

- `Content-Security-Policy`, incluindo `frame-ancestors`, `object-src`, `base-uri` e `form-action`;
- `Strict-Transport-Security` no domínio HTTPS;
- `X-Content-Type-Options`, `Referrer-Policy` e `Permissions-Policy`;
- ausência de segredos, URLs assinadas ou dados financeiros nos logs e respostas de erro.

Não considere essa seção uma declaração de que todos os headers já estão em produção: ela é um gate
de validação do release.

## Validar antes e depois do deploy

```powershell
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run build
npm run test:e2e
npm run security:check
npx vercel@latest build
```

Para publicar uma prévia e, depois, produção:

```powershell
npx vercel@latest
npx vercel@latest --prod
```

Após o deploy, valide cadastro, confirmação de e-mail, login por senha, magic link, recuperação de
senha, logout, criação de registros, alertas e uma importação fictícia pequena. Em seguida, confira
os logs da Vercel sem registrar dados privados e os advisors de segurança do Supabase.
