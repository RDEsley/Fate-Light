# Registro de decisões

## Fundação técnica da Fase 2

Decisões consolidadas e revisadas em 2026-07-30:

- Runtime fixado em Node.js `24.18.1` LTS e npm `11.16.0`. A versão foi confirmada no índice e nos
  arquivos de distribuição oficiais, além do manifesto consumido pelo `actions/setup-node`.
- Os tipos do runtime usam `@types/node` `24.13.3`, na mesma linha principal do Node executado.
- Aplicação fixada em Next.js `16.2.12` e React/React DOM `19.2.8`, releases estáveis atuais, sem
  preview ou canary.
- TypeScript `6.0.3`, modo `strict`, App Router, diretório `src/` e Server Components por padrão.
  A linha 7 foi adiada até que o ecossistema de lint do Next usado pelo projeto seja compatível.
- ESLint `9.39.5` permanece porque o `eslint-config-next` estável ainda carrega plugins cuja árvore
  não foi atualizada de forma compatível para a correção transitiva de `minimatch`.
- O único override mantido é PostCSS `8.5.25`: ele substitui o `8.4.31` transitivo do Next dentro da
  mesma major e elimina os advisories `GHSA-qx2v-qp2m-jg93`, `GHSA-6g55-p6wh-862q` e
  `GHSA-r28c-9q8g-f849`.
- Os overrides de Sharp, minimatch e brace-expansion foram removidos na revisão corretiva porque
  excediam os intervalos declarados pelos pacotes pais. Os advisories sem correção compatível ficam
  registrados como riscos conhecidos em [repository-audit.md](repository-audit.md).
- Tailwind CSS `4.3.3` concentra tokens semânticos em `globals.css`, com temas claro/escuro,
  contraste, foco visível e redução de movimento.
- Zod `4.4.3` valida contratos separados de ambiente público e servidor. A chave secret é opcional
  enquanto não existe cliente privilegiado.
- Supabase JS `2.111.0`, SSR `0.12.4` e CLI `2.110.0` fornecem somente a fundação de clientes e
  ambiente. Proxy de sessão, autenticação, migrations, tabelas e RLS permanecem fora desta fase.
- shadcn/ui e bibliotecas de formulário, tabela, gráfico e estado remoto foram adiados até existir
  uso aprovado.
- Vitest, Testing Library, Playwright e axe formam o baseline de testes. Os limites mínimos são 80%
  para statements, lines e functions, e 75% para branches.
- `AGENTS.md` é a fonte operacional canônica. Nenhuma credencial ou configuração local privada deve
  ser versionada.

## Decisões aceitas

| ID | Decisão | Estado | Registro |
|---|---|---|---|
| ADR-0001 | Separar receita própria, mídia administrada e repasses desde cada linha | Aceita | [ADR](adr/0001-financial-natures.md) |
| ADR-0002 | Multi-tenancy por workspace, membership e RLS | Aceita | [ADR](adr/0002-multi-tenant.md) |
| ADR-0003 | Storage privado e URLs assinadas curtas | Aceita | [ADR](adr/0003-private-storage.md) |
| ADR-0004 | Administrador global separado e sem conteúdo financeiro | Aceita | [ADR](adr/0004-global-administrator.md) |
| ADR-0005 | `numeric(15,2)`, decimal string e arredondamento por linha | Aceita | [ADR](adr/0005-money-and-rounding.md) |
| ADR-0006 | `date` civil, `timestamptz` UTC e timezone por workspace | Aceita | [ADR](adr/0006-dates-and-timezone.md) |
| ADR-0007 | Supabase Cron e idempotência agenda/período | Aceita | [ADR](adr/0007-recurrence-and-idempotency.md) |

## Outras decisões consolidadas

- UUID v4 com `gen_random_uuid()` é o padrão de entidades principais.
- Uma moeda por workspace no MVP; sem conversão cambial.
- Somente `owner` é papel funcional do workspace.
- Status comercial do cliente é armazenado; situação financeira é derivada.
- Cobranças emitidas e pagamentos confirmados não são apagados.
- Adicionais criam itens/versões com vigência, sem efeito retroativo.
- Linha de cobrança é a unidade de natureza financeira.
- Pagamentos são neutros até serem alocados às linhas.
- Resultado de caixa e competência são métricas diferentes e nomeadas.
- Custos diretos entram na margem; overhead operacional entra no resultado, não na margem direta.
- Dashboard e relatórios são consultas derivadas, não tabelas de totais.
- Alertas internos entram no MVP; e-mail/push ficam para depois.
- Arquivos de documentos e avatar ficam privados.
- Administração global básica entra no MVP, sem impersonation.
- Importação é transacional, idempotente e orientada por cabeçalhos.
- Contabilidade formal, emissão fiscal, OFX, convites e monetização estão fora do MVP.

## Hipóteses de importação que exigem confirmação

| Tema | Hipótese inicial | Tratamento |
|---|---|---|
| `Payment type` | Representa modalidade/cadência, não método real do recebimento | Prévia exige confirmação; método do pagamento é outro campo. |
| `Planning Value` | Taxa própria de planejamento/setup | Importar como receita própria somente após confirmação. |
| `Mens/ ADS` | Taxa própria recorrente de gestão | Não tratar como verba de mídia sem confirmação. |
| Sinal de `Expenses` | Despesa pode estar lançada com convenção negativa | Normalizar para valor positivo + natureza/direção explícita. |
| `Net Total` | Soma manual de total e despesa, não uma métrica canônica | Recalcular e mostrar divergência; não importar como verdade. |

## Ambiguidades não bloqueadoras da Fase 2

1. Prazo legal exato de retenção para documentos, auditoria, importações e exclusão de conta.
2. Necessidade de criptografia em nível de aplicação para CPF/CNPJ além dos controles de infraestrutura/RLS.
3. Provedor de SMTP transacional e regras finais de entrega de magic link.
4. Política de malware scanning de anexos além da validação de tipo/assinatura do MVP.
5. Se margem por serviço deve ratear overhead; o padrão aprovado é margem direta sem overhead.
6. Se o timezone pessoal pode divergir visualmente do workspace em páginas financeiras; a regra atual usa workspace para finanças e perfil para preferências não financeiras.
7. Quais aliases e valores legados serão aceitos no importador; será definido com fixture fictícia antes da Fase 10.

Esses pontos devem ser decididos antes da fase que os implementa, sem bloquear a fundação técnica.

## Decisões removidas do MVP

- Modelo de partidas dobradas.
- Plano de contas formal.
- Diário, razão, balancete, DRE contábil e balanço patrimonial.
- Períodos contábeis, postagem, estorno contábil e saldos de abertura.
- Papéis funcionais `admin` e `member` no workspace.
- Notificações por e-mail/push.
- Conciliação bancária e OFX.
- Exportações XLSX/PDF e relatórios contábeis.

## Processo para novas decisões

Uma decisão requer ADR quando:

- altera isolamento, autorização ou privacidade;
- muda uma invariante financeira;
- muda estratégia de data/timezone;
- introduz dependência de infraestrutura;
- torna dados públicos ou irreversíveis;
- cria incompatibilidade relevante.

O ADR deve registrar contexto, decisão, alternativas, consequências, plano de verificação e estado.
