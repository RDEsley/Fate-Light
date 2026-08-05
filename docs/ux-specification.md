# Especificação de UX

## 1. Princípios

- A primeira tela autenticada responde “o que precisa da minha atenção?”.
- Receita própria, mídia, repasse, caixa e competência nunca compartilham um rótulo ambíguo.
- A interface explica cálculos e permite chegar aos registros de origem.
- Formulários longos são divididos por contexto, sem esconder consequências financeiras.
- Mobile é um modo completo de uso, não uma versão reduzida.
- Movimento comunica estado e relação espacial; não decora.
- Feedback é imediato, reversível quando seguro e honesto quando a ação é assíncrona.

## 2. Arquitetura de informação

### Área pública

- Início
- Entrar
- Criar conta
- Confirmar acesso
- Termos de Uso
- Política de Privacidade
- Conta suspensa

### Workspace

- Visão geral
- Clientes
- Serviços
- Contratos
- Cobranças
- Pagamentos
- Despesas
- Domínios
- Alertas
- Relatórios
- Importar
- Perfil
- Configurações da empresa

### Plataforma

- Visão da plataforma
- Usuários
- Workspaces
- Auditoria administrativa

A navegação de plataforma usa shell, cores de contexto e autorização separados. Não existe atalho para conteúdo financeiro de um workspace.

## 3. Navegação

### Desktop

- Sidebar recolhível com rótulo e ícone.
- Cabeçalho com workspace atual, busca contextual, alertas e menu pessoal.
- Breadcrumb apenas em detalhes profundos.
- Ações primárias fixas e previsíveis por página.

### Mobile

- Barra inferior com Visão geral, Clientes, Cobranças, Despesas e Mais.
- “Mais” abre navegação completa, perfil e configurações.
- Ação principal pode usar botão flutuante apenas quando não cobrir conteúdo.
- Filtros aparecem em drawer; filtros ativos ficam visíveis como chips removíveis.
- Tabelas viram listas semânticas com os campos prioritários; comparação tabular mantém rolagem acessível quando indispensável.

## 4. Telas públicas e de conta

### `/`

- Proposta objetiva, público atendido e benefícios reais.
- Demonstração visual sem métricas inventadas.
- Destaque para separação de receita e verba administrada.
- Aviso de natureza gerencial, sem prometer substituição de contabilidade profissional.
- CTAs “Criar conta” e “Entrar”.

### `/login`

- Campo de e-mail.
- CAPTCHA conforme política antiabuso.
- Login padrão por e-mail e senha, com botão para escolher o magic link.
- Mensagem genérica de sucesso, independentemente de a conta existir.
- Estados: enviando, enviado, limite atingido, indisponível e link expirado.
- Link para cadastro e documentos legais.

### `/cadastro`

- E-mail.
- Checkbox obrigatório com links e versão atual de Termos/Privacidade.
- CAPTCHA.
- Botão “Criar conta”.
- Confirmação orienta a abrir o e-mail e mostra prazo/reenvio sem enumeração.
- Nome e empresa ficam para onboarding após confirmação; isso reduz abandono e evita dados órfãos.

### `/auth/confirm`

- Estado progressivo “Confirmando acesso”.
- Sucesso redireciona para onboarding ou dashboard.
- Erro explica expiração e oferece novo link.
- Parâmetro `next` aceita somente destino interno permitido.

### `/onboarding`

1. Perfil: nome e timezone sugerido, sempre confirmável.
2. Empresa: nome, moeda e timezone.
3. Preferências: formato de data e alertas iniciais.
4. Resumo antes de criar o workspace.

O timezone usa identificador IANA. Moeda padrão pode ser BRL, mas fica explícita e confirmável.

### `/perfil`

Seções:

- Dados pessoais: nome, foto, telefone opcional e e-mail somente leitura.
- Experiência e idioma: idioma, timezone pessoal e controles separados para animações do mouse e do sistema.
- Segurança e sessões: sessão atual e revogação disponível.
- Seus dados: exportar.
- Zona de risco: solicitar exclusão com confirmação reforçada e explicação de retenção.

Avatar mostra prévia, formatos aceitos, limite e progresso. URL privada nunca aparece como valor editável.

### `/configuracoes/empresa`

- Identidade, documento opcional e endereço.
- Logo.
- Moeda, timezone e formato de data.
- Alertas padrão.
- Preferências financeiras.

