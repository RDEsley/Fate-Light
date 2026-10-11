# Changelog

Todas as mudanças relevantes do Fate Light são registradas neste arquivo a partir do estado atual do
projeto. O versionamento segue SemVer.

## [Unreleased]

### Added

- Convite de doação: cartão dispensável no rodapé do menu e janela em duas etapas que abre sozinha
  uma única vez, a partir da quinta visita, com os botões travados por dois segundos. Dispensar o
  cartão abre a janela mais uma vez e o esconde; ele volta depois de sair da conta. Não aparece no
  modo visitante. A contagem de visitas fica só no navegador.
- Agradecimento em `/apoiar` ao copiar o código Pix, animações na página e no convite, e o item
  “Apoiar o Fate Light” no menu da conta.

## [0.17.0] - 2026-10-10

### Added

- Página pública `/apoiar`, com link no rodapé da página inicial: doação voluntária por Pix ao
  desenvolvedor, com valor sugerido ou livre, QR Code e código para copiar. O código é gerado no
  navegador; o sistema não registra a doação nem fica sabendo quem doou.

## [0.16.0] - 2026-10-10

### Added

- Histórico de cobranças na ficha do cliente: tudo o que já foi cobrado dele (pago, pendente e
  cancelado), com filtros por situação e ano e o total recebido no recorte.

### Fixed

- Serviço recorrente ativo que ficou sem cobrança pendente não voltava ao ciclo: salvar o
  serviço com o próximo vencimento agora repõe a cobrança que falta, sem duplicar.

## [0.15.0] - 2026-10-09

### Changed

- Durante o carregamento das telas do sistema, o menu lateral e a barra do topo continuam no
  lugar e utilizáveis; só a área de conteúdo espera.
- Nova animação de carregamento: o mascote pula, fecha os olhos no ar, achata ao cair e tem
  sombra que encolhe com o salto.

## [0.14.1] - 2026-10-09

### Added

- No diálogo "Adicionar à agenda", cada alerta tem "Abrir no Google" para levar um por vez,
  sem arquivo.

### Fixed

- Arquivo de agenda mais compatível: linhas dobradas em 75 bytes, como a norma exige, e sem o
  campo METHOD, que alguns importadores recusam.

## [0.14.0] - 2026-10-09

### Added

- "Adicionar à agenda" na central de alertas: escolha vários alertas e baixe um arquivo de
  agenda (.ics) para importar no Google Agenda. Reimportar não duplica eventos, e o que já foi
  levado fica marcado como "Na agenda" neste navegador.

### Changed

- O botão "Antecedência" da central passa a se chamar "Config. alertas".

## [0.13.0] - 2026-10-09

### Added

- A quantidade de parcelas de um serviço de cobrança única pode ser alterada na edição enquanto
  nenhuma parcela foi paga; depois do primeiro pagamento o campo fica travado.

## [0.12.1] - 2026-10-08

### Changed

- Resumo do serviço mostra o preço promocional em destaque e o valor que vem depois; em
  cobrança única parcelada, a fatia de cada parcela e o total.
- Parcelas ficam à vista ao criar um serviço de cobrança única, fora do bloco recolhido.
- O cartão do serviço perdeu o atalho "Cobrança": a avulsa já tem painel próprio na ficha.

### Fixed

- Desligar o lembrete de reajuste ao editar um serviço mantinha "Revisar preço em…": a edição
  não atualizava a data da revisão. Ligar o lembrete na edição também passa a agendá-la.

## [0.12.0] - 2026-10-08

### Added

- Lembretes podem ser vinculados a um cliente e repetir toda semana, todo mês ou todo ano. Ao
  resolver um lembrete que se repete, a próxima ocorrência é agendada sozinha, a partir da data
  original.

### Fixed

- Lista do seletor de cliente abria atrás do campo seguinte dentro de um bloco recolhido.

### Security

- O guarda do modo visitante trata como ação qualquer destino com esquema que não seja http(s),
  e não só `javascript:` (alerta de code scanning).
- Dependências atualizadas: Supabase JS 2.117.2, Zod 4.6.5, Vitest 5.0.3, jsdom 30.1.2,
  PostCSS 8.5.29 e tipos do Node 24.19.1. A CLI do Supabase segue em 2.117.0: a 2.119 muda o
  formato dos tipos gerados e será adotada à parte.

## [0.11.0] - 2026-10-08

### Added

- Modo visitante: o login ganhou "Explorar como visitante", que abre o sistema com dados fictícios e
  somente leitura. Nada é gravado; qualquer tentativa de alterar mostra "Faça cadastro ou login para
  usar o sistema" (ADR-0021).
- Central de alertas com cartões que filtram por prazo (atrasados, esta semana, próximos e total),
  filtro por tipo e botão para limpar o filtro.
- Lembretes: atalhos de data na criação e "Adiar" para amanhã, 7 ou 30 dias.
- Antecedência dos alertas com valor personalizado, além das opções prontas.
- Domínio cancelado pode voltar a ser acompanhado.

