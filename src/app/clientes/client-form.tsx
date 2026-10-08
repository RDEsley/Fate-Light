"use client";

import type { Route } from "next";
import Link from "next/link";
import { useActionState, useState } from "react";

import { FormActions, FormSection, TextField } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { DateField } from "@/components/ui/form-controls";
import { FormMore } from "@/components/ui/form-panel";
import { Icon } from "@/components/ui/icon";
import { MoneyField } from "@/components/ui/money-field";
import { SelectField } from "@/components/ui/select-field";
import { parseNewClientEntities } from "@/features/clients/entity-schemas";
import { validateClientLinks, type ClientLink } from "@/features/clients/schemas";
import { clientStatusOptions } from "@/features/clients/status";
import { formatCurrency, formatDatePtBr } from "@/features/mvp/format";
import { initialActionState, submittedValues, type ActionState } from "@/lib/forms/action-state";

import { SubmitButton } from "../_components/submit-button";
import { ClientEntitiesField } from "./client-entities-field";
import { ClientLinksField } from "./client-links-field";

type ClientFormProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  cancelHref: Route;
  clientId?: string;
  submitLabel: string;
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

/**
 * Regras entre campos, conferidas antes de ir ao servidor: link pela metade, empresa/marca
 * sem nome e histórico anterior com só o valor ou só a data.
 */
function validateClient(formData: FormData) {
  const errors: Record<string, string> = { ...validateClientLinks(formData) };
  const entities = parseNewClientEntities(formData);
  if (!entities.success) Object.assign(errors, entities.fieldErrors);

  const priorRevenue = Number(formData.get("priorRevenue") || 0);
  const priorRevenueDate = String(formData.get("priorRevenueDate") ?? "");
  if (priorRevenue > 0 && !priorRevenueDate) {
    errors.priorRevenueDate = "Informe a data de referência deste valor.";
  }
  if (priorRevenueDate && priorRevenue <= 0) {
    errors.priorRevenue = "Informe o total recebido ou limpe a data.";
  }
  return errors;
}