Mudança de timezone apresenta impacto sobre “hoje” e agendas futuras. Mudança de moeda fica bloqueada após movimentos.

## 5. Dashboard

### Ordem

1. Faixa “Precisa de atenção”: atrasos, vencimentos de hoje, domínios e registros incompletos.
2. Indicadores próprios: receita recebida, pendente, resultado e margem.
3. Valores sob administração: mídia e repasses em bloco visual separado.
4. Fluxo do período e comparação anterior.
5. Clientes/serviços com maior contribuição própria.
6. Atividade recente e ações rápidas.

### Regras de apresentação

- Cada indicador informa período, regime (caixa/competência), fórmula e última atualização.
- “Total bruto” nunca recebe o rótulo “receita”.
- Mídia usa “verba administrada” e mostra recebido, gasto e saldo.
- Resultado usa somente receita própria, despesas operacionais e custos diretos.
- Cards são reservados aos KPIs; listagens e detalhes usam estruturas mais densas.
- Clique em indicador abre drill-down com filtros equivalentes.

## 6. Clientes

### Lista

- Busca, status comercial e situação financeira em filtros separados.
- Colunas principais: cliente, status comercial, situação financeira, próximo marco e receita própria pendente.
- Atraso usa texto + cor + ícone, nunca apenas cor.
- Ações: criar, abrir, arquivar; duplicar somente quando fizer sentido e com revisão.

### Detalhe

Resumo do relacionamento e abas:

- Visão geral
- Contatos
- Contratos/serviços
- Cobranças/pagamentos
- Custos/despesas
- Domínios
- Anexos
- Histórico

“Ativo e atrasado” pode aparecer simultaneamente sem conflito.

## 7. Serviços e contratos

### Serviços

Lista simples de catálogo, natureza padrão e estado. Preço padrão é apenas sugestão; o contrato congela suas condições.

### Criar/editar contrato

Fluxo:

1. Cliente e dados gerais.
2. Itens.
3. Cobrança e vigência por item.
4. Custos estimados e responsáveis.
5. Revisão financeira separando própria/mídia/repasse.

Cada item mostra badge de natureza. Adicional é novo item com vigência; a UI nunca oferece “aplicar retroativamente” por padrão.

### Mudança de item

Modal/página de versão exige:

- condição atual;
- nova condição;
- início da vigência;
- motivo;
- impacto em agendas futuras;
- confirmação de que cobranças emitidas não serão alteradas.

## 8. Cobranças e pagamentos

### Cobrança

- Cabeçalho: cliente, competência, emissão e vencimento.
- Tabela de linhas agrupável por natureza.
- Resumo: própria, mídia, repasse e bruto.
- Status calculado com explicação.
- Histórico e anexos.
- Ação de cancelamento exige motivo.

### Registrar pagamento

1. Valor e instante de confirmação.
2. Método/referência.
3. Seleção das cobranças/linhas abertas.
4. Sugestão de rateio proporcional.
5. Ajuste manual com contador de saldo.
6. Confirmação e comprovante opcional.

O botão só habilita quando:

- toda a quantia está alocada;
- nenhuma linha excede saldo;
- moedas são compatíveis.

Centavos residuais são mostrados e destinados de forma determinística. Depois de confirmado, o rateio é somente leitura; correção usa cancelamento/reembolso.

## 9. Despesas

- Lista com natureza, categoria, fornecedor, competência, vencimento, pago e saldo.
- Formulário começa pela natureza, porque ela altera o impacto financeiro.
- Para `managed_media_spend`, solicitar cliente/contrato quando aplicável e mostrar que não reduz resultado.
- Para `direct_cost`, solicitar vínculo que permita margem por cliente/serviço.
- Pagamento parcial usa progresso e histórico.
- Despesa recorrente apresenta regra e próxima ocorrência separadas.

## 10. Domínios

- Lista priorizada por dias até expiração.
- Detalhe mostra registrador, proprietário, e-mail, renovação, custo, responsável e vínculo.
- Campo de senha não existe.
- Configuração de alertas oferece 30, 15, 7 e 1 dia e vencido como padrão editável.
- Estado vencido não é alterado manualmente; deriva de `expires_on`.

## 11. Alertas

