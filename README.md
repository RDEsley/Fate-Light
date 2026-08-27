<div align="center">
  <img src="public/favicons/logo.png" width="128" alt="Identidade visual do Fate Light" />
  <h1>💰 Fate Light</h1>
  <h3>Clareza financeira. Caminho Certo.</h3>
  <p>
    Centralize clientes, serviços, cobranças, despesas e domínios em um workspace seguro,<br />
    com visão clara do caixa e dos próximos vencimentos.
  </p>
  <p>
    <a href="https://github.com/RDEsley/Fate-Light/actions/workflows/ci.yml"><img src="https://github.com/RDEsley/Fate-Light/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI" /></a>
    <a href="package.json"><img src="https://img.shields.io/badge/version-0.6.1-2563EB.svg" alt="Versão 0.6.1" /></a>
    <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16.3.2-000000?logo=nextdotjs&logoColor=white" alt="Next.js 16.3.2" /></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19.2.8-61DAFB?logo=react&logoColor=0B1F2A" alt="React 19.2.8" /></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-6.0.3-3178C6?logo=typescript&logoColor=white" alt="TypeScript 6.0.3" /></a>
    <a href="https://supabase.com/"><img src="https://img.shields.io/badge/Supabase-PostgreSQL_17-3FCF8E?logo=supabase&logoColor=white" alt="Supabase com PostgreSQL 17" /></a>
    <a href="https://fate-eight-project-richards-projects-42fb7402.vercel.app"><img src="https://img.shields.io/badge/Vercel-online-000000?logo=vercel&logoColor=white" alt="Produção online na Vercel" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-16A34A.svg" alt="Licença MIT" /></a>
  </p>
  <p>
    <a href="#-funcionalidades">Funcionalidades</a> •
    <a href="https://fate-eight-project-richards-projects-42fb7402.vercel.app">Abrir sistema</a> •
    <a href="#-tecnologias">Tecnologias</a> •
    <a href="#-instalação-local">Instalação</a> •
    <a href="#-deploy-na-vercel">Deploy</a> •
    <a href="#-qualidade-e-testes">Testes</a> •
    <a href="#-segurança">Segurança</a> •
    <a href="#-créditos">Créditos</a>
  </p>
</div>

---

## 📌 Sobre o projeto

O **Fate Light** é um sistema de gestão financeira operacional desenvolvido pela **Fate Eight Tech**.

### Para quem ele serve

Para quem hoje controla o próprio negócio em uma planilha e já sentiu que ela não dá mais conta:
**freelancers de criação de sites, profissionais que gerenciam Google Ads e outras campanhas,
agências pequenas e prestadores de serviços recorrentes**. O Fate Light organiza a operação sem
misturar dinheiro próprio com verba administrada e sem se apresentar como sistema contábil.

Ele resolve especificamente:

- **cobrar projetos e mensalidades sem esquecer** — do site parcelado à gestão recorrente de campanhas,
  você aplica o serviço uma vez no cliente e acompanha cada vencimento;
- **não misturar o que é seu com o que é do cliente** — verba de mídia entra e sai sem nunca contar
  como seu faturamento;
- **acompanhar a operação digital no mesmo contexto** — sites, domínios, campanhas de divulgação e
  serviços ficam ligados ao cliente certo;
- **saber o que vence antes de vencer** — alertas levam você direto à cobrança citada, com rolagem
  guiada até o card certo;
- **começar com o histórico que você já tem** — importação de planilha ou registro de tudo que o
  cliente já pagou antes do sistema existir.

A aplicação acompanha o ciclo completo, do cadastro do cliente ao recebimento, com autenticação por
e-mail e senha ou magic link, isolamento por workspace e políticas de segurança no banco. Interface
em PT-BR, tema claro, identidade cartoon própria e acessibilidade persistente.

> **Status:** versão `0.6.1`, em hardening para o release 1.0. O núcleo operacional está
> implementado; os gates de segurança, operações e testes de produção ainda determinam quando a V1
> poderá ser declarada pronta.

## ✨ Funcionalidades

