# Gerenciamento de segredos e dados privados

## Escopo

Este documento define como tratar chaves, credenciais, configurações locais, documentos e dados reais. Ele não contém valores reais.

## Classificação

### Público por desenho

- Código e documentação revisados.
- `.env.example` vazio.
- Chave publicável do Supabase quando injetada no cliente em runtime.
- Site key de CAPTCHA.

“Publicável” não significa que o valor real precisa ser commitado. O repositório mantém placeholders e o deploy injeta configurações.

### Secreto

- Chave secreta do Supabase.
- Segredo do CAPTCHA.
- Senhas de banco/SMTP.
- Tokens de deploy, GitHub, observabilidade ou integrações.
- Cookies, JWTs, magic links e códigos de recuperação.
- Chaves privadas, certificados e credenciais de registradores.

### Privado/confidencial

- Planilha real.
- Dados de clientes, documentos e valores.
- Comprovantes e anexos.
- Identificadores administrativos reais.
- Endpoints/configurações locais específicas do projeto quando não forem necessários ao público.
- Dumps, importações, exportações e logs com contexto de usuário.

## Armazenamento permitido

| Ambiente | Local permitido |
|---|---|
| Desenvolvimento | `.env.local` ignorado, gerenciador de segredos do sistema ou Supabase CLI local |
| CI | GitHub Actions Secrets/Variables com ambiente e menor privilégio |
| Deploy | Environment Variables/Secrets da plataforma |
| Supabase Edge/infra | Supabase Secrets/Vault quando realmente necessário |
| Documentos do usuário | Buckets privados com RLS |
| Planilha legada | `private/` local ou armazenamento externo criptografado e controlado |

Segredos nunca ficam em:

- `NEXT_PUBLIC_*`;
- código, migration, seed, fixture, screenshot ou documentação;
- issue, commit, tag, changelog ou mensagem de erro;
- output de teste/CI;
- `user_metadata`;
- URL ou query string.

## Variáveis planejadas

| Variável | Exposição | Uso |
|---|---|---|
| `APP_URL` | Servidor/configuração | Origem e redirects permitidos |
| `NEXT_PUBLIC_SUPABASE_URL` | Navegador | Endpoint Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Navegador | Chave de baixo privilégio sujeita a RLS |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Navegador | Widget antiabuso |
| `SUPABASE_SECRET_KEY` | Somente servidor | Operações administrativas estritamente justificadas |
| `TURNSTILE_SECRET_KEY` | Somente servidor | Verificação antiabuso |

A chave secreta do Supabase não deve ser o caminho padrão de acesso do usuário. Fluxos normais usam sessão + RLS. Se uma operação administrativa precisar de bypass, ela é estreita, auditada e executada somente no servidor.

## Regras de código e log

- Validar ambiente no boot sem imprimir valores.
- Redigir headers `authorization`, `cookie`, `apikey` e campos de senha/token.
- Não registrar corpo de formulário financeiro ou upload.
- Mensagens de erro usam códigos e `correlation_id`, não payloads.
- E-mails podem ser mascarados; documentos e nomes reais não entram em logs.
- URLs assinadas são efêmeras e não entram em auditoria/log.
- Nunca ecoar secrets em shell com debug.

## Rotação e revogação

1. Identificar escopo e consumidores.
2. Criar nova credencial com menor privilégio.
3. Atualizar ambientes sem commit.
4. Validar serviço.
5. Revogar a antiga.
6. Registrar o incidente/mudança sem gravar o segredo.

Credenciais devem ser separadas por ambiente e finalidade. Uma credencial de desenvolvimento não acessa produção.

## Secret scanning

Antes de tornar o repositório público:

- habilitar GitHub Secret Scanning e Push Protection quando disponível;
- adicionar Gitleaks ou ferramenta equivalente ao CI com configuração versionada;
- revisar o histórico completo, não somente o working tree;
- analisar dependências e Actions por versões confiáveis;
- falhar CI em segredo de alta confiança;
- tratar falso positivo por regra documentada, nunca por exclusão ampla.

Nenhuma ferramenta foi instalada na Fase 1. A configuração entra na Fase 2.

Referência: [GitHub - About secret scanning](https://docs.github.com/code-security/secret-scanning/introduction/about-secret-scanning).

## Resposta a incidente

Se um segredo for exposto:

1. Revogar/rotacionar imediatamente; apagar o texto não torna a credencial segura.
2. Verificar logs de uso e ampliar contenção se necessário.
3. Remover da versão atual e, antes da publicação, limpar o histórico com procedimento revisado.
4. Invalidar deploys/artefatos que contenham o valor.
5. Registrar impacto e prevenção sem reproduzir o segredo.

## Planilha real e dados de demonstração

- A planilha permanece em `private/legacy/` e é ignorada também pela extensão.
- Não mover para `docs/`, fixtures, issues ou artefatos de CI.
- Não usar nomes/valores reais em seed, teste, screenshot ou README.
- Fixtures públicas usam dados inventados e reconhecivelmente fictícios.
- Importações de produção usam área temporária privada, checksum, retenção curta e remoção.
- Antes de excluir a cópia local, confirmar backup externo autorizado; a Fase 1 não exclui nada.

## Checklist de revisão

- [ ] `git status` não lista `.env`, planilha, dump ou exportação.
- [ ] Busca por formatos de chave não encontra valor real.
- [ ] Bundle do cliente não contém variável server-only.
- [ ] Logs de CI não imprimem endpoints privados, tokens ou respostas autenticadas.
- [ ] Histórico Git foi analisado.
- [ ] Dados fictícios foram revisados para não reproduzir clientes reais.
