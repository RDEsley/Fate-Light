"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/app/_components/submit-button";
import { Field, FormActions, TextField } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
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

  return (
    <Form action={formAction} className="grid gap-5" state={state}>
      <fieldset className="cartoon-card p-5 sm:p-6">
        <legend className="px-2 font-semibold">Identidade</legend>
        <div className="form-grid sm:grid-cols-2">
          <TextField
            className="sm:col-span-2"
            defaultValue={sent.text("workspaceName", workspace.name)}
            label="Nome do workspace"
            maxLength={120}
            minLength={2}
            name="workspaceName"
            required
          />
          <TextField
            className="sm:col-span-2"
            defaultValue={sent.text("legalName", settings.legal_name)}
            label="Razão social"
            maxLength={160}
            name="legalName"
            required
          />
          <TextField
            defaultValue={sent.text("tradeName", settings.trade_name ?? "")}
            label="Nome fantasia"
            maxLength={160}
            name="tradeName"
            optional
          />
          <TextField
            defaultValue={sent.text("taxId", settings.tax_id ?? "")}
            inputMode="numeric"
            label="CPF ou CNPJ"
            maxLength={24}
            name="taxId"
            optional
          />
        </div>
      </fieldset>

      <fieldset className="cartoon-card p-5 sm:p-6">
        <legend className="px-2 font-semibold">Endereço</legend>
        <div className="form-grid sm:grid-cols-2">
          <TextField
            autoComplete="street-address"
            className="sm:col-span-2"
            defaultValue={sent.text("addressLine1", settings.address_line1 ?? "")}
            label="Logradouro e número"
            maxLength={160}
            name="addressLine1"
            optional
          />
          <TextField
            className="sm:col-span-2"
            defaultValue={sent.text("addressLine2", settings.address_line2 ?? "")}
            label="Complemento"
            maxLength={160}
            name="addressLine2"
            optional
          />
          <TextField
            defaultValue={sent.text("addressDistrict", settings.address_district ?? "")}
            label="Bairro"
            maxLength={100}
            name="addressDistrict"
            optional
          />
          <TextField
            autoComplete="address-level2"
            defaultValue={sent.text("addressCity", settings.address_city ?? "")}
            label="Cidade"
            maxLength={100}
            name="addressCity"
            optional
          />
          <TextField
            autoComplete="address-level1"
            defaultValue={sent.text("addressRegion", settings.address_region ?? "")}
            label="Estado"
            maxLength={100}
            name="addressRegion"
            optional
          />
          <TextField
            autoComplete="postal-code"
            defaultValue={sent.text("postalCode", settings.postal_code ?? "")}
            label="CEP"
            maxLength={20}
            name="postalCode"
            optional
          />
          <SelectField
            className="sm:col-span-2"
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
          <Field
            hint="Bloqueada para preservar a consistência do histórico."
            htmlFor="workspace-currency"
            label="Moeda"
          >
            <input disabled id="workspace-currency" readOnly value={workspace.currency} />
          </Field>
          <SelectField
            defaultValue={sent.text("timezone", workspace.timezone)}
            hint="Muda a interpretação de “hoje” e afeta as agendas futuras."
            label="Timezone financeiro"
            name="timezone"
            options={timezoneOptions}
          />
          <Field htmlFor="workspace-date-format" label="Formato de data">
            <input name="dateFormat" type="hidden" value="DD/MM/YYYY" />
            <input disabled id="workspace-date-format" readOnly value="DD/MM/AAAA · PT-BR" />
          </Field>
          <SelectField
            defaultValue={sent.text("accountingBasis", settings.accounting_basis)}
            label="Regime gerencial padrão"
            name="accountingBasis"
            options={accountingBasisOptions}
          />
        </div>
        {/* A antecedência dos alertas vive no perfil, junto das outras preferências de uso.
            Os campos ocultos preservam o valor salvo porque a RPC de configuração recebe
            todos os campos de uma vez. */}
        {settings.default_alert_offsets.map((days) => (
          <input key={days} name="alertOffsets" type="hidden" value={days} />
        ))}
      </fieldset>

      <FormActions className="form-actions--page">
        <SubmitButton idleLabel="Salvar configurações" />
      </FormActions>
    </Form>
  );
}
