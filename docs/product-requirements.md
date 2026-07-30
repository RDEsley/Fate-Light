# Requisitos do produto

## 1. Objetivo

Substituir a planilha atual por um produto público, seguro e mobile-first para controle financeiro e operacional gerencial de agências e pequenas prestadoras de serviços. O produto deve mostrar o que exige ação, explicar seus indicadores e preservar histórico sem assumir funções de contabilidade profissional.

## 2. Usuários

### Proprietário do workspace

Pessoa que se cadastra, cria um workspace e executa todas as funções do MVP. É o único papel funcional interno nesta versão.

### Administrador global

Operador da plataforma autorizado por mecanismo separado. Pode tratar usuários, workspaces, suspensão, uso e incidentes, mas não pode consultar dados financeiros, contratos ou anexos dos workspaces.

### Visitante

Pessoa não autenticada que pode conhecer o produto, consultar os documentos legais, iniciar cadastro e solicitar um magic link.

`admin` e `member` de workspace são conceitos futuros e não terão permissões, telas ou estados funcionais no MVP.

## 3. Regras canônicas de negócio

1. Um cliente pode estar comercialmente `ativo` e financeiramente `atrasado` ao mesmo tempo.
2. Status comercial é editável; situação financeira é calculada a partir de cobranças, vencimentos e pagamentos.
3. Verba de mídia nunca compõe receita, lucro ou margem da empresa.
4. Repasse nunca compõe receita, lucro ou margem da empresa.
5. Gasto de mídia reduz o saldo de mídia administrada; não é despesa operacional.
6. Pagamento parcial exige alocação por linha de cobrança.
7. Adicionais criam itens/versões com nova vigência e não alteram retroativamente contratos ou cobranças anteriores.
8. Toda cobrança gerada por recorrência tem chave idempotente por agenda e período.
9. Anexos são privados e não possuem URL pública permanente.
10. Alertas de domínio e demais alertas têm antecedência configurável e deduplicação.
11. Administrador global não recebe acesso financeiro por ser administrador.
12. Exclusão destrutiva de movimentos financeiros confirmados é proibida.
13. O workspace usa uma moeda única no MVP; não há conversão cambial.
14. O sistema é gerencial e não será divulgado como substituto de contabilidade profissional.

## 4. Requisitos funcionais

### RF-01 - Cadastro público

- Capturar e-mail, aceite versionado dos termos e prova antiabuso.
- Enviar link de confirmação sem revelar se o endereço já possui conta.
- Criar o workspace somente após identidade confirmada.
- Registrar aceite legal com versão e instante.

Critério de aceite: um novo usuário confirma o e-mail, conclui onboarding e entra em um workspace próprio sem enxergar dados de outro usuário.

### RF-02 - Login e sessão

- Login passwordless por magic link.
- Confirmação em rota server-side, sessão por cookies e redirecionamento seguro.
- Reenvio limitado, mensagens genéricas e tratamento de link expirado.
- Encerrar sessão atual; visualizar e revogar sessões quando a API permitir com segurança.
- Impedir acesso de conta suspensa.

Critério de aceite: rotas autenticadas rejeitam sessão ausente, inválida ou suspensa.

### RF-03 - Perfil pessoal

- Editar nome, foto, telefone opcional, idioma, tema e timezone.
- Mostrar e-mail confirmado como dado de identidade.
- Solicitar exportação dos próprios dados.
- Solicitar exclusão da conta com confirmação reforçada e acompanhamento.

Critério de aceite: alterações de perfil afetam somente o usuário autenticado e avatar continua privado.

### RF-04 - Workspace

- Criar um workspace inicial no onboarding.
- Editar nome, logo, documento opcional, endereço, moeda, timezone, formato de data e preferências.
- Impedir troca de moeda após movimentos financeiros sem um processo futuro de migração.
- Permitir apenas `owner` ativo no MVP.

Critério de aceite: toda consulta de negócio é limitada ao workspace pelo banco, não apenas pela interface.

### RF-05 - Clientes

