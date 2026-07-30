# Registro de decisões

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
