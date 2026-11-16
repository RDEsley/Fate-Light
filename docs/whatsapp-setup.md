# Lembretes de cobrança pelo WhatsApp: passo a passo

Guia para quem opera o Fate Light. A decisão técnica está no
[ADR-0024](adr/0024-whatsapp-charge-reminders.md).

## O que é cada coisa

| Termo | O que é |
| --- | --- |
| **API da Meta (WhatsApp Cloud API)** | Serviço oficial e gratuito de contratar; a Meta cobra por mensagem enviada. |
| **Modelo (template)** | Texto de mensagem que a Meta aprova antes. Mensagem automática só sai a partir de um modelo aprovado. |
| **Nome do modelo** | O identificador do modelo (`cobranca_vencimento`). É o único dado do texto que o Fate Light guarda. |
| **ID do número** | Número longo (Phone number ID) do telefone cadastrado na API. Não é o telefone. |
| **Token de acesso** | Senha que autoriza o Fate Light a enviar pelo seu número. |

## Custo

- Criar a conta, o app e os modelos não custa nada. Não há mensalidade da API.
- A Meta cobra **por mensagem de modelo entregue**, na categoria *Utilidade* (cobranças). No Brasil
  o valor é de centavos por mensagem; consulte a tabela atual em
  <https://developers.facebook.com/docs/whatsapp/pricing> e cadastre um cartão em
  *Meta Business → Cobrança*.
- Vários serviços do mesmo cliente no mesmo dia viram **uma** mensagem, o que reduz o custo.
- Para testar sem gastar, use o **número de teste** que a Meta oferece no painel (envia apenas para
  até cinco telefones que você verificar).

## 1. Criar o app na Meta

1. Entre em <https://business.facebook.com> e crie (ou use) um **Portfólio empresarial**.
2. Acesse <https://developers.facebook.com/apps> → **Criar app** → caso de uso **Outro** →
   tipo **Empresa**.
3. No app, adicione o produto **WhatsApp** e vincule o portfólio empresarial.

## 2. Número e ID do número

1. No app: **WhatsApp → Configuração da API**.
2. Em **Enviar mensagens**, a Meta já oferece um **número de teste**.
   Para número próprio, clique em **Adicionar número de telefone** e confirme o código recebido.
   O número não pode estar ativo no aplicativo WhatsApp comum.
3. Copie o **ID do número de telefone** (*Phone number ID*) e cole em **Configurações → WhatsApp →
   ID do número** no Fate Light.

## 3. Token permanente

O token temporário da tela expira em 24 horas. Para um permanente:

1. **Meta Business → Configurações → Usuários → Usuários do sistema → Adicionar**
   (função *Administrador*).
2. Atribua o app a esse usuário (*Adicionar ativos → Apps → controle total*).
3. **Gerar token**, escolha o app e marque `whatsapp_business_messaging` e
   `whatsapp_business_management`; expiração **Nunca**.
4. Cole em **Token de acesso** no Fate Light. Ele fica guardado fora do navegador e não volta para
   a tela. Nunca o envie por chat, e-mail ou commit.

## 4. Criar os modelos de mensagem

1. **Meta Business → Gerenciador do WhatsApp → Modelos de mensagem → Criar modelo**.
2. Categoria **Utilidade**, idioma **Português (Brasil)**, nome em minúsculas com `_`
   (ex.: `cobranca_vencimento`).
3. No Fate Light, abra **Configurações → WhatsApp** e, em cada mensagem, clique em **Ver o texto
   para cadastrar na Meta → Copiar texto**. Cole no corpo do modelo.
4. Exemplos de valores das variáveis `{{1}}` a `{{5}}`: Marina, Site e Gestão, R$ 1.800,00,
   10/12/2026, chave PIX.
5. Envie para aprovação (costuma levar de minutos a algumas horas).
6. Preencha o **nome do modelo** no Fate Light, exatamente igual ao criado.

O Fate Light preenche sozinho nome, serviços, valor total (com desconto e custos adicionais),
vencimento e chave PIX. Cobranças do mesmo cliente que vencem no mesmo dia saem em uma única
mensagem.

## 5. Ativar

1. Em **Configurações → WhatsApp**, ligue **Enviar lembretes automaticamente** e salve.
2. Na ficha de cada cliente, ative **Lembretes pelo WhatsApp** e confira o telefone.
3. Os avisos saem todo dia às 9h (Brasília). O histórico de envios aparece na mesma tela.

Os passos de infraestrutura (variáveis na Vercel e webhook) estão em
[deployment-vercel.md](deployment-vercel.md).
