"use client";

import { useActionState, useState } from "react";

import { SubmitButton } from "@/app/_components/submit-button";
import { FormActions, TextField, ToggleCard } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import {
  ClientCombobox,
  DateField,
  EntitySelect,
  type ClientEntityOption,
  type ClientOption,
} from "@/components/ui/form-controls";
import { FormMore } from "@/components/ui/form-panel";
import { MoneyField } from "@/components/ui/money-field";
import { initialActionState, submittedValues, type ActionState } from "@/lib/forms/action-state";

export type DomainValues = {
  autoRenew: boolean;
  clientEntityId: string | null;
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
  entities = [],
  onCancel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  clients: (ClientOption & { website?: string | null })[];
  domain?: DomainValues;
  entities?: ClientEntityOption[];
  onCancel?: () => void;
}) {
  const editing = Boolean(domain);
  const [state, formAction] = useActionState(action, initialActionState);
  const sent = submittedValues(state);
  const [clientId, setClientId] = useState(domain?.clientId ?? "");
  const [domainName, setDomainName] = useState(domain?.domain ?? "");
  const [responsibility, setResponsibility] = useState(domain?.paymentResponsibility ?? "");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const hasEntities = Boolean(clientId) && entities.some((entity) => entity.clientId === clientId);

  const applyClient = (client: ClientOption | null) => {
    setClientId(client?.id ?? "");
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
    <Form action={formAction} className="grid gap-4" state={state}>
      {domain ? <input name="id" type="hidden" value={domain.id} /> : null}

      <div className="form-grid sm:grid-cols-2 lg:grid-cols-12">
        <ClientCombobox
          className="lg:col-span-6"
          clients={clients}
          defaultFilter="all"
          defaultValue={domain?.clientId}
          onSelect={applyClient}
        />
        <TextField
          className="lg:col-span-6"
          help={
            suggestion ? (
              <button
                className="text-left underline underline-offset-2"
                onClick={() => {
                  setDomainName(suggestion);
                  setSuggestion(null);
                }}
                type="button"
              >
                Usar o site cadastrado no cliente: {suggestion}
              </button>
            ) : undefined
          }
          label="Domínio"
          maxLength={253}
          name="domain"
          onValueChange={setDomainName}
          placeholder="exemplo.com.br"
          required
          value={domainName}
        />
        <DateField
          className="lg:col-span-4"
          defaultValue={domain?.expiresOn}
          label="Data de expiração"
          name="expiresOn"
          required
        />
        <TextField
          className={hasEntities ? "lg:col-span-4" : "lg:col-span-8"}
          hint="Quem paga a renovação: você, o cliente ou um terceiro. Aparece no card para você saber a quem cobrar quando o prazo chegar."
          label="Responsável pelo pagamento"
          maxLength={120}
          minLength={2}
          name="paymentResponsibility"
          onValueChange={setResponsibility}
          placeholder="Ex.: Empresa"
          required
          value={responsibility}
        />
        <EntitySelect
          className="sm:col-span-2 lg:col-span-4"
          clientId={clientId || null}
          defaultValue={sent.text("clientEntityId", domain?.clientEntityId ?? "")}
          entities={entities}
        />
      </div>

      <FormMore
        defaultOpen={editing}
        description="Registrador, custo, renovação e observações"
        title="Mais detalhes"
      >
        <div className="form-grid sm:grid-cols-2">
          <TextField
            defaultValue={sent.text("registrar", domain?.registrar ?? "")}
            hint="Cole o link do painel para abrir a renovação com um clique."
            label="Registrador"
            maxLength={120}
            name="registrar"
            optional
            placeholder="Ex.: godaddy.com ou GoDaddy"
          />
          <MoneyField
            defaultValue={sent.text(
              "cost",
              domain?.cost === null || domain?.cost === undefined ? "" : String(domain.cost),
            )}
            label="Custo"
            name="cost"
            optional
          />
        </div>
        <ToggleCard
          defaultChecked={sent.checkbox("autoRenew", domain?.autoRenew)}
          description="O registrador cobra e renova sozinho quando o prazo vence."
          name="autoRenew"
          title="Renovação automática"
        />
        <TextField
          defaultValue={sent.text("notes", domain?.notes ?? "")}
          label="Observações"
          maxLength={5000}
          multiline
          name="notes"
          optional
          placeholder="Login usado, combinados sobre a renovação…"
        />
      </FormMore>

      <FormActions>
        {onCancel ? (
          <button className="button button--secondary" onClick={onCancel} type="button">
            Cancelar
          </button>
        ) : null}
        <SubmitButton idleLabel={editing ? "Salvar domínio" : "Criar domínio"} />
      </FormActions>
    </Form>
  );
}
