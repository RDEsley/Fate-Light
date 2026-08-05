# ADR 0012 — Contrato de versões do runtime na Vercel

- Status: aceito
- Data: 2026-08-03

## Contexto

O desenvolvimento local e a CI usam Node.js `24.18.1` e npm `11.16.0` de forma reproduzível. A
Vercel, porém, oferece somente a seleção da linha major do Node.js e atualiza automaticamente as
versões minor e patch. Um Preview remoto executou Node.js `24.15.0` e npm `11.12.1`; os valores exatos
em `package.json#engines` geraram `EBADENGINE`, embora o build tenha sido concluído.

## Decisão

- `.nvmrc` e os workflows continuam fixados em Node.js `24.18.1`;
- `packageManager` continua fixado em npm `11.16.0`, preservando a versão que produz o lockfile;
- `package.json#engines` declara `node: 24.x` e `npm: 11.x`, que representam o contrato de
  compatibilidade real da aplicação;
- a Vercel permanece configurada para Node.js `24.x` e pode atualizar minor/patch sem produzir falso
  alerta de incompatibilidade;
- dependências e código continuam validados pela instalação limpa e pelos gates na versão exata da
  CI.

## Consequências

O deploy deixa de emitir `EBADENGINE` quando a Vercel ainda não usa exatamente o patch local. Em
contrapartida, diferenças de patch entre CI e hospedagem são esperadas e devem ser observadas nos
logs do build. Uma mudança para Node.js 25 ou npm 12 continua bloqueada pelo contrato.
