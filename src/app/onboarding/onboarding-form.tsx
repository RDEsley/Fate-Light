"use client";

import Link from "next/link";
import { useActionState } from "react";

import { SubmitButton } from "@/app/_components/submit-button";
import { CheckboxField, Field, FormActions, TextField } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { SelectField } from "@/components/ui/select-field";
import { initialActionState } from "@/lib/forms/action-state";

import { bootstrapAccount } from "./actions";

export type LegalDocumentSummary = {
  content_markdown: string;
  document_type: string;
  id: string;
  version: string;
};

const timezoneOptions = [
  { label: "São Paulo", value: "America/Sao_Paulo" },
  { label: "Recife", value: "America/Recife" },
  { label: "Manaus", value: "America/Manaus" },
  { label: "Rio Branco", value: "America/Rio_Branco" },
  { label: "UTC", value: "UTC" },
];

const dateFormatOptions = [
  { label: "DD/MM/AAAA", value: "DD/MM/YYYY" },
  { label: "AAAA-MM-DD", value: "YYYY-MM-DD" },
];

const accountingBasisOptions = [
  { description: "Registra ao pagar ou receber", label: "Caixa", value: "cash" },
  { description: "Registra ao emitir ou vencer", label: "Competência", value: "accrual" },
];

export function OnboardingForm({
  initialDisplayName,
  legalDocuments,
}: {
  initialDisplayName?: string;
  legalDocuments: LegalDocumentSummary[];
}) {
  const [state, formAction] = useActionState(bootstrapAccount, initialActionState);

  return (
    <Form action={formAction} className="grid gap-5" state={state}>
      <fieldset className="cartoon-card p-5 sm:p-6">
        <legend className="px-2 font-semibold">1. Seu perfil</legend>
        <div className="form-grid sm:grid-cols-2">
          <TextField
            autoComplete="name"
            className="sm:col-span-2"
            defaultValue={initialDisplayName}
            label="Nome completo"
            maxLength={120}
            minLength={2}
            name="fullName"
            required
          />
          <TextField
            autoComplete="tel"
            inputMode="tel"
            label="Telefone"
            maxLength={32}
            name="phone"
            optional
            type="tel"
          />
          <SelectField
            defaultValue="America/Sao_Paulo"
            label="Timezone pessoal"
            name="timezone"
            options={timezoneOptions}
          />
          <input name="theme" type="hidden" value="light" />
        </div>
      </fieldset>

      <fieldset className="cartoon-card p-5 sm:p-6">
        <legend className="px-2 font-semibold">2. Sua empresa</legend>
        <div className="form-grid sm:grid-cols-2">
          <TextField
            className="sm:col-span-2"
            defaultValue={initialDisplayName}
            label="Nome do workspace"
            maxLength={120}
            minLength={2}
            name="workspaceName"
            required
          />
          <TextField
            className="sm:col-span-2"
            label="Razão social"
            maxLength={160}
            name="legalName"
          />
          <TextField label="Nome fantasia" maxLength={160} name="tradeName" />
          <TextField inputMode="numeric" label="CPF ou CNPJ" maxLength={24} name="taxId" optional />
          <Field className="sm:col-span-2" htmlFor="onboarding-currency" label="Moeda do workspace">
            <input disabled id="onboarding-currency" readOnly value="BRL — Real brasileiro" />
            <input name="currency" type="hidden" value="BRL" />
          </Field>
        </div>
      </fieldset>

      <fieldset className="cartoon-card p-5 sm:p-6">
        <legend className="px-2 font-semibold">3. Preferências iniciais</legend>
        <div className="form-grid sm:grid-cols-2">
          <SelectField
            defaultValue="DD/MM/YYYY"
            label="Formato de data"
            name="dateFormat"
            options={dateFormatOptions}
          />
          <SelectField
            defaultValue="cash"
            label="Regime gerencial padrão"
            name="accountingBasis"
            options={accountingBasisOptions}
          />
        </div>
        <div className="mt-5">
          <p className="field__label">Antecedência padrão dos alertas</p>
          <div className="mt-3 flex flex-wrap gap-4">
            {[1, 7, 15, 30].map((days) => (
              <label className="inline-flex items-center gap-2 text-sm" key={days}>
                <input defaultChecked name="alertOffsets" type="checkbox" value={days} />
                {days} {days === 1 ? "dia" : "dias"}
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      <fieldset className="border-brand/25 bg-brand-soft rounded-2xl border p-5 sm:p-6">
        <legend className="px-2 font-semibold">4. Revisão e aceite</legend>
        <p className="text-muted mb-5 text-sm leading-6">
          O workspace, perfil e aceites serão criados juntos. Se qualquer validação falhar, nada
          será salvo parcialmente.
        </p>
        <div className="space-y-4">
          {legalDocuments.map((document) => {
            const label =
              document.document_type === "terms_of_use"
                ? "Termos de Uso"
                : "Política de Privacidade";

            return (
              <div className="border-line bg-surface rounded-xl border p-4" key={document.id}>
                <details>
                  <summary className="cursor-pointer font-semibold">
                    {label} — versão {document.version}
                  </summary>
                  <pre className="text-muted mt-3 overflow-auto font-sans text-sm leading-6 whitespace-pre-wrap">
                    {document.content_markdown}
                  </pre>
                </details>
                <Link
                  className="text-brand-strong mt-3 inline-block text-sm font-bold hover:underline"
                  href={document.document_type === "terms_of_use" ? "/termos" : "/privacidade"}
                  target="_blank"
                >
                  Abrir documento completo
                </Link>
                <CheckboxField
                  className="mt-4"
                  fieldKey={`legalDocumentIds:${document.id}`}
                  name="legalDocumentIds"
                  required
                  value={document.id}
                >
                  Li e aceito {label} na versão {document.version}.
                </CheckboxField>
              </div>
            );
          })}
        </div>
      </fieldset>

      <FormActions className="form-actions--page">
        <SubmitButton idleLabel="Criar workspace" pendingLabel="Criando workspace…" />
      </FormActions>
    </Form>
  );
}
