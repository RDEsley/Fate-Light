# Plano do Sistema Financeiro Fate Eight Tech

Status: plano revisado e aprovado. A Fase 1 limita-se a planejamento e segurança do repositório.

## 1. Visão do produto

Construir uma aplicação web pública de gestão financeira e operacional para agências, profissionais e pequenas prestadoras de serviços. Cada cadastro cria um workspace isolado; o primeiro uso em produção será o workspace da Fate Eight Tech. O produto substitui uma planilha operacional sem se apresentar como sistema contábil ou como substituto de contabilidade profissional.

O produto deve transformar controles dispersos em um fluxo auditável:

`cliente -> contrato -> itens -> agenda -> cobrança -> linhas -> pagamento -> alocações -> despesas -> pagamentos de despesas -> indicadores`

## 2. Princípios aprovados

- Gestão financeira gerencial, não contabilidade formal.
- Receita própria, verba administrada de mídia e repasses separados desde o banco.
- Status comercial de cliente separado da situação financeira calculada.
- Valores monetários exatos com `numeric`, transporte decimal como texto e arredondamento explícito.
- Datas civis com `date`; eventos com `timestamptz` em UTC; regras de dia no timezone do workspace.
- UUID v4 gerado no PostgreSQL por `gen_random_uuid()` para entidades principais.
- Isolamento multi-tenant por `workspace_id`, RLS e testes cruzados entre workspaces.
- Somente o papel `owner` é funcional dentro do workspace no MVP.
- Administrador global separado, com acesso a metadados operacionais, nunca aos dados financeiros.
- Anexos em buckets privados, com RLS, validação e URLs assinadas de curta duração.
- Recorrência idempotente executada por Supabase Cron, sem depender de abertura do sistema.
- Registros financeiros confirmados são corrigidos por eventos de cancelamento, ajuste ou reembolso, não por exclusão destrutiva.

As decisões detalhadas estão em [docs/decisions.md](docs/decisions.md) e nos ADRs.

## 3. Escopo do MVP

### Acesso, conta e produto público

- Landing page pública.
- Cadastro público por senha ou magic link, confirmação por e-mail e proteção contra abuso.
- Login por magic link, encerramento de sessão e tratamento de conta suspensa.
- Aceite versionado dos Termos de Uso e da Política de Privacidade.
- Onboarding para criar o workspace inicial.
- Perfil pessoal com nome, foto, telefone opcional, idioma, timezone, preferências de movimento, sessões, exportação e solicitação de exclusão.
- Configurações do workspace: identidade, moeda única, timezone, formato de data e alertas padrão.

### Operação e financeiro

- Clientes, contatos, tags, histórico e situação financeira calculada.
- Catálogo de serviços.
- Contratos com múltiplos itens e versões com vigência.
- Itens únicos ou recorrentes, adicionais, pausas, reativações e cancelamentos.
- Cobranças manuais ou geradas por agenda.
- Linhas de cobrança classificadas como receita própria, mídia administrada ou repasse.
- Pagamentos totais e parciais, com alocação obrigatória por linha.
- Despesas operacionais, custos diretos, gastos de mídia e desembolsos de repasse separados.
- Fornecedores, categorias, recorrência de despesas e pagamentos de despesas.
- Domínios, renovações e alertas configuráveis.
- Anexos privados em clientes, contratos, cobranças, pagamentos e despesas.
- Central de alertas interna, dashboard e atividade recente.
- Relatórios gerenciais por período, cliente e serviço.
- Importação segura da planilha com prévia, mapeamento, validação, deduplicação e resultado transacional.
- Exportação CSV com filtros e separação por natureza financeira.
- Auditoria de alterações críticas.
- Administração global básica e isolada.

### Qualidade do MVP

- Mobile-first, responsivo, acessível e compatível com `prefers-reduced-motion`.
- RLS em toda tabela exposta e Storage privado.
- Testes unitários, de integração, componentes e fluxos críticos E2E.
- CI reproduzível, análise de segredos e verificação de políticas.
- Estados de carregamento, vazio, erro, sucesso e acesso negado.

## 4. Fora do MVP

### Próxima versão

- Convites, membros e papéis funcionais de workspace.
- Múltiplos workspaces selecionáveis por usuário.
- Conciliação bancária e importação OFX.
- Notificações por e-mail e push.
- Automações avançadas.
- Exportação XLSX e PDF.
- Relatórios avançados.
- Monetização e planos.

### Futuro

- Partidas dobradas, diário, razão, balancete, plano de contas formal, DRE contábil, balanço patrimonial, períodos e fechamentos contábeis.
- Integrações bancárias, fiscais e emissão de nota.
- API pública, webhooks e PWA.

Documentos fiscais existentes podem ser anexados no MVP; o sistema não emite documentos fiscais.

