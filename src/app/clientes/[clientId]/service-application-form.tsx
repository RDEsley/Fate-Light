"use client";

import { useActionState, useState } from "react";

import { applyServiceToClient, editClientService } from "@/app/_actions/client-services";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { FieldError } from "@/components/ui/field-error";
import { DateField, EntitySelect, type ClientEntityOption } from "@/components/ui/form-controls";
import { Icon } from "@/components/ui/icon";
import { IntegerField } from "@/components/ui/integer-field";
import { MoneyField } from "@/components/ui/money-field";
import { PercentField } from "@/components/ui/percent-field";
import { SelectField } from "@/components/ui/select-field";
import { persistedToCents } from "@/features/mvp/money";
import { formatCurrency } from "@/features/mvp/format";
import { billingFrequencies, type BillingFrequency } from "@/features/mvp/recurrence";
import { initialActionState } from "@/lib/forms/action-state";

import { SubmitButton } from "../../_components/submit-button";

export type CatalogServiceOption = {
  adjustmentIntervalMonths: number | null;
  adjustmentRate: number | null;
  billingType: BillingFrequency;
  defaultPrice: number;
  description: string | null;
  id: string;
  name: string;
};

export type ClientServiceValues = {
  additionalFee: number;
  additionalFeeIsRevenue: boolean;
  adjustmentIntervalMonths: number | null;
  adjustmentRate: number | null;
  billingType: BillingFrequency;
  description: string | null;
  discountType: "fixed" | "none" | "percentage";
  discountValue: number;
  id: string;
  installmentCount: number;
  listPrice: number;
  mediaBudget: number;
  name: string;
  nextDueDate: string | null;
  notes: string | null;
  promotionalCycles: number | null;
  promotionalPrice: number | null;
  startDate: string;
};

const billingOptions = billingFrequencies.map(([value, label]) => ({ label, value }));

const discountOptions = [
  { description: "Cobra o valor cheio", label: "Sem desconto", value: "none" },
  { description: "Abate uma porcentagem do valor cheio", label: "Percentual", value: "percentage" },
  { description: "Abate um valor em reais", label: "Valor fixo", value: "fixed" },
];

const additionalNatureOptions = [
  {
    description: "Soma na sua receita e no resultado",
    label: "É minha receita",
    value: "revenue",
  },
  {
    description: "Passa por você mas é de terceiro; fica fora da receita",
    label: "É repasse",
    value: "passthrough",
  },
];

function centsToNumber(cents: number | null): number {
  if (cents === null) return 0;
  return cents / 100;
}

