import { SubmitButton } from "@/app/_components/submit-button";

type ContactFormProps = {
  action: (formData: FormData) => Promise<void>;
  clientId: string;
  contactId?: string;
  submitLabel?: string;
  values?: {
    email: string | null;
    isPrimary: boolean;
    name: string;
    phone: string | null;
    role: string | null;
  };
};

const fieldClassName =
  "border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3 text-base";

export function ContactForm({
  action,
  clientId,
  contactId,
  submitLabel = "Adicionar contato",
  values,
}: ContactFormProps) {
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input name="clientId" type="hidden" value={clientId} />
      {contactId ? <input name="contactId" type="hidden" value={contactId} /> : null}
      <label className="text-sm font-semibold sm:col-span-2">
        Nome
        <input
          className={fieldClassName}
          defaultValue={values?.name}
          maxLength={120}
          name="name"
          required
        />
      </label>
      <label className="text-sm font-semibold">
        E-mail
        <input
          className={fieldClassName}
          defaultValue={values?.email ?? ""}
          maxLength={254}
          name="email"
          type="email"
        />
      </label>
      <label className="text-sm font-semibold">
        Telefone
        <input
          className={fieldClassName}
          defaultValue={values?.phone ?? ""}
          maxLength={32}
          name="phone"
          type="tel"
        />
      </label>
      <label className="text-sm font-semibold sm:col-span-2">
        Função opcional
        <input
          className={fieldClassName}
          defaultValue={values?.role ?? ""}
          maxLength={80}
          name="role"
        />
      </label>
      <label className="flex items-start gap-3 text-sm sm:col-span-2">
        <input
          className="mt-1"
          defaultChecked={values?.isPrimary}
          name="isPrimary"
          type="checkbox"
        />
        Contato principal
      </label>
      <div className="sm:col-span-2">
        <SubmitButton idleLabel={submitLabel} />
      </div>
    </form>
  );
}