| Área              | Recursos disponíveis                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 📊 **Dashboard**  | Saudação pessoal, workspace atual, receitas, mídia separada, despesas, resultado, clientes e alertas de vencimento                         |
| 👥 **Clientes**   | Seis situações comerciais, site e até três links extras, observações em destaque, arquivamento, histórico anterior e ordenação por receita |
| 🧩 **Serviços**   | Catálogo automático sem duplicar nomes, edição do serviço aplicado, pausa reversível, encerramento, promoções e nove cadências             |
| 💳 **Cobranças**  | Geração automática, baixa com recorrência, motivos de atraso/cancelamento e NF privada em contas pagas                                     |
| 🧾 **Despesas**   | Categorias operacionais, despesas fixas/variáveis, cliente opcional, baixa e NF privada em contas pagas                                    |
| 🌐 **Domínios**   | Painel de vencimentos, edição, exclusão, registrador como link, múltiplos domínios por cliente e atalho para o cadastro dele               |
| 🔔 **Alertas**    | Antecedência configurável no perfil, faixas de atrasado/hoje/esta semana e link direto para o item citado                                  |
| 🕘 **Histórico**  | Linha do tempo dentro do perfil, pesquisável por cliente e tipo, preservando baixas, atrasos, encerramentos e reativações                  |
| 📥 **Importação** | Prévia e confirmação transacional de planilhas Excel/CSV, modelo oficial, formato legado e proteção contra duplicidade                     |
| 🔐 **Conta**      | Login por e-mail e senha, opção de magic link, onboarding, perfil, acessibilidade, configurações e solicitações de privacidade             |

### Agenda e calendário

O Fate Light organiza vencimentos e alertas internamente. Quando for útil abrir um compromisso fora
do sistema, a integração prevista é um **link de evento para o Google Agenda**: o usuário confirma o
evento no próprio Google. Não há OAuth, leitura de calendário, sincronização automática nem API do
Google Agenda nesta versão.

### Situações do cliente e do serviço

O cliente tem seis situações: **Orçamento**, **Pendente**, **Ativo**, **Inativo**, **Lista negra** e
**Arquivado**. Só Orçamento, Pendente e Ativo recebem serviços novos. Arquivar preserva todo o
histórico e é a saída recomendada quando a exclusão está bloqueada. A lista ordena por situação
primeiro — ativos no topo, lista negra no fim — e, dentro de cada uma, por quanto o cliente já
rendeu, com o mais antigo desempatando.

O serviço aplicado a um cliente tem três estados, e a diferença importa:

| Estado        | O que acontece                                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ativo**     | Gera cobranças no ciclo e aparece nos alertas                                                                                                     |
| **Pausado**   | Para de gerar cobranças e some do radar de alertas; retomar restaura a agenda de onde parou, com os ciclos promocionais já consumidos preservados |
| **Encerrado** | Definitivo. Nada mais é gerado; cobranças e histórico permanecem intactos                                                                         |

### Experiência de uso

- diálogos de confirmação próprios em todo o sistema — nenhum `window.confirm` nativo; exclusões
  irreversíveis travam o botão por alguns segundos, e as mais sensíveis (conta, workspace) também
  exigem digitar uma frase;
- avisos em vez de bloqueios: campos importantes em branco geram uma lista do que faltou, e o
  segundo clique envia assim mesmo;
- erros de formulário apontam o campo exato em português, sem perder o que foi digitado;
- explicações contextuais em `?` ao lado dos rótulos que costumam gerar dúvida;
- selects que medem o espaço disponível e abrem para cima quando não cabem abaixo;
- alerta como guia: clicar leva à cobrança citada, com rolagem suave e destaque temporário da borda;
- tour de primeiro acesso que escurece a tela, ilumina a funcionalidade explicada e navega junto;
- exclusão irreversível exige leitura: o diálogo mostra quanto sai do histórico, pede o nome
  digitado e mantém o botão travado por três segundos;
- dashboard com cards que levam à origem do número, filtro de período, menu lateral recolhível e
  navegação adaptada para celular;
- notificações e avisos ancorados no canto superior direito, logo abaixo do bloco da conta;
- clique com efeito de onda de água, desativável junto com as demais animações;
- botão global de acessibilidade com texto maior, contraste reforçado e destaque de links;
- zonas de risco padronizadas, sempre fechadas por padrão e com confirmação digitada.

### Regra financeira central

```text
Total bruto = receita própria + verba de mídia + adicionais

Resultado da empresa = receita própria recebida
                     + adicionais recebidos
                     - despesas pagas
```