export function ServiceApplicationForm({
  catalog,
  clientId,
  defaultEntityId,
  entities = [],
  onCancel,
  service,
}: {
  catalog: CatalogServiceOption[];
  clientId: string;
  defaultEntityId?: string;
  entities?: ClientEntityOption[];
  onCancel?: () => void;
  service?: ClientServiceValues;
}) {
  const editing = Boolean(service);
  const [state, formAction] = useActionState(
    editing ? editClientService : applyServiceToClient,
    initialActionState,
  );
  const errors = state.fieldErrors ?? {};

  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [listPriceKey, setListPriceKey] = useState(0);
  const [listPriceDefault, setListPriceDefault] = useState<number | string | null>(
    service?.listPrice ?? null,
  );
  const [listPriceCents, setListPriceCents] = useState<number | null>(
    persistedToCents(service?.listPrice ?? null),
  );
  const [billingType, setBillingType] = useState<BillingFrequency>(
    service?.billingType ?? "monthly",
  );
  const [discountType, setDiscountType] = useState<"fixed" | "none" | "percentage">(
    service?.discountType ?? "none",
  );
  const [discountValue, setDiscountValue] = useState(service?.discountValue ?? 0);
  const [promotion, setPromotion] = useState(service?.promotionalPrice !== null && editing);
  const [promotionalPriceCents, setPromotionalPriceCents] = useState<number | null>(
    persistedToCents(service?.promotionalPrice ?? null),
  );
  const [promotionalCycles, setPromotionalCycles] = useState(
    service?.promotionalCycles ? String(service.promotionalCycles) : "",
  );
  const [additionalFeeCents, setAdditionalFeeCents] = useState<number | null>(
    persistedToCents(service?.additionalFee ?? null),
  );
  const [additionalNature, setAdditionalNature] = useState(
    service && !service.additionalFeeIsRevenue ? "passthrough" : "revenue",
  );
  const [adjustment, setAdjustment] = useState(Boolean(service?.adjustmentIntervalMonths));
  const [adjustmentInterval, setAdjustmentInterval] = useState(
    service?.adjustmentIntervalMonths ? String(service.adjustmentIntervalMonths) : "6",
  );
  const [adjustmentRate, setAdjustmentRate] = useState(
    service?.adjustmentRate ? String(service.adjustmentRate) : "",
  );

  const price = centsToNumber(listPriceCents);
  const discount = discountValue;
  const finalPrice = Math.max(
    0,
    discountType === "percentage"
      ? price * (1 - discount / 100)
      : discountType === "fixed"
        ? price - discount
        : price,
  );
  const cycles = Number(promotionalCycles) || 0;
  const promoValue = centsToNumber(promotionalPriceCents);
  // Só o adicional declarado como receita entra no que você recebe (ADR-0018).
  const additionalRevenue =
    additionalNature === "passthrough" ? 0 : centsToNumber(additionalFeeCents);
  const catalogMatch = catalog.find(
    (item) => item.name.toLocaleLowerCase("pt-BR") === name.trim().toLocaleLowerCase("pt-BR"),
  );

  const chooseCatalogService = (id: string) => {
    const chosen = catalog.find((item) => item.id === id);
    if (!chosen) return;
    setName(chosen.name);
    setDescription(chosen.description ?? "");
    setListPriceDefault(chosen.defaultPrice);
    setListPriceCents(persistedToCents(chosen.defaultPrice));
    setListPriceKey((key) => key + 1);
    setBillingType(chosen.billingType);
    setAdjustment(Boolean(chosen.adjustmentIntervalMonths));
    setAdjustmentInterval(String(chosen.adjustmentIntervalMonths ?? 6));
    setAdjustmentRate(chosen.adjustmentRate === null ? "" : String(chosen.adjustmentRate));
  };

  return (
    <form action={formAction} className="service-application-form">
      <input name="clientId" type="hidden" value={clientId} />
      {service ? <input name="id" type="hidden" value={service.id} /> : null}

      {state.status === "error" && state.message ? (
        <div className="mb-4">
          <FeedbackBanner message={state.message} tone="error" />
        </div>
      ) : null}

      <div className="form-grid sm:grid-cols-2 lg:grid-cols-4">
        {/* A edição não mexe na entidade: `update_client_service` não reassocia o vínculo,
            e trocá-lo aqui deixaria as cobranças já geradas apontando para outro lugar. */}
        {editing ? null : (
          <EntitySelect
            className="sm:col-span-2"
            clientId={clientId}
            defaultValue={defaultEntityId}
            entities={entities}
          />
        )}
        {editing ? (
          <input name="serviceId" type="hidden" value="" />
        ) : (
          <SelectField
            defaultValue=""
            label="Partir de um serviço do catálogo"
            name="serviceId"
            onValueChange={chooseCatalogService}
            optional
            options={[
              { description: "Preencho tudo do zero", label: "Serviço personalizado", value: "" },
              ...catalog.map((item) => ({
                description: formatCurrency(item.defaultPrice),
                label: item.name,
                value: item.id,
              })),
            ]}
            placeholder="Serviço personalizado"
          />
        )}
        <label className="field sm:col-span-2">
          <span className="field__label">Nome exibido no cliente</span>
          <input
            aria-invalid={Boolean(errors.name)}
            maxLength={120}
            name="name"
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Gestão de Google Ads"
            value={name}
          />
          <FieldError message={errors.name} />
        </label>
        <MoneyField
          key={`list-price-${listPriceKey}`}
          defaultValue={listPriceDefault}
          error={errors.listPrice}
          hint="O preço sem desconto. É a referência para promoções, reajustes e para você lembrar quanto o serviço realmente vale."
          label="Valor cheio"
          name="listPrice"
          onCentsChange={setListPriceCents}
        />
        <SelectField
          label="Periodicidade"
          name="billingType"
          onValueChange={(value) => setBillingType(value as BillingFrequency)}
          options={billingOptions}
          value={billingType}
        />
        <DateField
          defaultValue={service?.nextDueDate ?? undefined}
          error={errors.nextDueDate}
          label="Primeiro vencimento"
          name="nextDueDate"
          required
        />
        <div className="service-price-preview">
          <span>{additionalRevenue > 0 ? "A receber por cobrança" : "Valor aplicado"}</span>
          <strong>{formatCurrency(finalPrice + additionalRevenue)}</strong>
          <small>
            {additionalRevenue > 0
              ? `${formatCurrency(finalPrice)} do serviço + ${formatCurrency(additionalRevenue)} de adicional`
              : editing
                ? "Cobranças pendentes acompanham o novo valor"
                : "Cobrança inicial criada automaticamente"}
          </small>
        </div>
      </div>

      {!editing && name.trim().length >= 2 ? (
        <p className="helper-note mt-3">
          <Icon className="size-4" name="briefcase" />{" "}
          {catalogMatch
            ? `Já existe “${catalogMatch.name}” no catálogo. O valor definido aqui vale só para este cliente.`
            : `“${name.trim()}” será salvo no catálogo para você reutilizar em outros clientes.`}
        </p>
      ) : null}

      <details className="advanced-form mt-3" open={editing}>
        <summary>
          <span className="flex items-center gap-2">
            <Icon className="size-4" name="sliders" /> Personalizar preço e agenda
          </span>
          <span className="text-muted text-xs">Desconto, parcelas, promoção e reajuste</span>
        </summary>
        <div className="form-grid mt-3 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField
            label="Tipo de desconto"
            name="discountType"
            onValueChange={(value) => {
              setDiscountType(value as "fixed" | "none" | "percentage");
              setDiscountValue(0);
            }}
            options={discountOptions}
            value={discountType}
          />
          {discountType === "none" ? (
            <input name="discountValue" type="hidden" value="0" />
          ) : discountType === "percentage" ? (
            <PercentField
              key="discount-percent"
              defaultValue={service?.discountType === "percentage" ? service.discountValue : ""}
              error={errors.discountValue}
              label="Desconto (%)"
              name="discountValue"
              onCanonicalChange={(value) => setDiscountValue(Number(value) || 0)}
            />
          ) : (
            <MoneyField
              key="discount-money"
              defaultValue={service?.discountType === "fixed" ? service.discountValue : ""}
              error={errors.discountValue}
              label="Desconto (R$)"
              name="discountValue"
              onCentsChange={(cents) => setDiscountValue(centsToNumber(cents))}
            />
          )}
          {billingType === "single" ? (
            <IntegerField
              defaultValue={service?.installmentCount ?? 1}
              error={errors.installmentCount}
              label="Quantidade de parcelas"
              max={120}
              min={1}
              name="installmentCount"
              required
            />
          ) : (
            <input name="installmentCount" type="hidden" value="1" />
          )}
          <DateField
            defaultValue={service?.startDate}
            error={errors.startDate}
            label="Início do serviço"
            name="startDate"
            required
          />

          {billingType !== "single" ? (
            <div className="option-card sm:col-span-2">
              <label className="option-card__toggle">
                <input
                  checked={promotion}
                  onChange={(event) => setPromotion(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  <strong>Preço promocional</strong>
                  <small>Use outro valor nas primeiras cobranças. Pode ser zero.</small>
                </span>
              </label>
              {promotion ? (
                <>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <MoneyField
                      defaultValue={service?.promotionalPrice ?? ""}
                      error={errors.promotionalPrice}
                      label="Valor promocional"
                      name="promotionalPrice"
                      onCentsChange={setPromotionalPriceCents}
                    />
                    <IntegerField
                      defaultValue={promotionalCycles}
                      error={errors.promotionalCycles}
                      label="Quantidade de ciclos"
                      max={60}
                      min={1}
                      name="promotionalCycles"
                      onValueChange={setPromotionalCycles}
                    />
                  </div>
                  {cycles > 0 ? (
                    <p className="promo-summary">
                      <Icon className="size-4" name="sparkles" />
                      {promoValue === 0
                        ? `As ${cycles} primeiras cobranças saem de graça`
                        : `${formatCurrency(promoValue)} nas ${cycles} primeiras cobranças`}
                      , depois {formatCurrency(finalPrice)} por cobrança.
                    </p>
                  ) : null}
                </>
              ) : (
                <>
                  <input name="promotionalPrice" type="hidden" value="" />
                  <input name="promotionalCycles" type="hidden" value="" />
                </>
              )}
            </div>
          ) : (
            <>
              <input name="promotionalPrice" type="hidden" value="" />
              <input name="promotionalCycles" type="hidden" value="" />
            </>
          )}

          <div className="option-card sm:col-span-2">
            <label className="option-card__toggle">
              <input
                checked={adjustment}
                onChange={(event) => setAdjustment(event.target.checked)}
                type="checkbox"
              />
              <span>
                <strong>Lembrete de reajuste</strong>
                <small>Coloca a revisão do preço no radar de alertas.</small>
              </span>
            </label>
            {adjustment ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <IntegerField
                  defaultValue={adjustmentInterval}
                  error={errors.adjustmentIntervalMonths}
                  label="A cada quantos meses"
                  max={60}
                  min={1}
                  name="adjustmentIntervalMonths"
                  onValueChange={setAdjustmentInterval}
                />
                <PercentField
                  defaultValue={adjustmentRate}
                  label="Sugestão de reajuste (%)"
                  name="adjustmentRate"
                  onCanonicalChange={setAdjustmentRate}
                />
              </div>
            ) : (
              <>
                <input name="adjustmentIntervalMonths" type="hidden" value="" />
                <input name="adjustmentRate" type="hidden" value="" />
              </>
            )}
          </div>

          <MoneyField
            defaultValue={service ? service.mediaBudget : ""}
            label="Verba de mídia"
            name="mediaBudget"
            optional
            hint="Dinheiro do cliente que só passa por você para ser investido em anúncios. Fica separado da sua receita nos relatórios."
          />
          <MoneyField
            defaultValue={service?.additionalFee ?? ""}
            label="Custo adicional"
            name="additionalFee"
            optional
            hint="Valor extra cobrado junto do serviço. Diga ao lado se ele é seu ou se é só repasse — é isso que define se entra na sua receita."
            onCentsChange={setAdditionalFeeCents}
          />
          {centsToNumber(additionalFeeCents) > 0 ? (
            <SelectField
              label="O adicional é"
              name="additionalFeeNature"
              onValueChange={setAdditionalNature}
              options={additionalNatureOptions}
              value={additionalNature}
            />
          ) : (
            <input name="additionalFeeNature" type="hidden" value="revenue" />
          )}
          <label className="field sm:col-span-2">
            <span className="field__label">
              Descrição <span className="field__optional">opcional</span>
            </span>
            <textarea
              maxLength={3000}
              name="description"
              onChange={(event) => setDescription(event.target.value)}
              value={description}
            />
            <FieldError message={errors.description} />
          </label>
          <label className="field sm:col-span-2">
            <span className="field__label">
              Observações <span className="field__optional">opcional</span>
            </span>
            <textarea defaultValue={service?.notes ?? ""} maxLength={5000} name="notes" />
          </label>
        </div>
      </details>

      <div className="mt-4 flex flex-wrap gap-3">
        {onCancel ? (
          <button className="modal-cancel" onClick={onCancel} type="button">
            Cancelar
          </button>
        ) : null}
        <SubmitButton idleLabel={editing ? "Salvar alterações" : "Aplicar serviço"} />
      </div>
    </form>
  );
}
