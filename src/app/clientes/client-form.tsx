import Link from "next/link";
import type { Route } from "next";

import { SubmitButton } from "@/app/_components/submit-button";

type ClientFormValues = {
  address?: {
    city?: string;
    country_code?: string;
    district?: string;
    line1?: string;
    line2?: string;
    postal_code?: string;
    region?: string;
  };
  commercialStatus?: string;
  kind?: string;
  name?: string;
  notes?: string | null;
  responsibleName?: string | null;
  tags?: string[];
  taxId?: string | null;
  tradeName?: string | null;
};

type ClientFormProps = {
  action: (formData: FormData) => Promise<void>;
  cancelHref: Route;
  clientId?: string;
  submitLabel: string;
  values?: ClientFormValues;
};

const fieldClassName =
  "border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3 text-base";

export function ClientForm({ action, cancelHref, clientId, submitLabel, values }: ClientFormProps) {
  return (
    <form action={action} className="space-y-7">
      {clientId ? <input name="clientId" type="hidden" value={clientId} /> : null}

      <fieldset className="border-line rounded-2xl border p-5 sm:p-6">
        <legend className="px-2 font-semibold">Identificação</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Tipo
            <select className={fieldClassName} defaultValue={values?.kind ?? "company"} name="kind">
              <option value="company">Empresa</option>
              <option value="person">Pessoa</option>
            </select>
          </label>
          <label className="text-sm font-semibold">
            Status comercial
            <select
              className={fieldClassName}
              defaultValue={values?.commercialStatus ?? "lead"}
              name="commercialStatus"
            >
              <option value="lead">Lead</option>
              <option value="active">Ativo</option>
              <option value="paused">Pausado</option>
              <option value="inactive">Inativo</option>
            </select>
          </label>
          <label className="text-sm font-semibold sm:col-span-2">
            Nome
            <input
              className={fieldClassName}
              defaultValue={values?.name}
              maxLength={160}
              name="name"
              required
            />
          </label>
          <label className="text-sm font-semibold">
            Nome comercial opcional
            <input
              className={fieldClassName}
              defaultValue={values?.tradeName ?? ""}
              maxLength={160}
              name="tradeName"
            />
          </label>
          <label className="text-sm font-semibold">
            CPF ou CNPJ opcional
            <input
              className={fieldClassName}
              defaultValue={values?.taxId ?? ""}
              inputMode="numeric"
              maxLength={24}
              name="taxId"
            />
          </label>
          <label className="text-sm font-semibold">
            Responsável opcional
            <input
              className={fieldClassName}
              defaultValue={values?.responsibleName ?? ""}
              maxLength={120}
              name="responsibleName"
            />
          </label>
          <label className="text-sm font-semibold">
            Tags separadas por vírgula
            <input
              className={fieldClassName}
              defaultValue={values?.tags?.join(", ")}
              maxLength={820}
              name="tags"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="border-line rounded-2xl border p-5 sm:p-6">
        <legend className="px-2 font-semibold">Endereço opcional</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold sm:col-span-2">
            Endereço
            <input
              className={fieldClassName}
              defaultValue={values?.address?.line1}
              maxLength={160}
              name="addressLine1"
            />
          </label>
          <label className="text-sm font-semibold sm:col-span-2">
            Complemento
            <input
              className={fieldClassName}
              defaultValue={values?.address?.line2}
              maxLength={160}
              name="addressLine2"
            />
          </label>
          <label className="text-sm font-semibold">
            Bairro
            <input
              className={fieldClassName}
              defaultValue={values?.address?.district}
              maxLength={100}
              name="addressDistrict"
            />
          </label>
          <label className="text-sm font-semibold">
            Cidade
            <input
              className={fieldClassName}
              defaultValue={values?.address?.city}
              maxLength={100}
              name="addressCity"
            />
          </label>
          <label className="text-sm font-semibold">
            Estado/região
            <input
              className={fieldClassName}
              defaultValue={values?.address?.region}
              maxLength={100}
              name="addressRegion"
            />
          </label>
          <label className="text-sm font-semibold">
            CEP
            <input
              className={fieldClassName}
              defaultValue={values?.address?.postal_code}
              maxLength={20}
              name="addressPostalCode"
            />
          </label>
          <label className="text-sm font-semibold">
            País
            <input
              className={fieldClassName}
              defaultValue={values?.address?.country_code ?? "BR"}
              maxLength={2}
              name="addressCountryCode"
            />
          </label>
        </div>
      </fieldset>

      <label className="block text-sm font-semibold">
        Observações
        <textarea
          className={`${fieldClassName} min-h-32`}
          defaultValue={values?.notes ?? ""}
          maxLength={5000}
          name="notes"
        />
      </label>

      <div className="flex flex-wrap justify-end gap-3">
        <Link
          className="border-line hover:bg-brand-soft rounded-xl border px-5 py-3 font-semibold"
          href={cancelHref}
        >
          Cancelar
        </Link>
        <SubmitButton idleLabel={submitLabel} />
      </div>
    </form>
  );
}