export function ClientForm({ action, cancelHref, clientId, submitLabel, values }: ClientFormProps) {
  const editing = Boolean(clientId);
  const [state, formAction] = useActionState(action, initialActionState);
  const sent = submittedValues(state);
  const [priorCents, setPriorCents] = useState<number | null>(null);
  const [priorDate, setPriorDate] = useState(sent.text("priorRevenueDate"));
  const priorAmount = priorCents !== null && priorCents > 0 ? priorCents / 100 : 0;
  const priorPreviewReady = priorAmount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(priorDate);

  return (
    <Form action={formAction} className="grid gap-4" state={state} validate={validateClient}>
      {clientId ? <input name="clientId" type="hidden" value={clientId} /> : null}

      <section className="panel-card">
        <div className="section-heading mb-5">
          <span className="section-heading__icon bg-brand-soft text-brand-strong">
            <Icon name="user" />
          </span>
          <div>
            <h2>Identificação</h2>
            <p>Como este cliente aparece nas listas, cobranças e alertas.</p>
          </div>
        </div>
        <div className="form-grid sm:grid-cols-2 lg:grid-cols-12">
          <TextField
            className="lg:col-span-5"
            defaultValue={sent.text("name", values?.name ?? "")}
            label="Nome"
            maxLength={160}
            minLength={2}
            name="name"
            placeholder="Ex.: Padaria do João"
            required
          />
          <TextField
            className="lg:col-span-4"
            defaultValue={sent.text("companyName", values?.companyName ?? "")}
            label="Razão social ou nome fantasia"
            maxLength={160}
            name="companyName"
            optional
            placeholder="Ex.: João Alimentos LTDA"
          />
          <SelectField
            className="sm:col-span-2 lg:col-span-3"
            defaultValue={sent.text("status", values?.status ?? "active")}
            hint="Define se o cliente recebe novos serviços e aparece na operação do dia a dia."
            label="Situação comercial"
            name="status"
            options={clientStatusOptions}
          />
        </div>
      </section>

      <section className="panel-card">
        <div className="section-heading mb-5">
          <span className="section-heading__icon bg-violet-soft text-violet">
            <Icon name="mail" />
          </span>
          <div>
            <h2>Contato e links</h2>
            <p>Preencha só o que tiver. O que ficar em branco não aparece na ficha.</p>
          </div>
        </div>
        <div className="form-grid sm:grid-cols-2 lg:grid-cols-3">
          <TextField
            defaultValue={sent.text("email", values?.email ?? "")}
            label="E-mail"
            maxLength={254}
            name="email"
            optional
            placeholder="contato@padariadojoao.com.br"
            type="email"
          />
          <TextField
            defaultValue={sent.text("phone", values?.phone ?? "")}
            label="Telefone"
            maxLength={32}
            name="phone"
            optional
            placeholder="(11) 98888-7777"
            type="tel"
          />
          <TextField
            className="sm:col-span-2 lg:col-span-1"
            defaultValue={sent.text("website", values?.website ?? "")}
            label="Site"
            maxLength={253}
            name="website"
            optional
            placeholder="padariadojoao.com.br"
          />
        </div>
        <FormSection
          className="mt-5"
          description="Painel do registrador, pasta de materiais, rede social. Viram atalhos no card do cliente."
          title="Outros links"
        >
          <ClientLinksField links={values?.links} />
        </FormSection>
      </section>

      {editing ? null : (
        <section className="panel-card">
          <div className="section-heading mb-5">
            <span className="section-heading__icon bg-violet-soft text-violet">
              <Icon name="building" />
            </span>
            <div>
              <h2>Empresas e marcas</h2>
              <p>
                Opcional. Use quando este cliente tem mais de um negócio: cada serviço, cobrança ou
                domínio pode ser vinculado a uma delas.
              </p>
            </div>
          </div>
          <ClientEntitiesField />
        </section>
      )}

      <section className="panel-card">
        <div className="section-heading mb-5">
          <span className="section-heading__icon bg-warning-soft text-warning">
            <Icon name="file" />
          </span>
          <div>
            <h2>Observações e histórico</h2>
            <p>Contexto que ajuda você a lembrar deste cliente depois.</p>
          </div>
        </div>
        <div className="grid gap-4">
          <TextField
            defaultValue={sent.text("notes", values?.notes ?? "")}
            hint="Aparece em destaque na ficha do cliente, logo abaixo dos dados."
            label="Observações"
            maxLength={5000}
            multiline
            name="notes"
            optional
            placeholder="Combinados, preferências, contexto do relacionamento…"
          />
          <FormMore
            description="Use somente se este cliente já pagava você antes de começar a usar o sistema."
            icon="history"
            title="Receita anterior ao Fate Light"
          >
            <div className="form-grid sm:grid-cols-2">
              <MoneyField
                defaultValue={sent.text("priorRevenue")}
                hint="Vira uma única cobrança histórica já quitada, para o total recebido do cliente ficar correto. Não cria serviço nem recorrência."
                label="Total já recebido"
                name="priorRevenue"
                onCentsChange={setPriorCents}
                optional
              />
              <DateField
                defaultValue={sent.text("priorRevenueDate")}
                label="Data de referência"
                name="priorRevenueDate"
                onValueChange={setPriorDate}
                optional
              />
              <TextField
                className="sm:col-span-2"
                defaultValue={sent.text("priorRevenueLabel")}
                hint="Identifica o lançamento na lista de cobranças. Sem texto, fica “Histórico anterior ao sistema”."
                label="Descrição do histórico"
                maxLength={200}
                name="priorRevenueLabel"
                optional
                placeholder="Ex.: Gestão de tráfego 2023–2025"
              />
            </div>
            {priorPreviewReady ? (
              <p className="helper-note" role="status">
                <Icon className="size-4" name="receipt" />
                <span>
                  Será criada uma cobrança histórica quitada de{" "}
                  <strong>{formatCurrency(priorAmount)}</strong> em{" "}
                  <strong>{formatDatePtBr(priorDate)}</strong>.
                </span>
              </p>
            ) : null}
          </FormMore>
        </div>
      </section>

      <FormActions className="form-actions--page">
        <Link className="button button--secondary" href={cancelHref}>
          Cancelar
        </Link>
        <SubmitButton idleLabel={submitLabel} />
      </FormActions>
    </Form>
  );
}
