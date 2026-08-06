"use client";

import { useActionState, useState } from "react";

import { applyServiceToClient, editClientService } from "@/app/_actions/client-services";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { FieldError } from "@/components/ui/field-error";
import { FieldHint } from "@/components/ui/field-hint";
import { DateField } from "@/components/ui/form-controls";
import { Icon } from "@/components/ui/icon";
import { SelectField } from "@/components/ui/select-field";
import { SoftSubmitButton } from "@/components/ui/soft-submit-button";
import { formatCurrency, isoToday } from "@/features/mvp/format";
import { billingFrequencies, type BillingFrequency } from "@/features/mvp/recurrence";
import { initialActionState } from "@/lib/forms/action-state";

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

/** Converte número para texto de campo sem transformar ausência de valor em zero. */
function moneyText(value: number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

export function ServiceApplicationForm({
  catalog,
  clientId,
  onCancel,
  service,
}: {
  catalog: CatalogServiceOption[];
  clientId: string;
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
  const [listPrice, setListPrice] = useState(moneyText(service?.listPrice));
  const [billingType, setBillingType] = useState<BillingFrequency>(
    service?.billingType ?? "monthly",
  );
  const [discountType, setDiscountType] = useState<"fixed" | "none" | "percentage">(
    service?.discountType ?? "none",
  );
  const [discountValue, setDiscountValue] = useState(
    service?.discountValue ? String(service.discountValue) : "",
  );
  const [promotion, setPromotion] = useState(service?.promotionalPrice !== null && editing);
  const [promotionalPrice, setPromotionalPrice] = useState(moneyText(service?.promotionalPrice));
  const [promotionalCycles, setPromotionalCycles] = useState(
    service?.promotionalCycles ? String(service.promotionalCycles) : "",
  );
  const [additionalFee, setAdditionalFee] = useState(moneyText(service?.additionalFee));
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

  const price = Number(listPrice) || 0;
  const discount = Number(discountValue) || 0;
  const finalPrice = Math.max(
    0,
    discountType === "percentage"
      ? price * (1 - discount / 100)
      : discountType === "fixed"
        ? price - discount
        : price,
  );
  const cycles = Number(promotionalCycles) || 0;
  const promoValue = Number(promotionalPrice) || 0;
  // Só o adicional declarado como receita entra no que você recebe (ADR-0018).
  const additionalRevenue = additionalNature === "passthrough" ? 0 : Number(additionalFee) || 0;
  const catalogMatch = catalog.find(
    (item) => item.name.toLocaleLowerCase("pt-BR") === name.trim().toLocaleLowerCase("pt-BR"),
  );

  const chooseCatalogService = (id: string) => {
    const chosen = catalog.find((item) => item.id === id);
    if (!chosen) return;
    setName(chosen.name);
    setDescription(chosen.description ?? "");
    setListPrice(String(chosen.defaultPrice));
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
        <label className="field">
          <span className="field__label">
            Valor cheio
            <FieldHint>
              O preço sem desconto. É a referência para promoções, reajustes e para você lembrar
              quanto o serviço realmente vale.
            </FieldHint>
          </span>
          <input
            aria-invalid={Boolean(errors.listPrice)}
            min="0"
            name="listPrice"
            onChange={(event) => setListPrice(event.target.value)}
            placeholder="Ex.: 1500,00"
            step="0.01"
            type="number"
            value={listPrice}
          />
          <FieldError message={errors.listPrice} />
        </label>
        <SelectField
          label="Periodicidade"
          name="billingType"
          onValueChange={(value) => setBillingType(value as BillingFrequency)}
          options={billingOptions}
          value={billingType}
        />
        <DateField
          defaultValue={service?.nextDueDate ?? isoToday()}
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
            onValueChange={(value) => setDiscountType(value as "fixed" | "none" | "percentage")}
            options={discountOptions}
            value={discountType}
          />
          <label className="field">
            <span className="field__label">
              Desconto {discountType === "percentage" ? "(%)" : "(R$)"}
            </span>
            <input
              aria-invalid={Boolean(errors.discountValue)}
              disabled={discountType === "none"}
              max={discountType === "percentage" ? 100 : undefined}
              min="0"
              name="discountValue"
              onChange={(event) => setDiscountValue(event.target.value)}
              placeholder={discountType === "percentage" ? "Ex.: 10" : "Ex.: 150,00"}
              step="0.01"
              type="number"
              value={discountType === "none" ? "" : discountValue}
            />
            <FieldError message={errors.discountValue} />
          </label>
          {billingType === "single" ? (
            <label className="field">
              <span className="field__label">
                Quantidade de parcelas
                <FieldHint>
                  Divide o valor em cobranças mensais consecutivas a partir do primeiro vencimento.
                </FieldHint>
              </span>
              <input
                defaultValue={service?.installmentCount ?? 1}
                max="120"
                min="1"
                name="installmentCount"
                type="number"
              />
              <FieldError message={errors.installmentCount} />
            </label>
          ) : (
            <input name="installmentCount" type="hidden" value="1" />
          )}
          <DateField
            defaultValue={service?.startDate ?? isoToday()}
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
                    <label className="field">
                      <span className="field__label">Valor promocional</span>
                      <input
                        aria-invalid={Boolean(errors.promotionalPrice)}
                        min="0"
                        name="promotionalPrice"
                        onChange={(event) => setPromotionalPrice(event.target.value)}
                        placeholder="Ex.: 0,00"
                        step="0.01"
                        type="number"
                        value={promotionalPrice}
                      />
                      <FieldError message={errors.promotionalPrice} />
                    </label>
                    <label className="field">
                      <span className="field__label">
                        Quantidade de ciclos
                        <FieldHint>
                          Quantas cobranças saem com o valor promocional. A contagem começa no
                          primeiro vencimento, não na data de início do serviço.
                        </FieldHint>
                      </span>
                      <input
                        aria-invalid={Boolean(errors.promotionalCycles)}
                        max="60"
                        min="1"
                        name="promotionalCycles"
                        onChange={(event) => setPromotionalCycles(event.target.value)}
                        placeholder="Ex.: 3"
                        type="number"
                        value={promotionalCycles}
                      />
                      <FieldError message={errors.promotionalCycles} />
                    </label>
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
                <label className="field">
                  <span className="field__label">A cada quantos meses</span>
                  <input
                    aria-invalid={Boolean(errors.adjustmentIntervalMonths)}
                    max="60"
                    min="1"
                    name="adjustmentIntervalMonths"
                    onChange={(event) => setAdjustmentInterval(event.target.value)}
                    placeholder="Ex.: 12"
                    type="number"
                    value={adjustmentInterval}
                  />
                  <FieldError message={errors.adjustmentIntervalMonths} />
                </label>
                <label className="field">
                  <span className="field__label">Sugestão de reajuste (%)</span>
                  <input
                    max="100"
                    min="0"
                    name="adjustmentRate"
                    onChange={(event) => setAdjustmentRate(event.target.value)}
                    placeholder="Ex.: 8"
                    step="0.01"
                    type="number"
                    value={adjustmentRate}
                  />
                </label>
              </div>
            ) : (
              <>
                <input name="adjustmentIntervalMonths" type="hidden" value="" />
                <input name="adjustmentRate" type="hidden" value="" />
              </>
            )}
          </div>

          <label className="field">
            <span className="field__label">
              Verba de mídia <span className="field__optional">opcional</span>
              <FieldHint>
                Dinheiro do cliente que só passa por você para ser investido em anúncios. Fica
                separado da sua receita nos relatórios.
              </FieldHint>
            </span>
            <input
              defaultValue={service ? moneyText(service.mediaBudget) : ""}
              min="0"
              name="mediaBudget"
              placeholder="Ex.: 800,00"
              step="0.01"
              type="number"
            />
          </label>
          <label className="field">
            <span className="field__label">
              Custo adicional <span className="field__optional">opcional</span>
              <FieldHint>
                Valor extra cobrado junto do serviço. Diga ao lado se ele é seu ou se é só repasse —
                é isso que define se entra na sua receita.
              </FieldHint>
            </span>
            <input
              min="0"
              name="additionalFee"
              onChange={(event) => setAdditionalFee(event.target.value)}
              placeholder="Ex.: 120,00"
              step="0.01"
              type="number"
              value={additionalFee}
            />
          </label>
          {Number(additionalFee) > 0 ? (
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
              placeholder="O que está incluso neste serviço"
              value={description}
            />
          </label>
          <label className="field sm:col-span-2 lg:col-span-4">
            <span className="field__label">
              Observações <span className="field__optional">opcional</span>
            </span>
            <textarea
              defaultValue={service?.notes ?? ""}
              maxLength={5000}
              name="notes"
              placeholder="Combinados internos sobre este serviço"
            />
          </label>
        </div>
      </details>

      <div className="mt-4 flex flex-wrap items-end justify-end gap-3">
        {onCancel ? (
          <button className="modal-cancel" onClick={onCancel} type="button">
            Cancelar
          </button>
        ) : null}
        <SoftSubmitButton
          idleLabel={editing ? "Salvar alterações" : "Aplicar serviço e criar cobrança"}
          pendingLabel={editing ? "Salvando…" : "Aplicando…"}
          requirements={[
            { message: "Dê um nome ao serviço para reconhecê-lo depois.", name: "name" },
            {
              message: "O valor cheio está zerado. Confirme se o serviço é mesmo gratuito.",
              name: "listPrice",
              warnOnZero: true,
            },
          ]}
        />
      </div>
    </form>
  );
}
