import type { Route } from "next";
import Link from "next/link";

import { FieldHint } from "@/components/ui/field-hint";
import { DateField } from "@/components/ui/form-controls";
import { Icon } from "@/components/ui/icon";
import { SelectField } from "@/components/ui/select-field";
import { SoftSubmitButton } from "@/components/ui/soft-submit-button";
import type { ClientLink } from "@/features/clients/schemas";
import { clientStatusOptions } from "@/features/clients/status";
import { isoToday } from "@/features/mvp/format";

import { ClientLinksField } from "./client-links-field";
import { PriorRevenueEntries, type PriorRevenueEntry } from "./prior-revenue-entries";

type ClientFormProps = {
  action: (formData: FormData) => Promise<void>;
  cancelHref: Route;
  clientId?: string;
  deletePriorRevenueAction?: (formData: FormData) => Promise<void>;
  priorRevenueEntries?: PriorRevenueEntry[];
  submitLabel: string;
  updatePriorRevenueAction?: (formData: FormData) => Promise<void>;
  values?: {
    companyName: string | null;
    email: string | null;
    links: ClientLink[];
    name: string;
    notes: string | null;
    phone: string | null;
    status: string;
    website: string | null;
  };
};

export function ClientForm({
  action,
  cancelHref,
  clientId,
  deletePriorRevenueAction,
  priorRevenueEntries,
  submitLabel,
  updatePriorRevenueAction,
  values,
}: ClientFormProps) {
  const editing = Boolean(clientId);

  return (
    <form action={action} className="grid gap-4">
      {clientId ? <input name="clientId" type="hidden" value={clientId} /> : null}

      <section className="panel-card">
        <div className="section-heading mb-4">
          <span className="section-heading__icon bg-brand-soft text-brand-strong">
            <Icon name="user" />
          </span>
          <div>
            <h2>Identificação</h2>
            <p>Como este cliente aparece nas listas, cobranças e alertas.</p>
          </div>
        </div>
        <div className="form-grid sm:grid-cols-2">
          <label className="field">
            <span className="field__label">Nome</span>
            <input
              defaultValue={values?.name}
              maxLength={160}
              name="name"
              placeholder="Ex.: Padaria do João"
              required
            />
          </label>
          <label className="field">
            <span className="field__label">
              Razão social ou nome fantasia <span className="field__optional">opcional</span>
            </span>
            <input
              defaultValue={values?.companyName ?? ""}
              maxLength={160}
              name="companyName"
              placeholder="Ex.: João Alimentos LTDA"
            />
          </label>
          <SelectField
            defaultValue={values?.status ?? "active"}
            label="Situação comercial"
            name="status"
            options={clientStatusOptions}
          />
          <label className="field">
            <span className="field__label">
              Site <span className="field__optional">opcional</span>
            </span>
            <input
              defaultValue={values?.website ?? ""}
              maxLength={253}
              name="website"
              placeholder="Ex.: padariadojoao.com.br"
            />
          </label>
        </div>
        <div className="border-line mt-4 border-t pt-4">
          <p className="field__label flex items-center">
            Outros links deste cliente
            <FieldHint>
              Painel do registrador, pasta de materiais, rede social — o que você abre com
              frequência. Aparecem como atalhos no card do cliente.
            </FieldHint>
          </p>
          <ClientLinksField links={values?.links} />
        </div>
      </section>

      <section className="panel-card">
        <div className="section-heading mb-4">
          <span className="section-heading__icon bg-violet-soft text-violet">
            <Icon name="bell" />
          </span>
          <div>
            <h2>Contato</h2>
            <p>Deixe em branco o que você não tiver — o card não mostra campos vazios.</p>
          </div>
        </div>
        <div className="form-grid sm:grid-cols-2">
          <label className="field">
            <span className="field__label">
              E-mail <span className="field__optional">opcional</span>
            </span>
            <input
              defaultValue={values?.email ?? ""}
              maxLength={254}
              name="email"
              placeholder="Ex.: contato@padariadojoao.com.br"
              type="email"
            />
          </label>
          <label className="field">
            <span className="field__label">
              Telefone <span className="field__optional">opcional</span>
            </span>
            <input
              defaultValue={values?.phone ?? ""}
              maxLength={32}
              name="phone"
              placeholder="Ex.: (11) 98888-7777"
              type="tel"
            />
          </label>
          <label className="field sm:col-span-2">
            <span className="field__label">
              Observações <span className="field__optional">opcional</span>
            </span>
            <textarea
              defaultValue={values?.notes ?? ""}
              maxLength={5000}
              name="notes"
              placeholder="Combinados, preferências, contexto do relacionamento…"
            />
            <span className="field__hint">
              Aparece em destaque na página do cliente, logo abaixo dos dados.
            </span>
          </label>
        </div>
      </section>

      <details className="panel-card form-disclosure" open={Boolean(priorRevenueEntries?.length)}>
        <summary className="flex cursor-pointer items-center justify-between gap-3 font-black">
          <span className="flex items-center gap-2">
            <span className="bg-positive-soft text-positive grid size-8 place-items-center rounded-lg">
              <Icon className="size-4" name="history" />
            </span>
            Já trabalhei com este cliente antes
          </span>
          <span className="text-muted flex items-center gap-1 text-xs">
            <span className="form-disclosure__closed-label">Abrir</span>
            <span className="form-disclosure__open-label">Fechar</span>
            <Icon className="form-disclosure__chevron size-4" name="chevron-down" />
          </span>
        </summary>
        <p className="helper-note mt-3">
          Informe quanto este cliente já pagou antes de você usar o sistema. É registrado como uma
          única cobrança quitada, então o total dele fica correto no painel e no histórico sem que
          você precise lançar mês a mês.
        </p>
        {clientId &&
        priorRevenueEntries?.length &&
        updatePriorRevenueAction &&
        deletePriorRevenueAction ? (
          <PriorRevenueEntries
            clientId={clientId}
            deleteAction={deletePriorRevenueAction}
            entries={priorRevenueEntries}
            updateAction={updatePriorRevenueAction}
          />
        ) : null}
        <div className="form-grid mt-3 sm:grid-cols-2">
          <label className="field">
            <span className="field__label">
              Total já recebido <span className="field__optional">opcional</span>
              <FieldHint>
                Deixe em branco se preferir lançar cada cobrança antiga separadamente na página de
                cobranças.
              </FieldHint>
            </span>
            <input
              min="0"
              name="priorRevenue"
              placeholder="Ex.: 24000,00"
              step="0.01"
              type="number"
            />
          </label>
          <DateField defaultValue={isoToday()} label="Data de referência" name="priorRevenueDate" />
        </div>
        {editing ? (
          <p className="field__hint mt-2">
            Ao salvar com um valor aqui, uma nova cobrança quitada é criada. Deixe vazio para não
            registrar nada.
          </p>
        ) : null}
      </details>

      <div className="flex flex-wrap items-end justify-end gap-3">
        <Link className="modal-cancel inline-flex items-center justify-center" href={cancelHref}>
          Cancelar
        </Link>
        <SoftSubmitButton
          idleLabel={submitLabel}
          requirements={[
            { message: "Informe o nome do cliente.", name: "name" },
            {
              message: "Sem e-mail nem telefone você não terá como falar com este cliente.",
              name: ["email", "phone"],
            },
          ]}
        />
      </div>
    </form>
  );
}
