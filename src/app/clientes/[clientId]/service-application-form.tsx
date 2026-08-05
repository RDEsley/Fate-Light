"use client";

import { useState } from "react";

import { createClientService } from "@/app/_actions/mvp";
import { SubmitButton } from "@/app/_components/submit-button";
import { DateField } from "@/components/ui/form-controls";
import { Icon } from "@/components/ui/icon";
import { formatCurrency, isoToday } from "@/features/mvp/format";
import { billingFrequencies, type BillingFrequency } from "@/features/mvp/recurrence";

export type CatalogServiceOption = {
  adjustmentIntervalMonths: number | null;
  adjustmentRate: number | null;
  billingType: BillingFrequency;
  defaultPrice: number;
  description: string | null;
  id: string;
  name: string;
};

export function ServiceApplicationForm({
  catalog,
  clientId,
}: {
  catalog: CatalogServiceOption[];
  clientId: string;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [listPrice, setListPrice] = useState(0);
  const [billingType, setBillingType] = useState<BillingFrequency>("monthly");
  const [discountType, setDiscountType] = useState<"fixed" | "none" | "percentage">("none");
  const [discountValue, setDiscountValue] = useState(0);
  const [promotion, setPromotion] = useState(false);
  const [adjustment, setAdjustment] = useState(false);
  const [adjustmentInterval, setAdjustmentInterval] = useState(6);
  const [adjustmentRate, setAdjustmentRate] = useState(0);

  const finalPrice = Math.max(
    0,
    discountType === "percentage"
      ? listPrice * (1 - discountValue / 100)
      : discountType === "fixed"
        ? listPrice - discountValue
        : listPrice,
  );

  const chooseCatalogService = (id: string) => {
    const service = catalog.find((item) => item.id === id);
    if (!service) return;
    setName(service.name);
    setDescription(service.description ?? "");
    setListPrice(service.defaultPrice);
    setBillingType(service.billingType);
    setAdjustment(Boolean(service.adjustmentIntervalMonths));
    setAdjustmentInterval(service.adjustmentIntervalMonths ?? 6);
    setAdjustmentRate(service.adjustmentRate ?? 0);
  };

  return (
    <form action={createClientService} className="service-application-form">
      <input name="clientId" type="hidden" value={clientId} />
      <div className="form-grid sm:grid-cols-2 lg:grid-cols-4">
        <label className="field sm:col-span-2">
          <span className="field__label">Serviço do catálogo</span>
          <select name="serviceId" onChange={(event) => chooseCatalogService(event.target.value)}>
            <option value="">Serviço personalizado</option>
            {catalog.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} · {formatCurrency(service.defaultPrice)}
              </option>
            ))}
          </select>
        </label>
        <label className="field sm:col-span-2">
          <span className="field__label">Nome exibido no cliente</span>
          <input
            maxLength={120}
            name="name"
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Gestão de Google Ads"
            required
            value={name}
          />
        </label>
        <label className="field">
          <span className="field__label">Valor cheio</span>
          <input
            min="0"
            name="listPrice"
            onChange={(event) => setListPrice(Number(event.target.value))}
            required
            step="0.01"
            type="number"
            value={listPrice}
          />
        </label>
        <label className="field">
          <span className="field__label">Periodicidade</span>
          <select
            name="billingType"
            onChange={(event) => setBillingType(event.target.value as BillingFrequency)}
            value={billingType}
          >
            {billingFrequencies.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <DateField
          defaultValue={isoToday()}
          label="Primeiro vencimento"
          name="nextDueDate"
          required
        />
        <div className="service-price-preview">
          <span>Valor aplicado</span>
          <strong>{formatCurrency(finalPrice)}</strong>
          <small>Cobrança inicial criada automaticamente</small>
        </div>
      </div>

      <details className="advanced-form mt-3">
        <summary>
          <span className="flex items-center gap-2">
            <Icon className="size-4" name="settings" /> Personalizar preço e agenda
          </span>
          <span className="text-muted text-xs">Desconto, parcelas, promoção e reajuste</span>
        </summary>
        <div className="form-grid mt-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="field">
            <span className="field__label">Tipo de desconto</span>
            <select
              name="discountType"
              onChange={(event) =>
                setDiscountType(event.target.value as "fixed" | "none" | "percentage")
              }
              value={discountType}
            >
              <option value="none">Sem desconto</option>
              <option value="percentage">Percentual</option>
              <option value="fixed">Valor fixo</option>
            </select>
          </label>
          <label className="field">
            <span className="field__label">Desconto</span>
            <input
              disabled={discountType === "none"}
              max={discountType === "percentage" ? 100 : listPrice}
              min="0"
              name="discountValue"
              onChange={(event) => setDiscountValue(Number(event.target.value))}
              step="0.01"
              type="number"
              value={discountType === "none" ? 0 : discountValue}
            />
          </label>
          {billingType === "single" ? (
            <label className="field">
              <span className="field__label">Quantidade de parcelas</span>
              <input defaultValue="1" max="120" min="1" name="installmentCount" type="number" />
            </label>
          ) : (
            <input name="installmentCount" type="hidden" value="1" />
          )}
          <DateField
            defaultValue={isoToday()}
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
                  <small>Use outro valor nos primeiros ciclos.</small>
                </span>
              </label>
              {promotion ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="field">
                    <span className="field__label">Valor promocional</span>
                    <input min="0" name="promotionalPrice" required step="0.01" type="number" />
                  </label>
                  <label className="field">
                    <span className="field__label">Quantidade de ciclos</span>
                    <input max="60" min="1" name="promotionalCycles" required type="number" />
                  </label>
                </div>
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
                <small>Coloca a revisão do preço no radar.</small>
              </span>
            </label>
            {adjustment ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="field">
                  <span className="field__label">A cada quantos meses</span>
                  <input
                    max="60"
                    min="1"
                    name="adjustmentIntervalMonths"
                    onChange={(event) => setAdjustmentInterval(Number(event.target.value))}
                    required
                    type="number"
                    value={adjustmentInterval}
                  />
                </label>
                <label className="field">
                  <span className="field__label">Sugestão de reajuste (%)</span>
                  <input
                    max="100"
                    min="0"
                    name="adjustmentRate"
                    onChange={(event) => setAdjustmentRate(Number(event.target.value))}
                    required
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
            <span className="field__label">Verba de mídia</span>
            <input defaultValue="0" min="0" name="mediaBudget" required step="0.01" type="number" />
          </label>
          <label className="field">
            <span className="field__label">Custo adicional</span>
            <input
              defaultValue="0"
              min="0"
              name="additionalFee"
              required
              step="0.01"
              type="number"
            />
          </label>
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
          </label>
          <label className="field sm:col-span-2 lg:col-span-4">
            <span className="field__label">
              Observações <span className="field__optional">opcional</span>
            </span>
            <textarea maxLength={5000} name="notes" />
          </label>
        </div>
      </details>

      <div className="mt-3 flex justify-end">
        <SubmitButton idleLabel="Aplicar serviço e criar cobrança" pendingLabel="Aplicando…" />
      </div>
    </form>
  );
}