### Changed

- Cobranças, despesas, domínios e alertas em lista compacta: uma linha por registro, a ação principal
  à vista e o restante nos detalhes ao abrir a linha.
- Receber uma cobrança confirma a forma de pagamento em um diálogo curto.
- Despesas: as pendentes sobem pelo vencimento mais próximo e as pagas ficam agrupadas abaixo.
- Onboarding refeito: só nome, empresa e aceites são obrigatórios; dados fiscais e preferências
  ficam recolhidos, com padrões definidos no servidor.
- Excluir a conta e excluir os dados da empresa pedem a frase de confirmação dentro do diálogo, e o
  servidor confere o que foi digitado.
- Perfil e configurações: abas em faixa rolável no celular e blocos com o mesmo cabeçalho.
- "Criar alerta avulso" passou a se chamar "Criar alerta"; em "Próximos" entra só o que vence depois
  de sete dias, para os cartões somarem o total sem sobreposição.
- Vermelho de estado um pouco mais escuro, para atingir contraste AA em texto pequeno.
- Catálogo de serviços filtra por situação com as mesmas pílulas das outras listas.

### Fixed

- Alertas de despesa e de domínio levavam à lista sem destacar o registro citado.
- O cadastro tratava o limite de envio de e-mails como erro nos dados informados.
- O link de recuperação de senha podia terminar no onboarding quando o cadastro estava pendente.
- Formato de data "AAAA-MM-DD" do onboarding era sempre recusado.
- Aviso de "ambiente local" exibido no onboarding em qualquer ambiente.
- E-mail longo invadia a coluna do telefone na ficha do cliente.
- Despesa sem cliente aparecia como "Cliente —" no painel.
- Filtro de situação do catálogo sem nome acessível e lista de fatos do serviço fora do padrão HTML.

## [0.10.1] - 2026-10-08

### Fixed

- Rótulo e marca de “opcional” colados no nome acessível dos campos.

### Changed

- Auditoria de dependências do CI com exceções explícitas e justificadas
  (`scripts/audit-dependencies.mjs`).

## [0.10.0] - 2026-10-08

### Added

- Validação própria dos formulários: o campo recusado ganha borda vermelha e mensagem logo abaixo,
  o primeiro erro recebe o foco e um aviso resume o que falta, no lugar do balão nativo do
  navegador. Vale para o que é barrado na tela e para o que o servidor recusa.
- Empresas e marcas informadas já no cadastro do cliente e gerenciadas em “Editar cliente”.
- Resumo de preço ao vivo no formulário de serviço, com os ajustes ativos à vista.
- Ícone de informação com a explicação do campo sob demanda, no lugar de textos fixos.

### Changed

- Formulários de serviço, cliente, cobrança, despesa, domínio, catálogo e empresa/marca refeitos em
  grade simétrica, com a mesma altura de controle e o mesmo painel de “novo registro”.
- Ficha do cliente mais enxuta: empresas/marcas viram um filtro em uma linha e as opções avançadas
  passam a ser uma lista de ações.
- Avisos de resultado empilham em um único lugar e saem da URL depois de exibidos.
- Login, cadastro, recuperação de senha, onboarding, perfil, configurações da empresa e alerta
  avulso passam a usar o mesmo retorno de erro; o login ganhou o botão de mostrar a senha.
- Barras de filtro das listas com o botão e a altura de controle padrão.

### Fixed

- Aplicar serviço travava sem aviso: “Início do serviço”, obrigatório, ficava dentro do bloco
  recolhido de personalização.
- O aviso de uma ação repetida em seguida (pagar duas cobranças, por exemplo) não aparecia.
- Data escolhida no calendário depois de uma digitação incompleta continuava bloqueando o envio, e
  o botão “Hoje” não atualizava quem dependia da data.
- Formulário dentro de formulário na edição do cliente (lançamentos de receita anterior).
- Link do cliente preenchido pela metade era descartado ao salvar, sem explicação.
- Desfazer o cliente escolhido pela digitação deixava as empresas/marcas dele disponíveis.
- Selo de status do catálogo sem estilo e percentuais exibidos com ponto em vez de vírgula.
- O atalho “Config. de alertas” levava à tela da empresa; a antecedência fica no perfil.

### Security

- Next.js e `eslint-config-next` atualizados para 16.3.8 e correções compatíveis do `npm audit`
  aplicadas. `braces` segue sem versão corrigida: a exceção, restrita ao lint, fica explícita
  em `scripts/audit-dependencies.mjs`, que passa a ser o gate de auditoria do CI.

## [0.8.6] - 2026-09-09

### Changed

- Login e cadastro com shell premium (vidro suave, showcase editorial e formulário limpo).
- Landing com cards do preview restaurados e um card amplo adicional.

## [0.8.5] - 2026-09-09

### Fixed

- Cobertura de testes do efeito de água da landing, restaurando o limiar de branches no CI.

## [0.8.4] - 2026-09-09