- Criar, consultar, editar, duplicar quando pertinente e arquivar.
- Suportar pessoa ou empresa, nome, nome comercial, documento opcional, contatos, endereço, tags, responsável e observações.
- Exibir serviços, contratos, cobranças, pagamentos, custos, domínios, anexos e histórico relacionados.
- Editar status comercial: `lead`, `active`, `paused`, `inactive`, `archived`.
- Calcular situação financeira: em dia, vence em breve, vence hoje, parcialmente pago, atrasado ou sem cobrança aberta.

Critério de aceite: arquivar cliente não apaga histórico e não altera a situação de cobranças existentes.

### RF-06 - Serviços e contratos

- Manter catálogo de serviços sem combinações rígidas.
- Criar contrato com múltiplos itens independentes.
- Em cada item, definir descrição, natureza financeira, valor, cobrança única/recorrente, periodicidade, vigência, desconto, custo direto estimado, responsável, status e observações.
- Adicionar, pausar, cancelar, reativar ou substituir versões com motivo e autor.
- Preservar snapshots usados em cobranças emitidas.

Critério de aceite: alteração com nova vigência não modifica linhas de cobrança já emitidas.

### RF-07 - Agendas recorrentes

- Representar periodicidade, próxima execução, início, fim e timezone herdado do workspace.
- Gerar cobranças mesmo sem acesso de usuário.
- Garantir idempotência por agenda e início do período.
- Permitir reprocessamento seguro e registrar resultado técnico.

Critério de aceite: duas execuções para a mesma agenda/período produzem uma única cobrança.

### RF-08 - Cobranças

- Criar cobrança manual ou recorrente.
- Permitir linhas de receita própria, mídia administrada e repasse.
- Suportar desconto, multa, juros e acréscimo como linhas explícitas.
- Calcular aberto, vence em breve, vence hoje, parcial, pago, atrasado e cancelado.
- Registrar vencimento, competência, emissão, documento fiscal já emitido e anexos.

Critério de aceite: o total bruto reconcilia com as linhas, mas os indicadores de receita usam somente linhas próprias.

### RF-09 - Pagamentos e alocações

- Registrar pagamento com instante confirmado, método, referência e anexo.
- Alocar integralmente o pagamento entre linhas elegíveis.
- Sugerir rateio proporcional no parcial e permitir ajuste antes de confirmar.
- Impedir alocação acima do saldo da linha ou do valor do pagamento.
- Corrigir pagamento confirmado por cancelamento/reembolso auditado.

Critério de aceite: soma das alocações é igual ao pagamento e nenhum centavo fica sem natureza.

### RF-10 - Despesas, custos e pagamentos

- Cadastrar fornecedor, categoria, competência, vencimento, recorrência e valor.
- Classificar como `operating_expense`, `direct_cost`, `managed_media_spend` ou `pass_through_disbursement`.
- Vincular opcionalmente cliente, contrato, item/serviço e centro de custo.
- Registrar pagamentos totais/parciais e comprovantes.

Critério de aceite: somente despesa operacional e custo direto reduzem resultado; gasto de mídia e repasse afetam seus saldos próprios.

### RF-11 - Domínios

- Cadastrar domínio, registrador, cliente, contrato, proprietário legal, e-mail do registrador, datas, renovação automática, custo, responsável e URL administrativa opcional.
- Nunca armazenar senha do registrador.
- Configurar alertas por workspace ou domínio.
- Oferecer padrão inicial de 30, 15, 7 e 1 dia, além de vencido, permitindo edição.

Critério de aceite: mudar a antecedência não duplica alertas existentes para o mesmo marco.

### RF-12 - Anexos

- Anexar a cliente, contrato, cobrança, pagamento e despesa.
- Permitir upload, visualização/download autorizado e remoção auditada.
- Validar extensão, MIME real, tamanho e nome seguro.
- Usar URL assinada de curta duração.

Critério de aceite: usuário de outro workspace e administrador global não conseguem listar, assinar ou baixar o arquivo.

### RF-13 - Alertas

