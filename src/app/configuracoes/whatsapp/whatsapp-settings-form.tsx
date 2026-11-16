"use client";

import { useActionState, useState } from "react";

import { SubmitButton } from "@/app/_components/submit-button";
import { CheckboxField, FormActions, TextField, ToggleCard } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { IntegerField } from "@/components/ui/integer-field";
import { previewReminderText, templateVariables } from "@/features/whatsapp/template";
import { initialActionState, submittedValues } from "@/lib/forms/action-state";

import { updateWhatsAppSettings } from "./actions";

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
          description="Exige número, template do vencimento e token da Meta."
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
            <p>Dados da API oficial da Meta (WhatsApp Cloud API), em Configuração da API.</p>
          </div>
        </div>
        <div className="form-grid sm:grid-cols-2">
          <TextField
            defaultValue={sent.text("phoneNumberId", settings?.phone_number_id ?? "")}
            hint="Número longo que a Meta mostra como Phone number ID, não o telefone."
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
              Nomes dos templates aprovados na Meta. Variáveis do corpo, nesta ordem:{" "}
              {templateVariables.map((label, index) => `{{${index + 1}}} ${label}`).join(", ")}.
            </p>
          </div>
        </div>
        <div className="form-grid sm:grid-cols-2">
          <TextField
            className="sm:col-span-2"
            defaultValue={sent.text("templateDue", settings?.template_due ?? "")}
            hint="Enviado no dia do vencimento."
            label="Template do dia do vencimento"
            maxLength={512}
            name="templateDue"
            optional
            placeholder="cobranca_vencimento"
          />
          <TextField
            defaultValue={sent.text("templateBefore", settings?.template_before ?? "")}
            label="Template de lembrete antes"
            maxLength={512}
            name="templateBefore"
            optional
          />
          <IntegerField
            defaultValue={sent.text("daysBefore", String(settings?.days_before ?? 0))}
            hint="0 desliga o lembrete antes."
            label="Dias antes do vencimento"
            max={15}
            name="daysBefore"
          />
          <TextField
            defaultValue={sent.text("templateOverdue", settings?.template_overdue ?? "")}
            label="Template de cobrança em atraso"
            maxLength={512}
            name="templateOverdue"
            optional
          />
          <IntegerField
            defaultValue={sent.text("daysAfter", String(settings?.days_after ?? 0))}
            hint="0 desliga o aviso de atraso."
            label="Dias depois do vencimento"
            max={30}
            name="daysAfter"
          />
          <TextField
            defaultValue={pixKey}
            label="Chave PIX"
            maxLength={140}
            name="pixKey"
            onValueChange={setPixKey}
            optional
          />
          <TextField
            defaultValue={sent.text("headerImageUrl", settings?.header_image_url ?? "")}
            hint="Imagem do cabeçalho, se o template tiver uma. Endereço público https://."
            label="Imagem do cabeçalho"
            maxLength={1000}
            name="headerImageUrl"
            optional
          />
        </div>

        <div className="whatsapp-preview mt-5">
          <p className="whatsapp-preview__label">Exemplo com o template sugerido</p>
          <p className="whatsapp-preview__bubble">
            {previewReminderText({
              amount: 1500,
              contactName: "Marina Souza",
              description: "Gestão de tráfego",
              dueDate: "2026-12-10",
              headerImageUrl: null,
              pixKey: pixKey || null,
            })}
          </p>
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
