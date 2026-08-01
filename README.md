<div align="center">
  <h1>💰 Fate Eight</h1>
  <h3>Gestão financeira operacional desenvolvida pela Fate Eight Tech</h3>
  <p>
    Centralize clientes, serviços, cobranças, despesas e domínios em um workspace seguro,<br />
    com visão clara do caixa e dos próximos vencimentos.
  </p>
  <p>
    <a href="https://github.com/RDEsley/FateEightProject/actions/workflows/ci.yml"><img src="https://github.com/RDEsley/FateEightProject/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI" /></a>
    <a href="package.json"><img src="https://img.shields.io/badge/version-0.2.0-2563EB.svg" alt="Versão 0.2.0" /></a>
    <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16.2.12-000000?logo=nextdotjs&logoColor=white" alt="Next.js 16.2.12" /></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19.2.8-61DAFB?logo=react&logoColor=0B1F2A" alt="React 19.2.8" /></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-6.0.3-3178C6?logo=typescript&logoColor=white" alt="TypeScript 6.0.3" /></a>
    <a href="https://supabase.com/"><img src="https://img.shields.io/badge/Supabase-PostgreSQL_17-3FCF8E?logo=supabase&logoColor=white" alt="Supabase com PostgreSQL 17" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-16A34A.svg" alt="Licença MIT" /></a>
  </p>
  <p>
    <a href="#-funcionalidades">Funcionalidades</a> •
    <a href="#-tecnologias">Tecnologias</a> •
    <a href="#-instalação-local">Instalação</a> •
    <a href="#-qualidade-e-testes">Testes</a> •
    <a href="#-segurança">Segurança</a> •
    <a href="#-créditos">Créditos</a>
  </p>
</div>

---

## 📌 Sobre o projeto

O **Fate Eight** é um sistema de gestão financeira operacional desenvolvido pela **Fate Eight Tech**.
A própria empresa utiliza o produto no dia a dia, mas ele foi projetado para atender também agências,
prestadores de serviços e outros negócios que precisam substituir controles dispersos em planilhas.

A aplicação acompanha o ciclo completo, desde o cadastro do cliente até o recebimento, sem misturar
a receita da empresa com a verba administrada de mídia.

O sistema oferece autenticação por e-mail e senha ou magic link, isolamento por workspace e
políticas de segurança no banco. A interface é responsiva, acessível e escrita em PT-BR.

> **Status:** MVP operacional. O fluxo principal está implementado e validado localmente com banco,
> testes automatizados e navegador real.

## ✨ Funcionalidades

| Área             | Recursos disponíveis                                                                                                          |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 📊 **Dashboard** | Receitas recebidas e pendentes, mídia separada, despesas, resultado mensal, clientes ativos e alertas de vencimento           |
| 👥 **Clientes**  | Listagem, busca, cadastro, edição, visualização, ativação e inativação                                                        |
| 🧩 **Serviços**  | Vários serviços por cliente, cobrança única ou mensal, valores separados, início, próximo vencimento e encerramento           |
| 💳 **Cobranças** | Receita própria, mídia, adicionais, total bruto calculado, vencimento, baixa com data real, forma de pagamento e cancelamento |
| 🧾 **Despesas**  | Categorias operacionais, despesas fixas ou variáveis, vínculo opcional com cliente e baixa de pagamento                       |
| 🌐 **Domínios**  | Cliente, registrador, expiração, renovação automática, custo, responsável pelo pagamento e cancelamento                       |
| 🔔 **Alertas**   | Cobranças vencidas ou nos próximos 7 dias e domínios vencidos ou expirando em até 30 dias                                     |
| 🔐 **Conta**     | Login por e-mail e senha, opção de magic link, onboarding, perfil, tema, configurações e solicitações de privacidade          |

### Regra financeira central

```text
Total bruto = receita própria + verba de mídia + adicionais

Resultado da empresa = receita própria recebida
                     + adicionais recebidos
                     - despesas pagas
```

A **verba de mídia nunca entra na receita da empresa**. Cobranças atrasadas são identificadas pela
data de vencimento, sem depender de Cron ou de atualização manual de status.

## 🧭 Fluxo de uso

1. Entre com e-mail e senha ou escolha usar um magic link; conclua o workspace no primeiro acesso.
2. Cadastre um cliente em **Clientes**.
3. Abra o cliente e adicione um ou mais serviços, como Gestão de Google Ads e Landing Page.
4. Registre a cobrança, mantendo receita própria e mídia em campos separados.
5. Marque a cobrança como paga quando o valor for recebido.
6. Registre despesas e vencimentos de domínios.
7. Acompanhe totais e alertas no **Dashboard**.

## 🛠️ Tecnologias

- **Next.js 16** com App Router e React Server Components por padrão.
- **React 19** e **TypeScript 6** em modo estrito.
- **Tailwind CSS 4** para a interface responsiva.
- **Supabase** para autenticação por senha ou magic link e PostgreSQL 17.
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

## ✅ Pré-requisitos

- [Node.js `24.18.1`](https://nodejs.org/) — também definido em `.nvmrc`.
- npm `11.16.0`.
- Docker Desktop ou runtime compatível com o Supabase CLI.
- Git.

## 🚀 Instalação local

### 1. Clone o repositório

```bash
git clone https://github.com/RDEsley/FateEightProject.git
cd FateEightProject
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

| Comando                  | Finalidade                                      |
| ------------------------ | ----------------------------------------------- |
| `npm run dev`            | Servidor de desenvolvimento                     |
| `npm run build`          | Build otimizado de produção                     |
| `npm run start`          | Executa o build de produção                     |
| `npm run test`           | Testes unitários e de componentes               |
| `npm run test:watch`     | Testes em modo interativo                       |
| `npm run test:e2e`       | Smoke, rotas públicas e acessibilidade          |
| `npm run test:e2e:auth`  | Jornada real com Supabase e Mailpit             |
| `npm run db:test`        | Regras e isolamento PostgreSQL com pgTAP        |
| `npm run db:types`       | Atualiza os tipos gerados do banco local        |
| `npm run security:check` | Detecta arquivos proibidos e padrões de segredo |
| `npm run supabase:stop`  | Encerra a infraestrutura local                  |

## 🔐 Segurança

- Autenticação SSR por e-mail e senha ou magic link, com cookies tratados no servidor.
- Rotas privadas protegidas antes da renderização.
- Isolamento de dados por workspace aplicado no PostgreSQL.
- Nenhuma operação financeira confia em `workspace_id` enviado pelo formulário.
- Grants explícitos e ausência de `DELETE` para os registros operacionais.
- Chave secret reservada ao servidor e atualmente sem cliente privilegiado.
- Validação de entradas com Zod e constraints equivalentes no banco.
- Auditoria de segurança do banco e scanner do repositório integrados ao CI.

Para relatar uma vulnerabilidade, evite issues públicas com detalhes exploráveis. Entre em contato
diretamente com o responsável pelo projeto.

## ⚠️ Limites atuais do MVP

- Recorrências são manuais; a próxima cobrança deve ser criada pelo usuário.
- Não há pagamentos parciais, estornos contábeis ou múltiplos pagamentos por cobrança.
- Não há fornecedores, rateios, centros de custo ou contabilidade completa.
- Não há anexos, importação de planilha, notificações por e-mail ou Cron.
- Serviços, cobranças, despesas e domínios oferecem as ações essenciais do fluxo, sem edição avançada.
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
