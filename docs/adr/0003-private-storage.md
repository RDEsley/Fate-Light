# ADR-0003: Armazenar anexos somente em Storage privado

- Estado: aceita
- Data: 2026-07-30

## Contexto

Comprovantes, documentos de clientes, contratos e avatares podem conter dados pessoais e financeiros. Um bucket público ou URL permanente permitiria acesso fora do contexto autorizado.

## Decisão

Criar buckets privados:

- `workspace-documents`: PDF/JPEG/PNG/WebP, até 10 MB;
- `profile-avatars`: JPEG/PNG/WebP, até 2 MB.

Objetos usam caminho determinado pelo servidor:

```text
workspace-documents/{workspace_id}/{entity_type}/{entity_id}/{attachment_id}/{safe_filename}
profile-avatars/{user_id}/{attachment_id}/{safe_filename}
```

RLS em `storage.objects` e em `attachments` valida workspace/usuário. Download ocorre com sessão autorizada ou URL assinada por 5 minutos. URLs assinadas não são persistidas.

Antes do upload definitivo:

- validar tamanho;
- aplicar allowlist de extensão e MIME;
- verificar assinatura/magic bytes;
- gerar nome seguro;
- rejeitar SVG, HTML, executáveis, macros e compactados;
- calcular checksum.

Remoção é auditada e reconciliável entre metadata e objeto. O administrador global não recebe policy de leitura ou assinatura.

## Alternativas consideradas

### Bucket público com nomes imprevisíveis

Rejeitada: obscuridade não é autorização.

### Guardar binário no PostgreSQL

Rejeitada: aumenta banco/backups e reduz eficiência operacional.

### URLs assinadas longas ou permanentes

Rejeitada: ampliam a janela de vazamento.

### Permitir qualquer tipo e confiar no navegador

Rejeitada: extensão/MIME declarado podem ser falsificados.

## Consequências

- Visualização exige renovação de URL.
- Upload/remoção têm mais estados e reconciliação.
- Malware scanning completo permanece um risco a tratar; o MVP evita execução inline e restringe tipos.
- A planilha real nunca será enviada a bucket público.

## Verificação

- Testes de tipo, assinatura, tamanho e path traversal.
- Testes cross-workspace e global-admin.
- Teste de expiração da URL.
- Auditoria de upload e remoção.
