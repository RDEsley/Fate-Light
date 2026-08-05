"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/app/_components/submit-button";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { initialActionState } from "@/lib/forms/action-state";

import { bootstrapAccount } from "./actions";

export type LegalDocumentSummary = {
  content_markdown: string;
  document_type: string;
  id: string;
  version: string;
};

const fieldClassName =
  "border-line bg-canvas mt-1.5 min-h-11 w-full rounded-xl border px-3 py-2.5 text-sm";

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
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold sm:col-span-2">
            Nome completo
            <input
              autoComplete="name"
              className={fieldClassName}
              defaultValue={initialDisplayName}
              maxLength={120}
              name="fullName"
              required
            />
          </label>
          <label className="text-sm font-semibold">
            Telefone opcional
            <input
              autoComplete="tel"
              className={fieldClassName}
              inputMode="tel"
              maxLength={32}
              name="phone"
              type="tel"
            />
          </label>
          <label className="text-sm font-semibold">
            Timezone pessoal
            <select className={fieldClassName} defaultValue="America/Sao_Paulo" name="timezone">
              <option value="America/Sao_Paulo">São Paulo</option>
              <option value="America/Recife">Recife</option>
              <option value="America/Manaus">Manaus</option>
              <option value="America/Rio_Branco">Rio Branco</option>
              <option value="UTC">UTC</option>
            </select>
          </label>
          <input name="theme" type="hidden" value="light" />
        </div>
      </fieldset>

      <fieldset className="cartoon-card p-5 sm:p-6">
        <legend className="px-2 font-semibold">2. Sua empresa</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold sm:col-span-2">
            Nome do workspace
            <input
              className={fieldClassName}
              defaultValue={initialDisplayName}
              maxLength={120}
              name="workspaceName"
              required
            />
          </label>
          <label className="text-sm font-semibold sm:col-span-2">
            Razão social
            <input className={fieldClassName} maxLength={160} name="legalName" />
          </label>
          <label className="text-sm font-semibold">
            Nome fantasia
            <input className={fieldClassName} maxLength={160} name="tradeName" />
          </label>
          <label className="text-sm font-semibold">
            CPF ou CNPJ opcional
            <input className={fieldClassName} inputMode="numeric" maxLength={24} name="taxId" />
          </label>
          <div>
            <p className="text-sm font-semibold">Moeda do workspace</p>
            <p className="border-line bg-canvas mt-2 min-h-11 rounded-xl border px-4 py-3">
              BRL — Real brasileiro
            </p>
            <input name="currency" type="hidden" value="BRL" />
          </div>
        </div>
      </fieldset>

      <fieldset className="cartoon-card p-5 sm:p-6">
        <legend className="px-2 font-semibold">3. Preferências iniciais</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Formato de data
            <select className={fieldClassName} defaultValue="DD/MM/YYYY" name="dateFormat">
              <option value="DD/MM/YYYY">DD/MM/AAAA</option>
              <option value="YYYY-MM-DD">AAAA-MM-DD</option>
            </select>
          </label>
          <label className="text-sm font-semibold">
            Regime gerencial padrão
            <select className={fieldClassName} defaultValue="cash" name="accountingBasis">
              <option value="cash">Caixa</option>
              <option value="accrual">Competência</option>
            </select>
          </label>
        </div>
        <div className="mt-5">
          <p className="text-sm font-semibold">Antecedência padrão dos alertas</p>
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
