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

## Identidade e isolamento da Fase 3A

Decisões consolidadas em 2026-07-31:

- `workspace_members` é a fonte de autorização do tenant e somente `owner` é funcional no MVP.
- Constraints únicas limitam cada usuário a um workspace e cada workspace a um owner ativo; a
  existência do owner é completada pela mesma transação que cria o workspace.
- O onboarding futuro chamará uma RPC transacional e idempotente. A função elevadora fica no schema
  `private`, deriva identidade apenas de `auth.uid()`, usa `search_path` vazio, grants mínimos e
  auditoria. O schema público expõe somente um wrapper `SECURITY INVOKER` sem parâmetro `user_id`.
- RLS e grants são defesas complementares. `anon` não recebe acesso às tabelas desta fase e o cliente
  não recebe escrita direta em membership, ownership, status administrativo ou histórico legal.
- Documentos legais de desenvolvimento são placeholders fictícios, versionados e verificados por
  hash. Aceites preservam a FK e a versão; IP e user-agent não são coletados nesta fase.
- Não existe trigger de domínio em `auth.users`; o bootstrap ocorre explicitamente após autenticação
  e aceite legal.
- Avatar permanece adiado por causa do advisory alto de `sharp < 0.35.0`. Não há bucket, upload,
  processamento ou imagem controlada pelo usuário; a interface futura deve usar iniciais ou
  placeholder até nova reavaliação.
- Os tipos TypeScript são gerados do Supabase local por `npm run db:types`; a CI usa
  `npm run db:types:check` para detectar divergência.
- Após reset limpo, o advisor de performance pode informar como ainda não usados o índice composto
  da FK em `legal_acceptances` e o lookup da auditoria privada por workspace. Eles permanecem porque
  evitam varredura/bloqueio na integridade referencial e suportam investigação por tenant; o índice
  isolado de `workspaces.status` foi removido por baixa seletividade e ausência de consulta atual.
- A estrutura de ciclo de conta acrescenta dois avisos equivalentes após reset: o índice parcial de
  `workspace_id` protege operações sobre a FK e o índice parcial de `scheduled_for` corresponde ao
  modelo aprovado para os jobs da Fase 11. Ambos permanecem pequenos e seletivos; serão medidos
  novamente quando o processamento administrativo for implementado.

## Limite de autenticação da Fase 3B

Decisões consolidadas em 2026-07-31:

- Magic link usa confirmação SSR por `token_hash`, sessão em cookies e claims verificadas no
  servidor. O proxy renova a sessão, mas não substitui autorização nas páginas, rotas ou ações.
- Login nunca cria usuário implicitamente; somente o cadastro explícito usa
  `shouldCreateUser: true`. As respostas não distinguem existência, suspensão, rate limit ou falha
  de entrega do e-mail.
- Redirecionamentos aceitam apenas caminhos internos validados. Após a confirmação, uma RPC mínima
  derivada de `auth.uid()` decide entre onboarding, conta ativa e conta/workspace suspenso sem abrir
  leitura das linhas bloqueadas por RLS.
- Turnstile é opcional no desenvolvimento e obrigatório como gate conjunto de implantação em
  produção. A aplicação expõe apenas a site key e envia o token ao Supabase Auth; o secret fica no
  provedor. Limites de envio e verificação permanecem centralizados no Supabase Auth.
- Templates locais de confirmação e magic link reproduzem o fluxo SSR. A configuração equivalente
  no projeto hospedado deve ser revisada e testada antes de publicação.
- O onboarding relê no servidor o conjunto legal vigente e chama o bootstrap já aprovado; perfil,
  workspace, membership, settings e aceites continuam em uma única transação idempotente.
- Perfil altera somente nome, telefone, idioma, timezone e tema pelas colunas concedidas ao próprio
  usuário. A interface usa iniciais e não cria avatar, bucket ou upload.
- Identidade, endereço e preferências do workspace são atualizados por uma RPC atômica derivada de
  `auth.uid()`. Moeda permanece somente leitura; timezone informa o impacto sobre “hoje” e agendas.
- Exportação e exclusão criam somente pedidos idempotentes no schema privado, derivados do usuário
  e workspace ativos. A leitura pública é sanitizada; exclusão exige frase explícita e autenticação
  recente. Nenhum job, artefato, URL, suspensão ou apagamento foi habilitado.
- Retenção, verificação administrativa, agendamento, geração de arquivo e exclusão efetiva continuam
  reservados à Fase 11 e dependem da política de retenção ainda não resolvida.
- Detalhes e alternativas estão no [ADR 0009](adr/0009-ssr-authentication-and-abuse-protection.md).

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
| ADR-0008 | Bootstrap explícito de identidade e isolamento RLS | Aceita | [ADR](adr/0008-identity-workspace-bootstrap-and-rls.md) |
| ADR-0009 | Autenticação SSR, gate de conta e proteção contra abuso | Aceita | [ADR](adr/0009-ssr-authentication-and-abuse-protection.md) |
| ADR-0010 | Cadastros operacionais arquiváveis e auditoria mínima | Aceita | [ADR](adr/0010-operational-records-and-audit.md) |

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
- Arquivos de documentos serão privados; avatar está temporariamente adiado pelo risco conhecido de `sharp`.
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
