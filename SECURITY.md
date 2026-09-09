# Política de segurança

## Versões suportadas

Enquanto o Fate Light estiver na linha `0.x`, a manutenção de segurança se concentra na versão
atual publicada. O suporte a uma versão 1.0 será definido no respectivo release.

| Versão     | Suporte                  |
| ---------- | ------------------------ |
| `0.8.0`    | Atual em hardening       |
| Anteriores | Sem manutenção planejada |

## Relatar uma vulnerabilidade

Não abra issue pública, pull request ou discussão com detalhes que possam permitir exploração.
Utilize um canal privado já acordado com o responsável pelo projeto e informe, de forma objetiva:

- descrição e impacto potencial;
- passos mínimos de reprodução, sem dados reais;
- versão, ambiente e evidências seguras;
- possíveis medidas de contenção, se conhecidas.

Se não houver um canal privado previamente definido, solicite um ao responsável sem publicar os
detalhes técnicos da vulnerabilidade.

## Tratamento

O recebimento não implica prazo ou recompensa. O responsável avaliará impacto, reprodução e
correção; atualizações de segurança serão publicadas quando isso for seguro. Evite divulgar a
vulnerabilidade antes de uma correção ou orientação de mitigação.

## Práticas do projeto

- dependências, segredo e configuração passam por gates de CI;
- dados financeiros são isolados por workspace com RLS;
- documentos fiscais usam armazenamento privado e URLs temporárias;
- segredos e dados reais não devem entrar no repositório, testes ou logs;
- empresas/marcas (`client_entities`) usam FK composta com o cliente e policies de workspace;
  consolidação exige frase `CONSOLIDAR` e recusa quando os totais financeiros não batem.

## Riscos residuais conhecidos (linha `0.8.0`)

- Confirmação de e-mail, SMTP e Turnstile de produção ainda dependem de configuração manual antes
  do release 1.0 (ver [release-v1.md](docs/release-v1.md)).
- A RPC de despesa recorrente ainda não recebe `client_entity_id`; a aplicação marca o grupo após
  criar a série. Uma migration futura pode fechar o parâmetro nativo.