### Changed

- Login e cadastro mais limpos: textos longos removidos, benefícios em cards horizontais e layout
  sem scroll no desktop.
- Landing compacta em viewport fixa, com fundos leves e trilha de ondulação sob o cursor.

### Added

- Botões para mostrar/ocultar senha no cadastro.

## [0.8.3] - 2026-09-09

### Changed

- Landing e autenticação com visual mais maduro: badge promocional removido, cards do hero
  refinados e telas de login/cadastro com shell editorial menos infantil, mantendo a identidade
  leve da Fate Light.

## [0.8.2] - 2026-09-09

### Fixed

- Importação v3 isola serviços, cobranças e despesas por `client_entity_id`, permitindo o mesmo
  nome/data/valor em duas empresas do mesmo cliente sem colisão.
- Consolidação deixa `legal_name` nulo quando não há razão social confiável, em vez de copiar o
  nome do cliente de origem.

## [0.8.1] - 2026-09-09

### Fixed

- Consolidação preserva contatos e eventos históricos do cliente arquivado, mantendo valores,
  quantidade de cobranças e vínculos com serviços.
- Importação v3 cria empresas/marcas e relaciona serviços, cobranças, despesas e domínios dentro da
  mesma transação PostgreSQL, com rollback integral em caso de erro.
- Ficha do cliente abre o recorte completo da empresa/marca e alertas exibem o contexto
  `Cliente · Empresa` de forma consistente.

### Security

- `client_entities` passa a usar triggers de timestamp/autoria, auditoria operacional e grants de
  escrita por coluna; identificadores e campos de sistema não podem ser alterados pelo cliente.
- Índices compostos passam a cobrir as FKs de empresa/marca nos registros operacionais.

## [0.8.0] - 2026-09-09

### Added

- Empresas e marcas dentro do cliente (ADR-0020): um cliente comercial passa a comportar várias
  frentes — empresa, marca, projeto ou outro — sem duplicar cadastro. O vínculo é sempre opcional
  e o que não tem empresa continua valendo como geral.
- Seleção opcional de empresa/marca em serviços, cobranças, despesas e domínios, filtrada pelo
  cliente escolhido e oculta quando o cliente ainda não tem nenhuma.
- Consolidação de um cliente legado em empresa/marca de outro, com prévia de contagens e totais e
  confirmação pela frase CONSOLIDAR. Nenhum valor é recalculado e a origem fica arquivada.
- Card "Despesas nos próximos 7 dias" no dashboard e filtro real `due=next7` em `/despesas`.
- Contadores simétricos de clientes ativos e empresas/marcas ativas nas ações rápidas, com recorte
  `?view=entities` na lista de clientes.
- Coluna opcional na importação: linhas `empresa/marca` (ou `entidade`) criam empresas sob o cliente
  informado. A coluna `Empresa` continua significando nome fantasia nas linhas de cliente e
  planilhas antigas importam sem nenhuma mudança.

### Changed

- Painéis de alerta do dashboard redesenhados: borda suave, contagem como selo discreto, itens
  navegáveis com âncora para o registro e vazio compacto.
- "Próximos 7 dias" passa a se chamar "Cobranças nos próximos 7 dias", agora que existe o par de
  despesas.
- Cobranças, despesas, domínios e alertas exibem o contexto "Cliente · Empresa" quando o lançamento
  está vinculado a uma empresa/marca.

## [0.7.0] - 2026-09-09

### Added

- Máscara monetária bancária (`MoneyField`), percentual e inteiro com validação explícita.
- Cobrança criada na ficha do cliente; exclusão corretiva de registros já pagos (ADR-0019).
- Despesas mensais com recorrência idempotente e encerramento explícito da série.
- ADR-0019 e endurecimento de sync/revalidate nas superfícies financeiras.

### Changed

- Login autenticado leva ao Dashboard; Prettier removido do tooling/CI.
- Cobrança manual não vincula `client_service_id` e não avança a agenda automática.
- SoftSubmit removido; envio usa o estado real da Server Action.
- Dependências de produção alinhadas (inclui Next 16.3.4).

### Fixed

- Ficha dinâmica do cliente revalidada após baixa; falha de Storage após exclusão paga sinalizada.
- Percentual sem clamp silencioso; `aria-describedby` nos erros de campo.
- Jornada E2E autenticada estabilizada para a semântica da cobrança manual.

### Security

- Gates de qualidade, isolamento de banco e fluxo autenticado verdes na publicação.


## [0.6.1] - 2026-08-24

### Added

- Núcleo operacional com workspace isolado, clientes, serviços, cobranças, despesas, domínios,
  alertas, histórico, importação e documentos privados.
- Autenticação por senha e magic link, onboarding, perfil, acessibilidade, RLS e CI/CD.

### Changed

- Identidade do produto consolidada como Fate Light.

### Security

- Regras de isolamento por workspace, armazenamento privado e validação de dados protegidas por
  testes e gates de qualidade.
