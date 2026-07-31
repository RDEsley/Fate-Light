# ADR-0010: Cadastros operacionais arquiváveis e auditoria mínima

- Estado: aceita
- Data: 2026-07-31

## Contexto

A Fase 4 introduz clientes, contatos, serviços, fornecedores e categorias. Esses registros serão
referenciados por contratos e movimentos futuros, portanto não podem desaparecer nem aceitar
relações entre workspaces. Dados pessoais e documentos também não devem ser copiados integralmente
para uma trilha de auditoria.

## Decisão

- Toda entidade operacional contém `workspace_id`, autoria e timestamps. O servidor resolve o
  workspace da sessão e o banco repete a autorização por RLS.
- Relações entre entidades usam FKs compostas com `workspace_id`, impedindo referências entre
  tenants mesmo fora da aplicação.
- A aplicação não recebe `DELETE`. Cadastros saem das listas normais por `archived_at`; referências
  históricas permanecem válidas.
- `created_by`, `updated_by`, timestamps, IDs e `workspace_id` não são colunas editáveis pelo
  cliente. Triggers limitados preenchem a autoria verificada de updates.
- Endereço de cliente e contato de fornecedor usam objetos JSON pequenos, com chaves permitidas e
  valores textuais limitados. Campos usados em busca e filtro permanecem estruturados.
- Mudanças são registradas em `audit_events` por trigger controlado e transacional. A linha guarda
  ação, entidade e nomes dos campos alterados, sem copiar CPF/CNPJ, endereço, contato, observações
  ou payload completo.
- A trilha é insert-only para a aplicação. Owner ativo lê somente eventos do próprio workspace;
  não há grant de escrita direta.
- Enquanto cobranças não existem, a situação financeira do cliente é apresentada como derivada e
  indisponível para cálculo, com o estado seguro “sem cobrança aberta”. Nenhuma coluna financeira é
  adicionada a `clients`.

## Alternativas consideradas

### Exclusão física para cadastros ainda não utilizados

Rejeitada: cria caminhos diferentes de retenção, facilita perda acidental e complica referências
que serão adicionadas nas fases seguintes.

### Auditoria com snapshots JSON completos

Rejeitada: duplica dados pessoais e observações, amplia retenção e aumenta o impacto de acesso
indevido. Snapshots específicos poderão ser adicionados somente a eventos que realmente os exijam.

### Confiar apenas nos filtros das Server Actions

Rejeitada: não protege contra consulta incorreta, cliente modificado ou acesso direto à Data API.

## Consequências

- Arquivar e restaurar são updates explícitos e auditáveis.
- Duplicar um cadastro é uma nova criação revisável, nunca cópia automática de relações futuras.
- Busca textual inicial usa campos normalizados e índices por workspace; full-text search só entra
  se medições justificarem a complexidade.
- Novas entidades relacionadas devem repetir a FK composta e a matriz de isolamento A/B.
- Em reset vazio, o advisor pode marcar como não usados os índices de listagem, filtros, FKs e
  histórico desta fase. Eles correspondem às consultas aprovadas e permanecem até existirem dados
  representativos; a medição será repetida após as telas e novamente antes da publicação.

## Verificação

- Testes pgTAP cobrem CRUD permitido, negação de DELETE, adulteração de workspace, FKs compostas,
  suspensão e auditoria redigida.
- Advisors de segurança e performance são executados após reset local.
- Testes de aplicação confirmam que formulários não aceitam autoria ou workspace arbitrários.
