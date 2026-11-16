"use client";

import { useActionState, useState } from "react";

import { SubmitButton } from "@/app/_components/submit-button";
import { CheckboxField, FormActions, TextField, ToggleCard } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { IntegerField } from "@/components/ui/integer-field";
import { previewReminderText, suggestedTemplateBodies } from "@/features/whatsapp/template";
import { initialActionState, submittedValues } from "@/lib/forms/action-state";

import { updateWhatsAppSettings } from "./actions";
import { TemplateGuideCard } from "./template-guide-card";

function sample(pixKey: string) {
  return {
    amount: 1800,
    contactName: "Marina Souza",
    description: "Site, Gestão e Criativo",
    dueDate: "2026-12-10",
    headerImageUrl: null,
    pixKey: pixKey || null,
  };
}

export type WhatsAppSettings = {
  days_after: number;
  days_before: number;
  enabled: boolean;
  header_image_url: string | null;
  phone_number_id: string | null;
  pix_key: string | null;
  template_before: string | null;
  template_due: string | null;
  template_language: string;
  template_overdue: string | null;
};

export function WhatsAppSettingsForm({
  hasToken,
  readOnly,
  settings,
}: {
  hasToken: boolean;
  readOnly: boolean;
  settings: WhatsAppSettings | null;
}) {
  const [state, formAction] = useActionState(updateWhatsAppSettings, initialActionState);
  const sent = submittedValues(state);
  const [pixKey, setPixKey] = useState(sent.text("pixKey", settings?.pix_key ?? ""));

  return (
    <Form action={formAction} className="grid gap-4" state={state}>
      <section className="panel-card">
        <div className="section-heading mb-5">
          <span className="section-heading__icon bg-positive-soft text-positive">
            <Icon name="phone" />
          </span>
          <div>
            <h2>Automação</h2>
            <p>
              Todo dia às 9h (Brasília) o sistema avisa as cobranças pendentes dos clientes que você
              ativou na ficha de cada um. Cobrança paga ou cancelada não recebe lembrete.
            </p>
          </div>
        </div>
        <ToggleCard
          defaultChecked={sent.checkbox("enabled", settings?.enabled ?? false)}
          description="Exige o ID do número, o token e o nome do modelo do dia do vencimento."
          name="enabled"
          title="Enviar lembretes automaticamente"
        />
      </section>

      <section className="panel-card">
        <div className="section-heading mb-5">
          <span className="section-heading__icon bg-brand-soft text-brand-strong">
            <Icon name="link" />
          </span>
          <div>
            <h2>Conta do WhatsApp Business</h2>
            <p>
              Dados da API oficial da Meta (WhatsApp Cloud API). Sem eles nada é enviado; o passo a
              passo para obtê-los está em <strong>docs/whatsapp-setup.md</strong>.
            </p>
          </div>
        </div>
        <div className="form-grid sm:grid-cols-2">
          <TextField
            defaultValue={sent.text("phoneNumberId", settings?.phone_number_id ?? "")}
            hint="Número longo mostrado como “Phone number ID” em WhatsApp → Configuração da API. Não é o telefone."
            inputMode="numeric"
            label="ID do número"
            maxLength={32}
            name="phoneNumberId"
            optional
          />
          <TextField
            defaultValue={sent.text("templateLanguage", settings?.template_language ?? "pt_BR")}
            hint="Idioma em que os templates foram aprovados."
            label="Idioma dos templates"
            maxLength={5}
            name="templateLanguage"
            required
          />
          <TextField
            className="sm:col-span-2"
            hint="Use um token permanente de usuário do sistema. Ele é guardado à parte e nunca volta para a tela."
            label={
              hasToken ? "Token de acesso (já salvo; preencha só para trocar)" : "Token de acesso"
            }
            maxLength={1024}
            name="accessToken"
            optional
            placeholder={hasToken ? "••••••••••••" : undefined}
          />
          {hasToken ? (
            <CheckboxField className="sm:col-span-2" name="removeToken">
              Remover o token salvo (os lembretes param até salvar outro)
            </CheckboxField>
          ) : null}
        </div>
      </section>

      <section className="panel-card">
        <div className="section-heading mb-5">
          <span className="section-heading__icon bg-violet-soft text-violet">
            <Icon name="mail" />
          </span>
          <div>
            <h2>Mensagens</h2>
            <p>
              A Meta só deixa o sistema enviar mensagens automáticas a partir de modelos que ela
              aprova antes. O campo de cada mensagem pede apenas o <strong>nome</strong> do modelo
              que você criou lá, nunca o texto. O texto fica no botão “Ver o texto para cadastrar na
              Meta”.
            </p>
          </div>
        </div>

        <div className="whatsapp-note mb-5">
          <strong>Várias cobranças do mesmo cliente</strong>
          <p>
            O valor vem sozinho da cobrança, já com desconto e custos adicionais (o total a pagar).
            Se o cliente tem vários serviços vencendo no <em>mesmo dia</em>, ele recebe{" "}
            <strong>uma só mensagem</strong>, com os serviços listados e o valor somado. Se vencem
            em dias diferentes, cada dia gera sua própria mensagem.
          </p>
        </div>

        <div className="form-grid sm:grid-cols-2">
          <TextField
            className="sm:col-span-2"
            defaultValue={sent.text("templateDue", settings?.template_due ?? "")}
            hint="Obrigatório. Aviso enviado às 9h do dia do vencimento."
            label="Nome do modelo — dia do vencimento"
            maxLength={512}
            name="templateDue"
            optional
            placeholder="ex.: cobranca_vencimento"
          />
          <TemplateGuideCard
            body={suggestedTemplateBodies.due}
            preview={previewReminderText("due", sample(pixKey))}
          />

          <TextField
            defaultValue={sent.text("templateBefore", settings?.template_before ?? "")}
            hint="Opcional. Deixe vazio para não avisar antes."
            label="Nome do modelo — antes do vencimento"
            maxLength={512}
            name="templateBefore"
            optional
            placeholder="ex.: cobranca_lembrete"
          />
          <IntegerField
            defaultValue={sent.text("daysBefore", String(settings?.days_before ?? 0))}
            hint="Quantos dias antes. 0 desliga este aviso."
            label="Dias antes do vencimento"
            max={15}
            name="daysBefore"
          />
          <TemplateGuideCard
            body={suggestedTemplateBodies.before}
            preview={previewReminderText("before", sample(pixKey))}
          />

          <TextField
            defaultValue={sent.text("templateOverdue", settings?.template_overdue ?? "")}
            hint="Opcional. Deixe vazio para não cobrar atraso."
            label="Nome do modelo — cobrança em atraso"
            maxLength={512}
            name="templateOverdue"
            optional
            placeholder="ex.: cobranca_atraso"
          />
          <IntegerField
            defaultValue={sent.text("daysAfter", String(settings?.days_after ?? 0))}
            hint="Quantos dias depois. 0 desliga este aviso."
            label="Dias depois do vencimento"
            max={30}
            name="daysAfter"
          />
          <TemplateGuideCard
            body={suggestedTemplateBodies.overdue}
            preview={previewReminderText("overdue", sample(pixKey))}
          />
        </div>
      </section>

      <section className="panel-card">
        <div className="section-heading mb-5">
          <span className="section-heading__icon bg-positive-soft text-positive">
            <Icon name="wallet" />
          </span>
          <div>
            <h2>Dados que entram na mensagem</h2>
            <p>Além do nome, serviço, valor e vencimento, que o sistema preenche sozinho.</p>
          </div>
        </div>
        <div className="form-grid sm:grid-cols-2">
          <TextField
            defaultValue={pixKey}
            hint="Aparece na mensagem para o cliente pagar. Pode ser CPF/CNPJ, e-mail, telefone ou chave aleatória."
            label="Chave PIX"
            maxLength={140}
            name="pixKey"
            onValueChange={setPixKey}
            optional
          />
          <TextField
            defaultValue={sent.text("headerImageUrl", settings?.header_image_url ?? "")}
            hint="Só se o modelo na Meta tiver imagem no cabeçalho. Endereço público https://."
            label="Imagem do cabeçalho"
            maxLength={1000}
            name="headerImageUrl"
            optional
          />
        </div>
      </section>

      {readOnly ? null : (
        <FormActions className="form-actions--page">
          <SubmitButton idleLabel="Salvar configuração" />
        </FormActions>
      )}
    </Form>
  );
}
