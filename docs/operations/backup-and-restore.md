# Backup e restauração

## Objetivo

Este runbook descreve o procedimento técnico para proteger e recuperar o banco, o Storage e as
migrations do Fate Light. Ele não substitui a política de retenção, obrigações legais ou recursos do
plano contratado no Supabase.

## Estratégia

- **Banco:** confirmar no painel do Supabase a política de backup e retenção disponível no plano
  contratado antes de qualquer alteração destrutiva.
- **Storage:** documentos privados fazem parte da recuperação; inventariar buckets, objetos e regras
  de acesso separadamente do banco.
- **Código e migrations:** Git é a fonte das migrations. Registrar o commit/tag usado na restauração.
- **Ambiente local:** validar periodicamente que `supabase db reset --local`, seed e testes funcionam
  com dados exclusivamente fictícios.

## Antes de uma alteração destrutiva

1. Confirmar o ambiente e o projeto alvo no painel/CLI, sem imprimir credenciais.
2. Registrar a data, responsável, commit/tag, migrations pendentes e motivo da alteração.
3. Confirmar um backup recuperável do banco e a estratégia de cópia dos documentos do Storage.
4. Executar os gates de banco e aplicação no ambiente local/CI.
5. Definir janela, responsável técnico e critério de rollback.

## Restauração de teste

1. Criar um ambiente isolado; nunca testar uma restauração diretamente na produção.
2. Restaurar o banco pelo procedimento compatível com o plano do Supabase.
3. Restaurar os objetos do Storage e conferir que os paths pertencem ao workspace correto.
4. Aplicar somente migrations posteriores que façam parte do plano de recuperação, a partir do
   commit registrado.
5. Validar login, RLS cross-workspace, leitura de documentos privados, dashboard e totais com dados
   de teste autorizados.
6. Registrar resultado, duração, versão restaurada e qualquer diferença encontrada.

## Problema após migration

- Interromper novas mudanças e identificar a migration/commit envolvido.
- Preferir uma migration corretiva revisada; não apagar migrations já aplicadas.
- Se for necessário restaurar, usar o backup confirmado e repetir a validação de teste antes de
  qualquer ação em produção.
- Comunicar impacto operacional sem expor dados de clientes, URLs assinadas ou segredos.

## Limites conhecidos

Os detalhes de backup, point-in-time recovery e exportação de Storage dependem do plano e das
configurações do Supabase. Eles devem ser confirmados no painel antes do release 1.0.
