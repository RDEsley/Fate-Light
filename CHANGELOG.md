# Changelog

Todas as mudanças relevantes do Fate Light são registradas neste arquivo a partir do estado atual do
projeto. O versionamento segue SemVer.

## [Unreleased]

### Added

- Checklist operacional e de release para preparar o candidato à versão 1.0.
- Recuperação segura de senha, páginas legais públicas, alertas avulsos e links de evento para o
  Google Agenda.
- Botão para ocultar valores financeiros no dashboard.
- Smoke autenticado de acessibilidade, responsividade e importação no fluxo Playwright.

### Changed

- Documentação do produto alinhada ao uso por freelancers de sites, gestão de campanhas, divulgação
  e domínios.
- Dashboard e resumo de domínios usam agregações completas no PostgreSQL; cobranças, despesas,
  domínios e histórico possuem paginação ou limites explicitamente sinalizados.
- Datas operacionais passam a respeitar o fuso configurado no workspace.

### Fixed

- Cobranças pagas e canceladas agora aparecem pela data de resolução mais recente.
- Site do cliente importado passa a ser gravado na mesma transação do restante da planilha.
- Contador da central de alertas não depende mais da quantidade limitada de cards carregados.

### Security

- Requisitos manuais de produção para confirmação de e-mail, Turnstile, recuperação de senha e
  headers de segurança documentados.
- Turnstile obrigatório em builds de produção e headers HTTP de proteção aplicados pelo proxy.
- Consultas agregadas e novas RPCs mantêm SECURITY INVOKER, owner ativo e testes cross-workspace.

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