- Registrar tipo, origem, severidade, prazo, destinatário, estado e ação recomendada.
- Estados: `open`, `snoozed`, `resolved`, `dismissed`.
- Antecedências configuráveis para cobranças, despesas, contratos, domínios e renovações.
- Deduplicar por regra, origem e marco.
- Priorizar central interna e dashboard no MVP.

Critério de aceite: reexecutar o gerador não cria alerta duplicado.

### RF-14 - Dashboard e relatórios

- Mostrar receita própria recebida e pendente, mídia administrada, repasses, despesas, custos, resultado, bruto movimentado e líquido da empresa.
- Mostrar cobranças vencidas/próximas, domínios e contratos próximos, clientes ativos/atrasados, atividades e dados incompletos.
- Filtrar por período, cliente, serviço e status.
- Explicar fórmula, período e base de cada indicador.
- Permitir relatório por caixa e competência, sem misturá-los.

Critério de aceite: todo indicador permite chegar aos registros que o compõem e reconcilia com eles.

### RF-15 - Importação e exportação

- Importar a planilha com prévia, mapeamento semântico, validação, deduplicação e confirmação transacional.
- Marcar ambiguidades das colunas legadas para decisão.
- Exportar CSV filtrado, com moeda e datas sem perda de precisão.
- Não armazenar o arquivo original além do período necessário.

Critério de aceite: todas as 18 colunas são reconhecidas e um lote repetido não duplica dados.

### RF-16 - Auditoria

- Registrar alterações críticas de valor, natureza, vigência, status, vínculo, anexo, importação e administração.
- Exibir histórico relevante no contexto do registro.
- Manter eventos imutáveis e sem payloads excessivos ou segredos.

Critério de aceite: é possível identificar ator, instante, entidade, ação e motivo de uma alteração crítica.

### RF-17 - Administração global

- Listar usuários/workspaces e metadados de cadastro, último acesso, status e uso agregado.
- Suspender/reativar conta, apoiar exportação/exclusão e consultar logs administrativos.
- Não mostrar clientes, contratos, cobranças, pagamentos, despesas, anexos ou métricas financeiras.
- Auditar cada ação.

Critério de aceite: uma conta global sem vínculo de workspace recebe zero linhas ao consultar tabelas financeiras.

## 5. Requisitos não funcionais

- **Segurança:** OWASP ASVS como referência, menor privilégio, RLS, cookies seguros, CSP, rate limiting e secret scanning.
- **Privacidade:** minimização, exportação, exclusão, retenção definida e acesso auditado.
- **Acessibilidade:** objetivo WCAG 2.2 AA, navegação por teclado, foco visível e mensagens anunciadas.
- **Responsividade:** operação completa em 360 px sem tabelas inutilizáveis.
- **Desempenho:** paginação e filtros no servidor; índices aderentes às consultas e RLS.
- **Confiabilidade:** transações para pagamentos, alocações, importação e recorrência.
- **Observabilidade:** erros correlacionáveis sem valores, documentos, tokens ou PII em logs.
- **Testabilidade:** regras financeiras e de datas puras, fixtures fictícias e testes de isolamento.
- **Manutenibilidade:** módulos por funcionalidade, dependências justificadas e APIs internas tipadas.
- **Internacionalização:** MVP em pt-BR, moeda única por workspace e timezone IANA configurável.

## 6. Não escopo

- Contabilidade formal, livros contábeis, fechamento, balanços e escrituração.
- Emissão fiscal.
- Conciliação bancária ou OFX.
- Conversão de moedas.
- Convites e permissões de `admin`/`member` do workspace.
- E-mail/push de alertas.
- Acesso por impersonation para suporte.
- Exclusão física imediata de movimentos financeiros.
- Monetização.

## 7. Gate de produto do MVP

- Fluxos principais completos no celular e desktop.
- Isolamento entre workspaces provado por testes.
- Receita, mídia e repasse reconciliáveis do contrato ao relatório.
- Pagamentos parciais sempre alocados.
- Recorrência e alertas idempotentes.
- Anexos privados.
- Login, cadastro e perfil com estados seguros.
- Linguagem pública deixa explícito que o produto não substitui contabilidade profissional.
