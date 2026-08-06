"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/app/_components/submit-button";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { FieldError } from "@/components/ui/field-error";
import { SelectField } from "@/components/ui/select-field";
import { initialActionState, submittedValues } from "@/lib/forms/action-state";

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

const countryOptions = [{ label: "Brasil", value: "BR" }];

const timezoneOptions = [
  { label: "São Paulo", value: "America/Sao_Paulo" },
  { label: "Recife", value: "America/Recife" },
  { label: "Manaus", value: "America/Manaus" },
  { label: "Rio Branco", value: "America/Rio_Branco" },
  { label: "UTC", value: "UTC" },
];

const accountingBasisOptions = [
  { description: "Registra ao pagar ou receber", label: "Caixa", value: "cash" },
  { description: "Registra ao emitir ou vencer", label: "Competência", value: "accrual" },
];

export function WorkspaceForm({ settings, workspace }: WorkspaceFormProps) {
  const [state, formAction] = useActionState(updateWorkspaceConfiguration, initialActionState);
  // O React devolve todo campo ao `defaultValue` quando a action termina. Sem reler o que
  // foi enviado, um CNPJ com dígito a menos apagava as outras doze edições da tela.
  const sent = submittedValues(state);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      {state.message ? (
        <FeedbackBanner
          message={state.message}
          tone={state.status === "error" ? "error" : "success"}
        />
      ) : null}

      <fieldset className="cartoon-card p-5 sm:p-6">
        <legend className="px-2 font-semibold">Identidade</legend>
        <div className="form-grid sm:grid-cols-2">
          <label className="field sm:col-span-2">
            <span className="field__label">Nome do workspace</span>
            <input
              defaultValue={sent.text("workspaceName", workspace.name)}
              maxLength={120}
              name="workspaceName"
              required
            />
          </label>
          <label className="field sm:col-span-2">
            <span className="field__label">Razão social</span>
            <input
              defaultValue={sent.text("legalName", settings.legal_name)}
              maxLength={160}
              name="legalName"
              required
            />
          </label>
          <label className="field">
            <span className="field__label">Nome fantasia</span>
            <input
              defaultValue={sent.text("tradeName", settings.trade_name ?? "")}
              maxLength={160}
              name="tradeName"
            />
          </label>
          <label className="field">
            <span className="field__label">
              CPF ou CNPJ <span className="field__optional">opcional</span>
            </span>
            <input
              aria-invalid={Boolean(errors.taxId)}
              defaultValue={sent.text("taxId", settings.tax_id ?? "")}
              inputMode="numeric"
              maxLength={24}
              name="taxId"
            />
            <FieldError message={errors.taxId} />
          </label>
        </div>
      </fieldset>

      <fieldset className="cartoon-card p-5 sm:p-6">
        <legend className="px-2 font-semibold">Endereço</legend>
        <div className="form-grid sm:grid-cols-2">
          <label className="field sm:col-span-2">
            <span className="field__label">Logradouro e número</span>
            <input
              autoComplete="street-address"
              defaultValue={sent.text("addressLine1", settings.address_line1 ?? "")}
              maxLength={160}
              name="addressLine1"
            />
          </label>
          <label className="field sm:col-span-2">
            <span className="field__label">Complemento</span>
            <input
              defaultValue={sent.text("addressLine2", settings.address_line2 ?? "")}
              maxLength={160}
              name="addressLine2"
            />
          </label>
          <label className="field">
            <span className="field__label">Bairro</span>
            <input
              defaultValue={sent.text("addressDistrict", settings.address_district ?? "")}
              maxLength={100}
              name="addressDistrict"
            />
          </label>
          <label className="field">
            <span className="field__label">Cidade</span>
            <input
              autoComplete="address-level2"
              defaultValue={sent.text("addressCity", settings.address_city ?? "")}
              maxLength={100}
              name="addressCity"
            />
          </label>
          <label className="field">
            <span className="field__label">Estado</span>
            <input
              autoComplete="address-level1"
              defaultValue={sent.text("addressRegion", settings.address_region ?? "")}
              maxLength={100}
              name="addressRegion"
            />
          </label>
          <label className="field">
            <span className="field__label">CEP</span>
            <input
              autoComplete="postal-code"
              defaultValue={sent.text("postalCode", settings.postal_code ?? "")}
              maxLength={20}
              name="postalCode"
            />
          </label>
          <SelectField
            defaultValue={sent.text("countryCode", settings.country_code)}
            label="País"
            name="countryCode"
            options={countryOptions}
          />
        </div>
      </fieldset>

      <fieldset className="cartoon-card p-5 sm:p-6">
        <legend className="px-2 font-semibold">Preferências financeiras</legend>
        <div className="form-grid sm:grid-cols-2">
          <label className="field">
            <span className="field__label">Moeda</span>
            <input className="text-muted" disabled readOnly value={workspace.currency} />
          </label>
          <SelectField
            defaultValue={sent.text("timezone", workspace.timezone)}
            label="Timezone financeiro"
            name="timezone"
            options={timezoneOptions}
          />
          <label className="field">
            <span className="field__label">Formato de data</span>
            <input name="dateFormat" type="hidden" value="DD/MM/YYYY" />
            <input className="text-muted" disabled readOnly value="DD/MM/AAAA · PT-BR" />
          </label>
          <SelectField
            defaultValue={sent.text("accountingBasis", settings.accounting_basis)}
            label="Regime gerencial padrão"
            name="accountingBasis"
            options={accountingBasisOptions}
          />
        </div>
        <p className="text-muted mt-4 text-sm leading-6">
          Alterar o timezone muda a interpretação de “hoje” e afetará agendas futuras. A moeda está
          bloqueada para preservar a consistência histórica.
        </p>
        {/* A antecedência dos alertas vive no perfil, junto das outras preferências de uso.
            Os campos ocultos preservam o valor salvo porque a RPC de configuração recebe
            todos os campos de uma vez. */}
        {settings.default_alert_offsets.map((days) => (
          <input key={days} name="alertOffsets" type="hidden" value={days} />
        ))}
      </fieldset>

      <div className="flex justify-end">
        <SubmitButton idleLabel="Salvar configurações" />
      </div>
    </form>
  );
}