A **verba de mídia nunca entra na receita da empresa**. Cobranças atrasadas são identificadas pela
data de vencimento, sem depender de Cron ou de atualização manual de status.

Duas consequências dessa regra valem destaque:

- **receita é sempre a soma das cobranças.** Não existe campo separado de "total já recebido": o
  histórico anterior ao sistema vira uma cobrança real, já quitada, para que dashboard e histórico
  fechem sozinhos;
- **cobrança de R$ 0,00 é válida.** Um ciclo promocional gratuito precisa existir como cobrança —
  é a liquidação dela que avança a recorrência para o ciclo seguinte.

## 🧭 Fluxo de uso

1. Informe seu nome ou o nome da empresa e entre com senha ou magic link; confirme o workspace sugerido no primeiro acesso.
2. Cadastre um cliente em **Clientes**. Se ele já pagava você antes, informe o total no bloco
   "Já trabalhei com este cliente antes" e o histórico entra junto.
3. Aplique um serviço no card do cliente, com desconto, parcelas, preço promocional ou lembrete de
   reajuste. **Serviços digitados aqui entram no catálogo sozinhos** e podem ser reutilizados em
   outros clientes; nomes repetidos reaproveitam o registro existente em vez de duplicar.
4. A primeira cobrança é criada automaticamente; cobranças avulsas continuam disponíveis e mantêm
   receita própria e mídia em campos separados.
5. Marque a cobrança como paga; serviços recorrentes agendam o próximo vencimento automaticamente.
6. Se o cliente pedir uma pausa, use **Pausar** no serviço em vez de encerrar: alertas e cobranças
   param, e **Retomar** devolve a agenda de onde ela estava.
7. Registre despesas e vencimentos de domínios.
8. Acompanhe totais e alertas no **Dashboard**; clicar no alerta leva direto ao registro citado.
9. Para migrar dados existentes, abra **Importar dados**, gere a prévia e confirme somente depois de
   revisar as contagens, os erros e os avisos.

## 🛠️ Tecnologias

- **Next.js 16** com App Router e React Server Components por padrão.
- **React 19** e **TypeScript 6** em modo estrito.
- **Tailwind CSS 4** para a interface responsiva.
- **Supabase** para autenticação por senha ou magic link e PostgreSQL 17.
- **read-excel-file** para leitura de planilhas `.xlsx`, sem armazenar o arquivo enviado.
- **Zod** para validação nas bordas da aplicação.
- **Vitest** e Testing Library para testes de aplicação.
- **Playwright** e Axe para jornada E2E e acessibilidade.
- **pgTAP** para contratos, regras financeiras e isolamento do banco.
- **ESLint** e **Prettier** para qualidade e consistência.

## 🏗️ Arquitetura

```mermaid
flowchart LR
    U[Usuário] --> N[Next.js App Router]
    N --> A[Supabase Auth]
    N --> D[(PostgreSQL 17)]
    A --> M[Senha ou magic link]
    D --> R[RLS por workspace]
    D --> F[Clientes e serviços]
    D --> C[Cobranças e despesas]
    D --> O[Domínios e alertas]
    U --> I[Importação Excel/CSV]
    I --> V[Prévia e validação]
    V --> D
```

Princípios adotados:

- componentes de servidor por padrão;
- validação de formulários no servidor;
- `workspace_id` em todos os dados operacionais;
- RLS e `FORCE RLS` nas tabelas protegidas;
- FKs compostas para impedir relações entre workspaces;
- valores monetários em `numeric(15,2)`;
- vencimentos em `date` e eventos reais em `timestamptz`;
- nenhuma chave privilegiada em componentes do navegador.
- importação confirmada em uma única transação, sob os mesmos grants e RLS do usuário.

## ✅ Pré-requisitos

