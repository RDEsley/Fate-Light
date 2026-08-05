# ADR-0011: Importação de planilha em memória e transação única

- Estado: aceita
- Data: 2026-08-03

## Contexto

O produto precisa migrar dados de planilhas para o recorte operacional já implementado sem expor
arquivos, misturar workspaces ou deixar um lote parcialmente gravado. A planilha legada também
contém totais derivados e colunas ambíguas que não podem ser tratadas como fonte de verdade.

## Decisão

- O servidor aceita somente `.xlsx` e `.csv`, com limite de 5 MiB e mil linhas úteis por lote.
- O arquivo é lido em memória para a prévia e novamente na confirmação. Nenhum binário é enviado ao
  Storage ou persistido no banco.
- Cabeçalhos são reconhecidos por nome e aliases normalizados. Datas, valores, estados e vínculos são
  validados antes da confirmação; problemas permanecem associados à linha de origem.
- A confirmação envia ao PostgreSQL apenas o payload normalizado e o SHA-256 do arquivo. Uma função
  `SECURITY INVOKER`, sujeita aos grants e à RLS do owner ativo, grava todo o lote em uma transação.
- `import_jobs` guarda apenas checksum, versão do mapeamento, contagens e instante de confirmação. A
  unicidade por workspace/checksum/versão torna a repetição do mesmo lote idempotente.
- Registros são resolvidos dentro do workspace. Clientes existentes podem ser reutilizados; relações
  não resolvidas ou ambíguas bloqueiam o lote.
- A planilha canônica usa uma linha por entidade. O formato legado de 18 colunas é reconhecido e
  expandido somente nas relações que possuem semântica suficiente. Totais calculados são ignorados e
  ambiguidades exigem confirmação visível.

## Alternativas consideradas

### Inserções sequenciais por Server Action

Rejeitada: uma falha intermediária deixaria clientes, cobranças ou despesas parcialmente importados.

### Armazenar a planilha no Storage antes da prévia

Rejeitada para o MVP: amplia retenção de dados privados sem necessidade operacional. Um job assíncrono
com Storage poderá ser adotado apenas quando arquivos maiores ou retomada de processamento justificarem.

### Deduplicar somente por nome de cliente

Rejeitada: nomes não são identificadores estáveis. O checksum protege o lote e as relações permanecem
limitadas ao workspace; conflitos de nomes são apresentados ao usuário.

## Consequências

- A importação cabe no limite serverless da Vercel e não depende de disco persistente.
- Arquivos acima do limite precisam ser divididos antes do envio.
- Alterar regras de mapeamento exige uma nova `mapping_version`, preservando a idempotência histórica.
- A prévia não é um snapshot persistido; a confirmação recalcula o arquivo e verifica o checksum.

## Verificação

- Testes unitários cobrem cabeçalhos, datas, dinheiro, formato legado e erros por linha.
- Testes pgTAP cobrem owner, RLS, lote repetido, isolamento entre workspaces e rollback integral.
- E2E cobre upload, prévia e confirmação no Supabase local.
