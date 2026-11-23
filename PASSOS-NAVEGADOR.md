# Passos no navegador

Para um agente de navegador (Claude in Chrome) ou para o Richard fazer à mão.

> **Regra obrigatória:** o agente de navegador **nunca** digita, cola, copia, lê em voz alta ou
> registra uma chave de API ou segredo. Ele navega até a tela certa e para. Onde aparecer
> **"PARE: Richard cola a chave aqui"**, o agente aguarda o Richard concluir.

## Antes de começar (Richard, no terminal)

1. Revise e faça o merge do PR do assistente somente depois do passo 3, para o app novo não subir
   antes das variáveis e da migration.
2. Aplique as migrations em produção, na pasta do projeto:

   ```bash
   npx supabase db push
   ```

3. Gere dois segredos, um por vez, e guarde-os só até colar na Vercel:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```

## 1. Criar a chave da Gemini (plano gratuito)

1. Abra <https://aistudio.google.com/apikey> e confirme a conta Google do Richard.
2. Se aparecer oferta de faturamento ou upgrade, **não aceite**. Não cadastre cartão.
3. Clique em **Create API key** e escolha ou crie um projeto sem faturamento.
4. Confira que o projeto aparece como **Free** na coluna de plano.
5. **PARE: Richard cola a chave aqui.** O agente não copia a chave. Richard a copia e a usa no
   passo 3.

## 2. Opcional: criar a chave do Groq

1. Abra <https://console.groq.com/keys> e entre na conta.
2. Clique em **Create API Key** e use o nome `fate-light-assistente`.
3. **PARE: Richard cola a chave aqui.** O agente não copia a chave. Richard a copia e a usa no
   passo 3.

## 3. Cadastrar as variáveis na Vercel

1. Abra <https://vercel.com/dashboard> e entre no projeto do **Fate Light**.
2. Vá em **Settings > Environment Variables**.
3. Para cada linha abaixo, clique em **Add**, informe o nome exato e marque os ambientes indicados.

| Nome | Valor | Ambientes |
| --- | --- | --- |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Chave do passo 1 | Production, Preview |
| `AGENT_APPROVAL_SECRET` | Primeiro segredo gerado | Production, Preview |
| `AGENT_IP_HASH_SALT` | Segundo segredo gerado | Production, Preview |
| `GROQ_API_KEY` (opcional) | Chave do passo 2 | Production, Preview |
| `AGENT_GUEST_DAILY_CAP` (opcional) | `30` | Production, Preview |
| `AGENT_REAL_DATA_ENABLED` | `false` | Production, Preview |

4. Em `GOOGLE_GENERATIVE_AI_API_KEY`: **PARE: Richard cola a chave aqui.**
5. Em `AGENT_APPROVAL_SECRET`: **PARE: Richard cola a chave aqui.**
6. Em `AGENT_IP_HASH_SALT`: **PARE: Richard cola a chave aqui.**
7. Em `GROQ_API_KEY`, se for usar: **PARE: Richard cola a chave aqui.**
8. Marque as chaves e segredos como **Sensitive**, quando a opção existir.
9. Confirme que `SUPABASE_SECRET_KEY` já existe em Production. Não abra nem revele o valor. Se não
   existir, **PARE: Richard cola a chave aqui.** A demo em produção recusa mensagens sem ela.
10. Não crie `AGENT_SCRIPTED_MODEL` na Vercel.

## 4. Publicar e testar a demo

1. Richard faz o merge do PR em `main`, o que dispara o deploy.
2. Em **Deployments**, aguarde o deploy de produção ficar **Ready**. Se o merge veio antes das
   variáveis, abra o menu **...** do último deploy e clique em **Redeploy**.
3. Abra o link de produção em uma janela anônima.
4. Clique em **Entrar** e depois em **Explorar como visitante**.
5. Clique no ícone de brilho no topo (**Abrir assistente**).
6. Envie: `Quem está me devendo há mais de 30 dias? Cria um lembrete pra cada um`.
7. Confira os passos **Listar clientes em atraso** e **Criar lembretes de cobrança**.
8. Confira o cartão com **Studio Movimento** e **Auto Center Rota 10**.
9. Clique em **Aprovar** e confira o aviso de lembretes simulados.
10. Repita a pergunta e clique em **Cancelar**. O assistente deve dizer que nada foi criado.
11. Se aparecer aviso de cota, aguarde e tente mais tarde, ou configure o Groq.

## 5. Gravar o GIF para o README

1. Use uma janela anônima em cerca de 1280x720, com a demo aberta e o painel do assistente visível.
2. Inicie a gravação com ScreenToGif (Windows) ou outra ferramenta de sua preferência.
3. Grave de 10 a 20 segundos: a pergunta, os passos, o cartão, **Aprovar** e a resposta final.
4. Confira que nenhuma chave, aba da Vercel ou dado real aparece.
5. Exporte em até 5 MB como `docs/assets/assistente-demo.gif`.
6. No `README.md`, troque o comentário do GIF por:

   ```markdown
   ![Demonstração do assistente](docs/assets/assistente-demo.gif)
   ```

7. Diga **"Manda pro GitHub"** para publicar a alteração.
