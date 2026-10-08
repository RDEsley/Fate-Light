"use client";

import Link from "next/link";
import { useActionState, useState, useSyncExternalStore } from "react";

import { SubmitButton } from "@/app/_components/submit-button";
import { CheckboxField, FormActions, TextField } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { FormMore } from "@/components/ui/form-panel";
import { Icon, type IconName } from "@/components/ui/icon";
import { SelectField } from "@/components/ui/select-field";
import { defaultTimezone, detectTimezone, timezoneOptions } from "@/features/account/timezones";
import { alertOffsetLabel, fallbackAlertOffsets } from "@/features/alerts/offsets";
import { initialActionState, submittedValues } from "@/lib/forms/action-state";

import { bootstrapAccount } from "./actions";

export type LegalDocumentSummary = {
  document_type: string;
  id: string;
  version: string;
};

const accountingBasisOptions = [
  { description: "Conta quando o dinheiro entra ou sai", label: "Caixa", value: "cash" },
  { description: "Conta na data de emissão ou vencimento", label: "Competência", value: "accrual" },
];

const noopSubscribe = () => () => {};

function SectionHeading({
  icon,
  text,
  title,
  tone,
}: {
  icon: IconName;
  text: string;
  title: string;
  tone: string;
}) {
  return (
    <div className="section-heading mb-4">
      <span className={`section-heading__icon ${tone}`}>
        <Icon name={icon} />
      </span>
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </div>
  );
}

/**
 * Primeiro contato com o sistema: pede só o que não dá para adivinhar (nome, empresa e os
 * aceites). O que tem padrão sensato fica recolhido e pode ser ajustado depois em Perfil
 * e em Configurações da empresa.
 */
export function OnboardingForm({
  initialDisplayName = "",
  legalDocuments,
}: {
  initialDisplayName?: string;
  legalDocuments: LegalDocumentSummary[];
}) {
  const [state, formAction] = useActionState(bootstrapAccount, initialActionState);
  const values = submittedValues(state);
  // O fuso do navegador só existe depois da hidratação; até lá vale o padrão do servidor.
  const detectedTimezone = useSyncExternalStore(noopSubscribe, detectTimezone, () => null);
  const [chosenTimezone, setChosenTimezone] = useState<string | null>(null);
  const timezone = chosenTimezone ?? values.list("timezone")?.[0] ?? detectedTimezone;
  const acceptedIds = values.list("legalDocumentIds") ?? [];
  const chosenOffsets = values.list("alertOffsets");

  return (
    <Form action={formAction} className="onboarding-form" state={state}>
      <section className="panel-card">
        <SectionHeading
          icon="user"
          text="Como você aparece no sistema."
          title="Sobre você"
          tone="bg-brand-soft text-brand-strong"
        />
        <div className="form-grid sm:grid-cols-2">
          <TextField
            autoComplete="name"
            defaultValue={values.text("fullName", initialDisplayName)}
            label="Nome completo"
            maxLength={120}
            minLength={2}
            name="fullName"
            required
          />
          <TextField
            autoComplete="tel"
            defaultValue={values.text("phone")}
            inputMode="tel"
            label="Telefone"
            maxLength={32}
            minLength={7}
            name="phone"
            optional
            placeholder="(11) 90000-0000"
            type="tel"
          />
        </div>
      </section>

      <section className="panel-card">
        <SectionHeading
          icon="building"
          text="O espaço onde ficam seus clientes, serviços e cobranças."
          title="Sua empresa"
          tone="bg-violet-soft text-violet"
        />
        <div className="grid gap-4">
          <TextField
            autoComplete="organization"
            defaultValue={values.text("workspaceName", initialDisplayName)}
            hint="Trabalha por conta própria? Use o seu nome."
            label="Nome da empresa"
            maxLength={120}
            minLength={2}
            name="workspaceName"
            required
          />
          <FormMore
            description="Razão social, nome fantasia e CPF ou CNPJ"
            icon="file"
            title="Dados fiscais"
          >
            <div className="form-grid sm:grid-cols-2">
              <TextField
                className="sm:col-span-2"
                defaultValue={values.text("legalName")}
                label="Razão social"
                maxLength={160}
                minLength={2}
                name="legalName"
                optional
              />
              <TextField
                defaultValue={values.text("tradeName")}
                label="Nome fantasia"
                maxLength={160}
                minLength={2}
                name="tradeName"
                optional
              />
              <TextField
                defaultValue={values.text("taxId")}
                inputMode="numeric"
                label="CPF ou CNPJ"
                maxLength={24}
                name="taxId"
                optional
              />
            </div>
          </FormMore>
          <FormMore
            description="Fuso horário, regime e antecedência dos alertas"
            title="Personalizar preferências"
          >
            <div className="form-grid sm:grid-cols-2">
              <SelectField
                label="Fuso horário"
                name="timezone"
                onValueChange={setChosenTimezone}
                options={timezoneOptions}
                value={timezone ?? defaultTimezone}
              />
              <SelectField
                defaultValue={values.text("accountingBasis", "cash")}
                hint="Define como o painel soma receitas e despesas."
                label="Regime gerencial"
                name="accountingBasis"
                options={accountingBasisOptions}
              />
            </div>
            <div className="grid gap-2">
              <p className="field__label" id="onboarding-alert-offsets">
                Avisar com antecedência de
              </p>
              <div aria-labelledby="onboarding-alert-offsets" className="chip-group" role="group">
                {fallbackAlertOffsets.map((days) => (
                  <label className="chip" key={days}>
                    <input
                      defaultChecked={chosenOffsets ? chosenOffsets.includes(String(days)) : true}
                      name="alertOffsets"
                      type="checkbox"
                      value={days}
                    />
                    <span>{alertOffsetLabel(days)}</span>
                  </label>
                ))}
              </div>
            </div>
          </FormMore>
        </div>
      </section>

      <section className="panel-card">
        <SectionHeading
          icon="check-circle"
          text="Leia e confirme cada documento na versão vigente."
          title="Termos e privacidade"
          tone="bg-positive-soft text-positive"
        />
        <div className="grid gap-2">
          {legalDocuments.map((document) => {
            const terms = document.document_type === "terms_of_use";
            const label = terms ? "os Termos de Uso" : "a Política de Privacidade";

            return (
              <div className="consent-row" key={document.id}>
                <CheckboxField
                  defaultChecked={acceptedIds.includes(document.id)}
                  fieldKey={`legalDocumentIds:${document.id}`}
                  name="legalDocumentIds"
                  required
                  value={document.id}
                >
                  Li e aceito {label} <small>versão {document.version}</small>
                </CheckboxField>
                <Link
                  aria-label={`Ler ${label} em nova aba`}
                  className="consent-row__link"
                  href={terms ? "/termos" : "/privacidade"}
                  target="_blank"
                >
                  Ler
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      <FormActions className="form-actions--page">
        <SubmitButton idleLabel="Concluir e entrar" pendingLabel="Preparando seu espaço…" />
      </FormActions>
    </Form>
  );
}
