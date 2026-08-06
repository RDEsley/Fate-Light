"use client";

import { useState } from "react";

import { SubmitButton } from "@/app/_components/submit-button";
import { FieldHint } from "@/components/ui/field-hint";
import { ClientCombobox, DateField, type ClientOption } from "@/components/ui/form-controls";
import { Icon } from "@/components/ui/icon";
import { isoToday } from "@/features/mvp/format";

export type DomainValues = {
  autoRenew: boolean;
  clientId: string;
  cost: number | null;
  domain: string;
  expiresOn: string;
  id: string;
  notes: string | null;
  paymentResponsibility: string;
  registrar: string | null;
};

const fieldClassName = "border-line bg-canvas mt-2 min-h-11 w-full rounded-xl border px-4 py-3";

/**
 * Formulário de domínio usado tanto na criação quanto na edição. Ao escolher o cliente,
 * o que já está cadastrado nele (site e responsável) é sugerido: redigitar dado que o
 * sistema já tem é a parte mais chata de acompanhar domínio.
 */
export function DomainForm({
  action,
  clients,
  domain,
  onCancel,
}: {
  action: (formData: FormData) => Promise<void>;
  clients: (ClientOption & { website?: string | null })[];
  domain?: DomainValues;
  onCancel?: () => void;
}) {
  const editing = Boolean(domain);
  const [domainName, setDomainName] = useState(domain?.domain ?? "");
  const [responsibility, setResponsibility] = useState(domain?.paymentResponsibility ?? "");
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const applyClient = (client: ClientOption | null) => {
    if (!client) {
      setSuggestion(null);
      return;
    }
    const picked = clients.find((entry) => entry.id === client.id);
    if (!responsibility) setResponsibility(client.name);
    // Só sugere: sobrescrever o que a pessoa digitou seria pior do que não ajudar.
    setSuggestion(picked?.website && !domainName ? picked.website : null);
  };

  return (
    <form action={action} className="form-grid mt-4 sm:grid-cols-2">
      {domain ? <input name="id" type="hidden" value={domain.id} /> : null}
      <ClientCombobox
        clients={clients}
        defaultFilter="all"
        defaultValue={domain?.clientId}
        onSelect={applyClient}
      />
      <label className="text-sm font-semibold">
        Domínio
        <input
          className={fieldClassName}
          name="domain"
          onChange={(event) => setDomainName(event.target.value)}
          placeholder="exemplo.com.br"
          required
          value={domainName}
        />
        {suggestion ? (
          <button
            className="field__hint mt-1 block text-left underline underline-offset-2"
            onClick={() => {
              setDomainName(suggestion);
              setSuggestion(null);
            }}
            type="button"
          >
            Usar o site cadastrado no cliente: {suggestion}
          </button>
        ) : null}
      </label>
      <DateField
        defaultValue={domain?.expiresOn ?? isoToday()}
        label="Data de expiração"
        name="expiresOn"
        required
      />
      <label className="text-sm font-semibold">
        <span className="flex items-center">
          Responsável pelo pagamento
          <FieldHint>
            Quem paga a renovação: você, o cliente ou um terceiro. Aparece no card para você saber a
            quem cobrar quando o prazo chegar.
          </FieldHint>
        </span>
        <input
          className={fieldClassName}
          maxLength={120}
          name="paymentResponsibility"
          onChange={(event) => setResponsibility(event.target.value)}
          placeholder="Ex.: Empresa"
          required
          value={responsibility}
        />
      </label>

      <details className="form-disclosure sm:col-span-2" open={editing}>
        <summary className="flex cursor-pointer items-center gap-1 text-sm font-semibold">
          Mais detalhes <span className="field__optional">opcional</span>
          <Icon className="form-disclosure__chevron ml-auto size-4" name="chevron-down" />
        </summary>
        <div className="form-grid mt-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            <span className="flex items-center">
              Registrador
              <FieldHint>Cole o link do painel para abrir a renovação com um clique.</FieldHint>
            </span>
            <input
              className={fieldClassName}
              defaultValue={domain?.registrar ?? ""}
              maxLength={120}
              name="registrar"
              placeholder="Ex.: godaddy.com ou GoDaddy"
            />
          </label>
          <label className="text-sm font-semibold">
            Custo <span className="field__optional">opcional</span>
            <input
              className={fieldClassName}
              defaultValue={domain?.cost ?? ""}
              min="0"
              name="cost"
              placeholder="Ex.: 40,00"
              step="0.01"
              type="number"
            />
          </label>
          <div className="option-card sm:col-span-2">
            <label className="option-card__toggle">
              <input defaultChecked={domain?.autoRenew} name="autoRenew" type="checkbox" />
              <span>
                <strong>Renovação automática</strong>
                <small>O registrador cobra e renova sozinho quando o prazo vence.</small>
              </span>
            </label>
          </div>
          <label className="text-sm font-semibold sm:col-span-2">
            Observações <span className="field__optional">opcional</span>
            <textarea
              className="border-line bg-canvas mt-2 min-h-24 w-full rounded-xl border px-4 py-3"
              defaultValue={domain?.notes ?? ""}
              maxLength={5000}
              name="notes"
              placeholder="Login usado, combinados sobre a renovação…"
            />
          </label>
        </div>
      </details>

      <div className="flex flex-wrap items-end justify-end gap-3 sm:col-span-2">
        {onCancel ? (
          <button className="modal-cancel" onClick={onCancel} type="button">
            Cancelar
          </button>
        ) : null}
        <SubmitButton idleLabel={editing ? "Salvar domínio" : "Criar domínio"} />
      </div>
    </form>
  );
}
