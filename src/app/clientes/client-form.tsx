import Link from "next/link";
import type { Route } from "next";

import { SubmitButton } from "@/app/_components/submit-button";

type ClientFormProps = {
  action: (formData: FormData) => Promise<void>;
  cancelHref: Route;
  clientId?: string;
  submitLabel: string;
  values?: {
    companyName: string | null;
    email: string | null;
    name: string;
    notes: string | null;
    phone: string | null;
    status: string;
  };
};

const fieldClassName =
  "border-line bg-canvas mt-1.5 min-h-11 w-full rounded-xl border px-3 py-2.5 text-sm";

export function ClientForm({ action, cancelHref, clientId, submitLabel, values }: ClientFormProps) {
  return (
    <form action={action} className="form-grid sm:grid-cols-2">
      {clientId ? <input name="clientId" type="hidden" value={clientId} /> : null}
      <label className="text-sm font-semibold">
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
        Empresa opcional
        <input
          className={fieldClassName}
          defaultValue={values?.companyName ?? ""}
          maxLength={160}
          name="companyName"
        />
      </label>
      <label className="text-sm font-semibold">
        E-mail opcional
        <input
          className={fieldClassName}
          defaultValue={values?.email ?? ""}
          maxLength={254}
          name="email"
          type="email"
        />
      </label>
      <label className="text-sm font-semibold">
        Telefone opcional
        <input
          className={fieldClassName}
          defaultValue={values?.phone ?? ""}
          maxLength={32}
          name="phone"
          type="tel"
        />
      </label>
      <label className="text-sm font-semibold">
        Status
        <select className={fieldClassName} defaultValue={values?.status ?? "active"} name="status">
          <option value="active">Ativo</option>
          <option value="inactive">Inativo</option>
        </select>
      </label>
      <label className="text-sm font-semibold sm:col-span-2">
        Observações
        <textarea
          className={`${fieldClassName} min-h-20`}
          defaultValue={values?.notes ?? ""}
          maxLength={5000}
          name="notes"
        />
      </label>
      <div className="flex flex-wrap justify-end gap-3 sm:col-span-2">
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
