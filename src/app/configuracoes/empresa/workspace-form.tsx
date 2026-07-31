"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/app/_components/submit-button";
import { initialActionState } from "@/lib/forms/action-state";

import { updateWorkspaceConfiguration } from "./actions";

type WorkspaceFormProps = {
  settings: {
    accounting_basis: string;
    address_city: string | null;
    address_district: string | null;
    address_line1: string | null;
    address_line2: string | null;
    address_region: string | null;
    country_code: string;
    date_format: string;
    default_alert_offsets: number[];
    legal_name: string;
    postal_code: string | null;
    tax_id: string | null;
    trade_name: string | null;
  };
  workspace: {
    currency: string;
    name: string;
    timezone: string;
  };
};

const fieldClassName =
  "border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3 text-base";
const alertOptions = [60, 30, 15, 7, 3, 1, 0] as const;

export function WorkspaceForm({ settings, workspace }: WorkspaceFormProps) {
  const [state, formAction] = useActionState(updateWorkspaceConfiguration, initialActionState);

  return (
    <form action={formAction} className="space-y-8">
      {state.message ? (
        <p
          className="border-line bg-brand-soft text-brand-strong rounded-xl border px-4 py-3 text-sm"
          role="status"
        >
          {state.message}
        </p>
      ) : null}

      <fieldset className="border-line rounded-2xl border p-5 sm:p-6">
        <legend className="px-2 font-semibold">Identidade</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold sm:col-span-2">
            Nome do workspace
            <input
              className={fieldClassName}
              defaultValue={workspace.name}
              maxLength={120}
              name="workspaceName"
              required
            />
          </label>
          <label className="text-sm font-semibold sm:col-span-2">
            Razão social
            <input
              className={fieldClassName}
              defaultValue={settings.legal_name}
              maxLength={160}
              name="legalName"
              required
            />
          </label>
          <label className="text-sm font-semibold">
            Nome fantasia
            <input
              className={fieldClassName}
              defaultValue={settings.trade_name ?? ""}
              maxLength={160}
              name="tradeName"
            />
          </label>
          <label className="text-sm font-semibold">
            CPF ou CNPJ opcional
            <input
              className={fieldClassName}
              defaultValue={settings.tax_id ?? ""}
              inputMode="numeric"
              maxLength={24}
              name="taxId"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="border-line rounded-2xl border p-5 sm:p-6">
        <legend className="px-2 font-semibold">Endereço</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold sm:col-span-2">
            Logradouro e número
            <input
              autoComplete="street-address"
              className={fieldClassName}
              defaultValue={settings.address_line1 ?? ""}
              maxLength={160}
              name="addressLine1"
            />
          </label>
          <label className="text-sm font-semibold sm:col-span-2">
            Complemento
            <input
              className={fieldClassName}
              defaultValue={settings.address_line2 ?? ""}
              maxLength={160}
              name="addressLine2"
            />
          </label>
          <label className="text-sm font-semibold">
            Bairro
            <input
              className={fieldClassName}
              defaultValue={settings.address_district ?? ""}
              maxLength={100}
              name="addressDistrict"
            />
          </label>
          <label className="text-sm font-semibold">
            Cidade
            <input
              autoComplete="address-level2"
              className={fieldClassName}
              defaultValue={settings.address_city ?? ""}
              maxLength={100}
              name="addressCity"
            />
          </label>
          <label className="text-sm font-semibold">
            Estado
            <input
              autoComplete="address-level1"
              className={fieldClassName}
              defaultValue={settings.address_region ?? ""}
              maxLength={100}
              name="addressRegion"
            />
          </label>
          <label className="text-sm font-semibold">
            CEP
            <input
              autoComplete="postal-code"
              className={fieldClassName}
              defaultValue={settings.postal_code ?? ""}
              maxLength={20}
              name="postalCode"
            />
          </label>
          <label className="text-sm font-semibold">
            País
            <select
              className={fieldClassName}
              defaultValue={settings.country_code}
              name="countryCode"
            >
              <option value="BR">Brasil</option>
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="border-line rounded-2xl border p-5 sm:p-6">
        <legend className="px-2 font-semibold">Preferências financeiras</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Moeda
            <input
              className={`${fieldClassName} text-muted`}
              disabled
              readOnly
              value={workspace.currency}
            />
          </label>
          <label className="text-sm font-semibold">
            Timezone financeiro
            <select className={fieldClassName} defaultValue={workspace.timezone} name="timezone">
              <option value="America/Sao_Paulo">São Paulo</option>
              <option value="America/Recife">Recife</option>
              <option value="America/Manaus">Manaus</option>
              <option value="America/Rio_Branco">Rio Branco</option>
              <option value="UTC">UTC</option>
            </select>
          </label>
          <label className="text-sm font-semibold">
            Formato de data
            <select
              className={fieldClassName}
              defaultValue={settings.date_format}
              name="dateFormat"
            >
              <option value="DD/MM/YYYY">DD/MM/AAAA</option>
              <option value="YYYY-MM-DD">AAAA-MM-DD</option>
            </select>
          </label>
          <label className="text-sm font-semibold">
            Regime gerencial padrão
            <select
              className={fieldClassName}
              defaultValue={settings.accounting_basis}
              name="accountingBasis"
            >
              <option value="cash">Caixa</option>
              <option value="accrual">Competência</option>
            </select>
          </label>
        </div>
        <p className="text-muted mt-4 text-sm leading-6">
          Alterar o timezone muda a interpretação de “hoje” e afetará agendas futuras. A moeda está
          bloqueada para preservar a consistência histórica.
        </p>
        <div className="mt-5">
          <p className="text-sm font-semibold">Antecedência padrão dos alertas</p>
          <div className="mt-3 flex flex-wrap gap-4">
            {alertOptions.map((days) => (
              <label className="inline-flex items-center gap-2 text-sm" key={days}>
                <input
                  defaultChecked={settings.default_alert_offsets.includes(days)}
                  name="alertOffsets"
                  type="checkbox"
                  value={days}
                />
                {days === 0 ? "No dia" : `${days} ${days === 1 ? "dia" : "dias"}`}
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      <div className="flex justify-end">
        <SubmitButton idleLabel="Salvar configurações" />
      </div>
    </form>
  );
}