## 5. Arquitetura alvo

- Next.js com App Router e TypeScript estrito.
- React e Tailwind CSS, com primitivos acessíveis e um design system local.
- Supabase Auth, PostgreSQL, Storage privado e Cron.
- Validação de formulários com Zod e React Hook Form.
- Server Components por padrão; Client Components apenas para interação.
- Camada de aplicação/domínio entre UI e acesso a dados.
- Vitest, Testing Library e Playwright.
- TanStack Query e biblioteca de gráficos apenas nos casos em que reduzam complexidade real.

Na Fase 2, as versões deverão ser novamente conferidas e fixadas. A referência atual é Next.js 16 Active LTS no patch de segurança mais recente, não versões preview.

## 6. Superfícies e rotas planejadas

### Públicas

- `/`, `/login`, `/cadastro`, `/auth/confirm`
- `/termos`, `/privacidade`, `/conta-suspensa`

### Workspace autenticado

- `/onboarding`, `/dashboard`
- `/clientes`, `/servicos`, `/contratos`
- `/cobrancas`, `/pagamentos`, `/despesas`
- `/dominios`, `/alertas`, `/relatorios`, `/importar`
- `/perfil`, `/configuracoes/empresa`

### Plataforma

- `/platform`, `/platform/usuarios`, `/platform/workspaces`, `/platform/auditoria`

As rotas de plataforma usam autorização separada e não consultam tabelas financeiras.

## 7. Fases de execução

1. **Planejamento e segurança do repositório**: análise, requisitos, arquitetura, modelo, UX, ADRs, `.gitignore`, segredos e auditoria do legado.
2. **Fundação técnica**: scaffold, versões fixadas, TypeScript estrito, estilos, testes, CI, clientes Supabase e tratamento de ambiente, sem regras de negócio.
3. **Autenticação, cadastro, perfil e workspace**: magic link, confirmação, onboarding, legal, perfil, sessões e RLS base.
4. **Cadastros operacionais**: clientes, contatos, serviços, fornecedores e categorias.
5. **Contratos e recorrência modelada**: itens versionados, adicionais e agendas; job real somente após testes de idempotência.
6. **Cobranças e pagamentos**: linhas por natureza, parciais, alocações e anexos.
7. **Despesas e custos**: naturezas, vínculos e pagamentos.
8. **Domínios e alertas**: regras configuráveis, deduplicação e central interna.
9. **Dashboard e relatórios**: métricas explicadas, filtros e drill-down.
10. **Importação e exportação**: pipeline transacional e relatório de inconsistências.
11. **Administrador global e ciclo de conta**: metadados, suspensão, exportação, exclusão e auditoria separada.
12. **Hardening e publicação**: testes cruzados de RLS, acessibilidade, responsividade, desempenho, documentação e revisão pública.

Cada fase só começa após o gate da anterior; detalhes estão em [docs/implementation-plan.md](docs/implementation-plan.md).

## 8. Métricas financeiras canônicas

- Receita própria faturada: soma das linhas `company_revenue`.
- Verba de mídia faturada: soma das linhas `managed_media`.
- Repasse faturado: soma das linhas `pass_through`.
- Total bruto faturado: soma das três naturezas.
- Receita própria recebida: alocações de pagamentos em `company_revenue`.
- Verba de mídia recebida: alocações em `managed_media`.
- Saldo de mídia: mídia recebida menos gastos e devoluções de mídia.
- Resultado de caixa: receita própria recebida menos despesas operacionais e custos diretos pagos.
- Resultado por competência: receita própria da competência menos despesas operacionais e custos diretos da competência.
- Margem estimada: receita própria esperada menos custos diretos estimados, dividida pela receita própria esperada.

Mídia e repasses nunca entram em receita, resultado ou margem da empresa.

## 9. Riscos principais

- Importar sem confirmar a semântica de colunas ambíguas da planilha.
- Vazamento multi-tenant por política RLS incompleta.
- Perda de precisão ao transformar decimais em `number` no JavaScript.
- Mudança de dia por conversão indevida entre `date`, UTC e timezone local.
- Cobranças duplicadas em reprocessamentos de recorrência.
- Acesso excessivo do administrador global.
- Upload de arquivo malicioso ou acesso público acidental.
- Indicadores ambíguos que misturem faturamento bruto com receita própria.

## 10. Critério para iniciar a Fase 2

- Gate da Fase 1 aprovado.
- Workflows herdados desativados, removidos ou substituídos conscientemente.
- Configurações locais específicas e dados reais fora do Git.
- Stack e versões revalidadas nas fontes oficiais.
- Convenções de arquitetura, dinheiro, datas, RLS e testes aceitas.
- Nenhuma ambiguidade da planilha capaz de corromper a importação tratada silenciosamente.
