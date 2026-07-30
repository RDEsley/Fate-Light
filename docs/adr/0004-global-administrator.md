# ADR-0004: Separar administrador global dos papéis de workspace

- Estado: aceita
- Data: 2026-07-30

## Contexto

A plataforma precisa suspender contas, apoiar exclusão e investigar falhas. Isso não justifica acesso livre a contratos, valores, clientes ou anexos privados.

## Decisão

- Autorização global fica em `private.platform_admins`.
- Não usar `user_metadata`, e-mail hardcoded ou role de workspace.
- Rotas `/platform` possuem guarda server-side própria.
- Consultas da plataforma usam somente metadados permitidos: IDs técnicos, estado, cadastro, último acesso e uso agregado não financeiro.
- Nenhuma policy financeira inclui a condição “é administrador global”.
- Nenhuma função de impersonation entra no MVP.
- Administrador global não assina URLs de documentos.
- Suspensão, reativação, exportação e exclusão exigem motivo e geram evento imutável em `private.platform_admin_audit_events`.

## Alternativas consideradas

### Tornar o administrador global owner de todos os workspaces

Rejeitada: viola isolamento e cria acesso financeiro implícito.

### Guardar flag em `user_metadata`

Rejeitada: metadata editável pelo usuário não é fonte segura de autorização.

### Usar uma lista de e-mails em código/ambiente

Rejeitada: difícil de auditar e revogar, além de expor identificadores.

### Impersonation de usuário para suporte

Rejeitada no MVP: risco e complexidade de consentimento/auditoria.

## Consequências

- Algumas métricas de plataforma precisam de read models sanitizados.
- Suporte não consegue “entrar e olhar” o problema; usuário fornece evidências ou correlação técnica.
- Investigações que exijam conteúdo privado precisarão de nova decisão e processo excepcional.

## Verificação

- Testes provam zero linhas financeiras e zero objetos de Storage para global admin sem membership.
- Toda ação de plataforma produz motivo, ator, alvo e instante.
- Revogação tem efeito imediato no servidor.
