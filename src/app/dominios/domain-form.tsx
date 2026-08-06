"use client";

import { useActionState, useState } from "react";

import { SubmitButton } from "@/app/_components/submit-button";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { FieldError } from "@/components/ui/field-error";
import { FieldHint } from "@/components/ui/field-hint";
import { ClientCombobox, DateField, type ClientOption } from "@/components/ui/form-controls";
import { Icon } from "@/components/ui/icon";
import { isoToday } from "@/features/mvp/format";
import { initialActionState, submittedValues, type ActionState } from "@/lib/forms/action-state";

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
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  clients: (ClientOption & { website?: string | null })[];
  domain?: DomainValues;
  onCancel?: () => void;
}) {
  const editing = Boolean(domain);
  const [state, formAction] = useActionState(action, initialActionState);
  const errors = state.fieldErrors ?? {};
  const sent = submittedValues(state);
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
    <form action={formAction} className="form-grid mt-4 sm:grid-cols-2">
      {domain ? <input name="id" type="hidden" value={domain.id} /> : null}
      {state.status === "error" && state.message ? (
        <div className="sm:col-span-2">
          <FeedbackBanner message={state.message} tone="error" />
        </div>
      ) : null}
      <ClientCombobox
        clients={clients}
        defaultFilter="all"
        defaultValue={domain?.clientId}
        onSelect={applyClient}
      />
      <label className="field">
        <span className="field__label">Domínio</span>
        <input
          aria-invalid={Boolean(errors.domain)}
          maxLength={253}
          name="domain"
          onChange={(event) => setDomainName(event.target.value)}
          placeholder="exemplo.com.br"
          required
          value={domainName}
        />
        <FieldError message={errors.domain} />
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
        error={errors.expiresOn}
        label="Data de expiração"
        name="expiresOn"
        required
      />
      <label className="field">
        <span className="field__label">
          Responsável pelo pagamento
          <FieldHint>
            Quem paga a renovação: você, o cliente ou um terceiro. Aparece no card para você saber a
            quem cobrar quando o prazo chegar.
          </FieldHint>
        </span>
        <input
          aria-invalid={Boolean(errors.paymentResponsibility)}
          maxLength={120}
          name="paymentResponsibility"
          onChange={(event) => setResponsibility(event.target.value)}
          placeholder="Ex.: Empresa"
          required
          value={responsibility}
        />
        <FieldError message={errors.paymentResponsibility} />
      </label>

      {/* Aberto quando o erro está aqui dentro: apontar um campo escondido atrás de um
          disclosure fechado é o mesmo que não apontar. */}
      <details
        className="form-disclosure sm:col-span-2"
        open={editing || Boolean(errors.registrar || errors.cost || errors.notes)}
      >
        <summary className="flex cursor-pointer items-center gap-1 text-sm font-semibold">
          Mais detalhes <span className="field__optional">opcional</span>
          <Icon className="form-disclosure__chevron ml-auto size-4" name="chevron-down" />
        </summary>
        <div className="form-grid mt-3 sm:grid-cols-2">
          <label className="field">
            <span className="field__label">
              Registrador <span className="field__optional">opcional</span>
              <FieldHint>Cole o link do painel para abrir a renovação com um clique.</FieldHint>
            </span>
            <input
              defaultValue={sent.text("registrar", domain?.registrar ?? "")}
              maxLength={120}
              name="registrar"
              placeholder="Ex.: godaddy.com ou GoDaddy"
            />
            <FieldError message={errors.registrar} />
          </label>
          <label className="field">
            <span className="field__label">
              Custo <span className="field__optional">opcional</span>
            </span>
            <input
              aria-invalid={Boolean(errors.cost)}
              defaultValue={sent.text(
                "cost",
                domain?.cost === null ? "" : String(domain?.cost ?? ""),
              )}
              min="0"
              name="cost"
              placeholder="Ex.: 40,00"
              step="0.01"
              type="number"
            />
            <FieldError message={errors.cost} />
          </label>
          <div className="option-card sm:col-span-2">
            <label className="option-card__toggle">
              <input
                defaultChecked={sent.checkbox("autoRenew", domain?.autoRenew)}
                name="autoRenew"
                type="checkbox"
              />
              <span>
                <strong>Renovação automática</strong>
                <small>O registrador cobra e renova sozinho quando o prazo vence.</small>
              </span>
            </label>
          </div>
          <label className="field sm:col-span-2">
            <span className="field__label">
              Observações <span className="field__optional">opcional</span>
            </span>
            <textarea
              defaultValue={sent.text("notes", domain?.notes ?? "")}
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
