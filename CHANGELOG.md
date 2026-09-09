# Changelog

Todas as mudanças relevantes do Fate Light são registradas neste arquivo a partir do estado atual do
projeto. O versionamento segue SemVer.

## [Unreleased]

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