- [Node.js `24.18.1`](https://nodejs.org/) — fixado em `.nvmrc` e na CI; o deploy aceita a linha
  `24.x` administrada pela Vercel.
- npm `11.16.0` para desenvolvimento e lockfile; o runtime hospedado aceita npm `11.x`.
- Docker Desktop ou runtime compatível com o Supabase CLI, somente para executar o banco local e os
  testes pgTAP; não é necessário para usar o Supabase remoto.
- Git.

## 🚀 Instalação local

### 1. Clone o repositório

```bash
git clone https://github.com/RDEsley/Fate-Light.git fate-light
cd fate-light
```

### 2. Instale as dependências exatas

```bash
npm ci
```

### 3. Inicie o Supabase local

```bash
npm run supabase:start
npx supabase db reset --local
```

### 4. Configure o ambiente

Copie `.env.example` para `.env.local` e preencha somente o contrato necessário:

```dotenv
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=<URL local da API>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key local>
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
SUPABASE_SECRET_KEY=
```

> ⚠️ A saída completa de `supabase status` contém credenciais locais privilegiadas. Copie somente a
> URL pública e a publishable key. Nunca publique a saída completa nem valores reais de `.env`.

### 5. Execute a aplicação

```bash
npm run dev
```

Acesse:

- Aplicação: [http://localhost:3000](http://localhost:3000)
- Mailpit local: [http://127.0.0.1:54324](http://127.0.0.1:54324)
- Supabase Studio: [http://127.0.0.1:54323](http://127.0.0.1:54323)

O Mailpit recebe somente as mensagens do ambiente local e permite abrir os magic links de cadastro
e login sem configurar um provedor de e-mail.

## ☁️ Deploy na Vercel

O repositório já inclui configuração para instalação determinística e Functions em São Paulo,
próximas do banco Supabase. Na Vercel, selecione **Next.js**, Node.js **24.x**, mantenha os comandos de
build/output padrão e cadastre:

```dotenv
NEXT_PUBLIC_APP_URL=https://seu-dominio
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<site-key-de-producao>
SUPABASE_SECRET_KEY=
```

`SUPABASE_SECRET_KEY` permanece vazia: o produto não usa cliente privilegiado. Em produção, a site
key do Turnstile é obrigatória e a secret deve ser configurada apenas no Supabase. Configure também
a Site URL, Redirect URLs, confirmação de e-mail e templates de recuperação no Supabase Auth. O
passo a passo completo, incluindo previews, headers, Turnstile e checklist pós-deploy, está em
[docs/deployment-vercel.md](docs/deployment-vercel.md).

## 📂 Estrutura do projeto

```text
.
├── docs/                     # Requisitos, arquitetura e decisões técnicas
├── scripts/                  # Segurança, tipos do banco e executor E2E autenticado
├── src/
│   ├── app/                  # Rotas, Server Actions e componentes do App Router
│   ├── components/           # Componentes compartilhados de interface
│   ├── config/               # Contratos de variáveis de ambiente
│   ├── features/             # Regras e validações dos domínios funcionais
│   ├── lib/                  # Autenticação, Supabase e utilitários
│   ├── test/                 # Testes unitários, componentes e E2E
│   └── types/                # Tipos gerados do PostgreSQL
└── supabase/
    ├── migrations/           # Evolução incremental e reproduzível do banco
    ├── templates/            # E-mails locais de autenticação
    └── tests/                # Testes pgTAP de regras e isolamento
```

## 🧪 Qualidade e testes

Execute a verificação completa da aplicação:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run build
npm run test:e2e
npm run security:check
```

Com o Supabase local iniciado, valide também o banco e a jornada autenticada:

```bash
npm run db:test
npm run db:types:check
npm run db:lint
npm run db:advisors:security
npm run test:e2e:auth
```

O E2E autenticado cobre o fluxo operacional completo: conta, workspace, cliente, dois serviços,
cobrança, pagamento, despesa, domínio, dashboard e novo login. Execuções repetidas podem atingir o
limite local de envio de e-mails; aguarde a janela ou reinicie a pilha local antes de tentar novamente.

### Comandos úteis

| Comando                   | Finalidade                                      |
| ------------------------- | ----------------------------------------------- |
| `npm run dev`             | Servidor de desenvolvimento                     |
| `npm run build`           | Build otimizado de produção                     |
| `npm run start`           | Executa o build de produção                     |
| `npm run test`            | Testes unitários e de componentes               |
| `npm run test:watch`      | Testes em modo interativo                       |
| `npm run test:e2e`        | Smoke, rotas públicas e acessibilidade          |
| `npm run test:e2e:auth`   | Jornada real com Supabase e Mailpit             |
| `npm run db:test`         | Regras e isolamento PostgreSQL com pgTAP        |
| `npm run db:types`        | Atualiza os tipos gerados do banco local        |
| `npm run db:types:linked` | Atualiza os tipos do projeto Supabase vinculado |
| `npm run security:check`  | Detecta arquivos proibidos e padrões de segredo |
| `npm run supabase:stop`   | Encerra a infraestrutura local                  |

## 🔐 Segurança

- Autenticação SSR por e-mail e senha ou magic link, com cookies tratados no servidor.
- Rotas privadas protegidas antes da renderização.
- Isolamento de dados por workspace aplicado no PostgreSQL.
- Nenhuma operação financeira confia em `workspace_id` enviado pelo formulário.
- Grants explícitos e ausência de `DELETE` para os registros operacionais.
- Chave secret reservada ao servidor e atualmente sem cliente privilegiado.
- Validação de entradas com Zod e constraints equivalentes no banco.
- Auditoria de segurança do banco e scanner do repositório integrados ao CI.
- Arquivos de importação processados somente em memória, com limite, hash de idempotência e
  confirmação atômica no PostgreSQL.

Consulte [SECURITY.md](SECURITY.md) antes de relatar uma vulnerabilidade. Não abra issues públicas
com detalhes exploráveis.

## ⚠️ Limites atuais do MVP

- A agenda aceita cobrança única, diária, semanal, quinzenal, mensal, bimestral, trimestral,
  semestral e anual. O próximo ciclo nasce na baixa da cobrança atual; não há um agendador em
  segundo plano que faça isso sem a ação do usuário.
- Não há pagamentos parciais, estornos contábeis ou múltiplos pagamentos por cobrança.
- Não há fornecedores, rateios, centros de custo ou contabilidade completa.
- Não há anexos genéricos, notificações por e-mail, push ou Cron; notas fiscais podem ser guardadas
  de forma privada em cobranças e despesas pagas, e os alertas ficam disponíveis dentro do sistema.
- A importação aceita `.xlsx` e `.csv` de até 4 MB e 1.000 registros por lote; arquivos maiores devem
  ser divididos.
- A exclusão é conservadora por padrão, mas o dono decide: clientes com vínculos e cobranças pagas
  seguem protegidos, e excluir um serviço remove apenas as cobranças **não pagas** dele. Havendo
  pagamento confirmado, a exclusão é bloqueada — e só prossegue no modo forçado, que exibe quanto
  de receita sai do histórico e trava o botão por três segundos. Encerrar continua sendo o caminho
  recomendado.
- Serviços do catálogo em uso podem ser removidos com **desvínculo**: o item some do catálogo e os
  clientes seguem com o serviço ativo e o valor combinado.
- Pedidos de exportação e exclusão registram a solicitação, mas não executam jobs automaticamente.
- Os documentos legais incluídos no seed são fictícios e precisam de revisão antes da produção.
- SMTP, Turnstile e URLs de redirecionamento devem ser configurados no ambiente hospedado.

## 🤝 Contribuição

1. Crie uma branch a partir de `main`.
2. Faça mudanças pequenas e focadas.
3. Execute os gates de qualidade e segurança.
4. Use Conventional Commits.
5. Abra um pull request descrevendo comportamento, testes e eventuais riscos.

Não versione arquivos `.env`, credenciais, builds, cobertura, relatórios de teste ou dados privados.

## 📄 Licença

Distribuído sob a licença MIT. Consulte [LICENSE](LICENSE) para mais informações.

---

## 👨‍💻 Créditos

<div align="center">
  <a href="https://github.com/RDEsley">
    <img src="https://github.com/RDEsley.png" width="140" height="140" alt="Foto de Richard Oliveira" style="border-radius: 50%;" />
  </a>
  <h3>Richard Oliveira</h3>
  <p><strong>Desenvolvimento e arquitetura de software</strong></p>
  <p>
    <a href="https://github.com/RDEsley"><img src="https://img.shields.io/badge/GitHub-RDEsley-181717?logo=github" alt="GitHub RDEsley" /></a>
    <a href="mailto:richardesleyso@gmail.com"><img src="https://img.shields.io/badge/E--mail-richardesleyso%40gmail.com-EA4335?logo=gmail&logoColor=white" alt="E-mail" /></a>
  </p>
  <p>Produto desenvolvido pela <strong>Fate Eight Tech</strong> para empresas que buscam clareza operacional. 🚀</p>
</div>
