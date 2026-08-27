# Ciclo de conta e dados

## Escopo

Este documento descreve o comportamento técnico e operacional esperado para pedidos de exportação,
exclusão, suspensão e reativação. Não define prazos legais de retenção; tais decisões exigem
validação jurídica e operacional externa.

## Solicitação de exportação

1. Confirmar a identidade e o workspace do solicitante pelo fluxo autenticado existente.
2. Registrar o pedido sem expor dados sensíveis em logs públicos.
3. Avaliar quais dados podem ser entregues: perfil, workspace, clientes, serviços, cobranças,
   despesas, domínios, alertas, histórico e metadados de documentos.
4. Documentos privados exigem autorização específica e canal de entrega seguro; URLs assinadas não
   devem ser reutilizadas como arquivo de exportação.

O produto atual registra pedidos, mas não executa automaticamente jobs de exportação. Qualquer
processamento manual deve ser rastreável e limitado ao workspace autorizado.

## Solicitação de exclusão

1. Exigir a confirmação reforçada prevista pela interface e confirmar a identidade do solicitante.
2. Registrar o pedido e impedir que uma ação irreversível ocorra silenciosamente.
3. Antes de remover dados, decidir e registrar a retenção aplicável a workspace, clientes,
   cobranças, despesas, documentos, auditoria e usuário do Auth.
4. Planejar a remoção coordenada de registros e objetos privados do Storage para evitar referências
   órfãs ou arquivos acessíveis indevidamente.
5. Validar o resultado em ambiente isolado quando o procedimento automatizado existir.

O sistema atual não executa exclusão efetiva automaticamente. Não apagar dados para atender um
pedido sem uma política de retenção aprovada e procedimento revisado.

## Suspensão e reativação

- Suspensão deve bloquear o acesso autenticado conforme as regras do workspace/conta, sem conceder
  acesso financeiro adicional a operadores.
- Reativação deve ocorrer somente após autorização operacional, preservando histórico e auditoria.
- Motivo, responsável e instante devem ser registrados pelo mecanismo administrativo aplicável.

## Limites e decisões pendentes

Ainda é necessário definir, fora deste documento: prazos de retenção, base jurídica, responsável
operacional, canal seguro de entrega de exportações e procedimento de remoção do usuário no
Supabase Auth.
