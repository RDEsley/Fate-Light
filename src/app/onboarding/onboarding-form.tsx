"use client";

import Link from "next/link";
import { useActionState } from "react";

import { SubmitButton } from "@/app/_components/submit-button";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
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
    <form action={formAction} className="space-y-5">
      {state.message ? (
        <FeedbackBanner
          message={state.message}
          tone={state.status === "error" ? "error" : "success"}
        />
      ) : null}

      <fieldset className="cartoon-card p-5 sm:p-6">
        <legend className="px-2 font-semibold">1. Seu perfil</legend>
        <div className="form-grid sm:grid-cols-2">
          <label className="field sm:col-span-2">
            <span className="field__label">Nome completo</span>
            <input
              autoComplete="name"
              defaultValue={initialDisplayName}
              maxLength={120}
              name="fullName"
              required
            />
          </label>
          <label className="field">
            <span className="field__label">
              Telefone <span className="field__optional">opcional</span>
            </span>
            <input autoComplete="tel" inputMode="tel" maxLength={32} name="phone" type="tel" />
          </label>
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
          <label className="field sm:col-span-2">
            <span className="field__label">Nome do workspace</span>
            <input
              defaultValue={initialDisplayName}
              maxLength={120}
              name="workspaceName"
              required
            />
          </label>
          <label className="field sm:col-span-2">
            <span className="field__label">Razão social</span>
            <input maxLength={160} name="legalName" />
          </label>
          <label className="field">
            <span className="field__label">Nome fantasia</span>
            <input maxLength={160} name="tradeName" />
          </label>
          <label className="field">
            <span className="field__label">
              CPF ou CNPJ <span className="field__optional">opcional</span>
            </span>
            <input inputMode="numeric" maxLength={24} name="taxId" />
          </label>
          <label className="field">
            <span className="field__label">Moeda do workspace</span>
            <input className="text-muted" disabled readOnly value="BRL — Real brasileiro" />
            <input name="currency" type="hidden" value="BRL" />
          </label>
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
            {[30, 15, 7, 1].map((days) => (
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
                <label className="mt-4 flex items-start gap-3 text-sm leading-6">
                  <input
                    className="mt-1"
                    name="legalDocumentIds"
                    required
                    type="checkbox"
                    value={document.id}
                  />
                  Li e aceito {label} na versão {document.version}.
                </label>
              </div>
            );
          })}
        </div>
      </fieldset>

      <div className="flex justify-end">
        <SubmitButton idleLabel="Criar workspace" pendingLabel="Criando workspace…" />
      </div>
    </form>
  );
}