- Central com abas Abertos, Adiados e Concluídos.
- Filtros por severidade e origem.
- Cada item informa por que existe, prazo, ação recomendada e destino.
- Ações: abrir origem, resolver, adiar, dispensar.
- Adiar exige nova data; resolver pode exigir confirmação da ação de origem.
- Itens duplicados são impedidos pela chave de deduplicação, não agrupados apenas visualmente.

## 12. Relatórios

- Alternância explícita entre caixa e competência.
- Filtros persistem na URL.
- Seções separadas: receita própria, mídia, repasses, despesas/custos e reconciliação.
- Tabela sempre acompanha gráfico.
- Exportação CSV usa os mesmos filtros e inclui definição das colunas.
- Não usar “lucro contábil”; preferir “resultado gerencial” ou “resultado de caixa/competência”.

## 13. Importação

Fluxo em etapas:

1. Enviar arquivo privado.
2. Reconhecer colunas.
3. Mapear campos e naturezas.
4. Revisar prévia e ambiguidades.
5. Validar e reconciliar totais.
6. Confirmar transação.
7. Ver relatório e vínculos criados.

Erros ficam associados à linha, com instrução de correção. Nenhum erro é “corrigido” silenciosamente.

## 14. Administrador global

- Dashboard com número de contas/workspaces e estado operacional, sem valores financeiros.
- Listas de usuários e workspaces com cadastro, último acesso, status e uso agregado.
- Suspender/reativar exige motivo e confirmação.
- Exportação/exclusão mostra apenas estado do processo.
- Toda página exibe aviso de escopo: “Metadados da plataforma; conteúdo financeiro indisponível”.

## 15. Estados de interface

Toda superfície precisa de:

- skeleton coerente com o conteúdo;
- vazio com causa e próxima ação;
- erro recuperável com tentativa;
- erro de permissão sem revelar existência de recurso;
- sucesso anunciado e persistente o suficiente;
- estado offline quando detectável;
- conflito de edição com recarga/revisão.

Destructive actions informam consequência. Ações financeiras confirmadas não usam “Excluir”.

## 16. Design system

- Tokens semânticos de cor, espaço, tipografia, borda, sombra e movimento.
- Tipografia legível e números tabulares em valores.
- Densidade confortável por padrão e compacta em desktop, se necessária.
- Cores para própria/mídia/repasse são consistentes, acompanhadas de rótulo.
- Gradientes limitados à marca, não aos dados.
- Ícones sempre têm rótulo/tooltip quando a ação não for óbvia.
- O produto usa somente um tema claro, suave e de baixo brilho, sem alternância de modo.
- A linguagem visual combina acabamento profissional com detalhes cartoon: contornos consistentes,
  sombras curtas, formas expressivas e movimento funcional, sem imitar interfaces genéricas.
- O cursor não produz rastro; o clique exibe uma pequena bolha elástica com um ponto saltando,
  minimalista e breve. O efeito do ponteiro é opcional e separado das demais animações.
- Formulários operacionais priorizam densidade compacta, progresso visível, microtextos diretos e
  agrupamento em painéis expansíveis com rótulos de abrir/fechar coerentes.
- Campos de data abrem o calendário em toda a área clicável. Seletores de cliente permitem busca por
  nome ou empresa e filtro entre ativos, inativos e todos, sem exigir rolagem por listas extensas.
- Exclusões usam linguagem explícita, confirmação contextual e bloqueio de históricos confirmados;
  a zona de risco do workspace exige uma expressão reforçada antes de qualquer limpeza.

## 17. Acessibilidade

- Meta WCAG 2.2 AA.
- Ordem de foco previsível, skip link e landmarks.
- Todo campo tem label, descrição e erro associado.
- Erros de formulário possuem resumo focável.
- Diálogos prendem e devolvem foco corretamente.
- Contraste mínimo e estados não dependem só de cor.
- Touch target mínimo de 44 x 44 CSS px quando aplicável.
- Gráficos têm resumo textual e tabela.
- Animações respeitam `prefers-reduced-motion`.
- Testes automatizados e navegação manual por teclado entram nos gates.

## 18. Conteúdo e terminologia

Usar:

- receita própria;
- verba administrada de mídia;
- repasse;
- total bruto;
- resultado gerencial;
- pago, parcial, aberto, atrasado;
- arquivar, cancelar, reembolsar.

Evitar:

- “faturamento” sem qualificar a natureza;
- “lucro” sem fórmula/regime;
- “apagar” em movimentos;
- jargão contábil para funções que não são contabilidade formal.
