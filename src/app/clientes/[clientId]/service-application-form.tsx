"use client";

import { useActionState, useState } from "react";

import { applyServiceToClient, editClientService } from "@/app/_actions/client-services";
import { FormActions, FormSection, TextField, ToggleCard } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { DateField, EntitySelect, type ClientEntityOption } from "@/components/ui/form-controls";
import { FormMore } from "@/components/ui/form-panel";
import { Icon } from "@/components/ui/icon";
import { IntegerField } from "@/components/ui/integer-field";
import { MoneyField } from "@/components/ui/money-field";
import { PercentField } from "@/components/ui/percent-field";
import { SelectField } from "@/components/ui/select-field";
import { persistedToCents } from "@/features/mvp/money";
import { formatCurrency, formatPercent } from "@/features/mvp/format";
import { billingFrequencies, type BillingFrequency } from "@/features/mvp/recurrence";
import { initialActionState, submittedValues } from "@/lib/forms/action-state";

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

const billingOptions = billingFrequencies.map(([value, label]) => ({
  label,
  value,
}));

const discountOptions = [
  { description: "Cobra o valor cheio", label: "Sem desconto", value: "none" },
  {
    description: "Abate uma porcentagem do valor cheio",
    label: "Percentual",
    value: "percentage",
  },
  {
    description: "Abate um valor em reais",
    label: "Valor fixo",
    value: "fixed",
  },
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

/**
 * Regras entre campos que o servidor também confere. Repetidas aqui para a recusa
 * aparecer no campo certo antes de qualquer ida ao servidor.
 */
function validateService(formData: FormData) {
  const errors: Record<string, string> = {};
  const startDate = String(formData.get("startDate") ?? "");
  const nextDueDate = String(formData.get("nextDueDate") ?? "");
  if (startDate && nextDueDate && nextDueDate < startDate) {
    errors.nextDueDate = "O vencimento não pode ser anterior ao início do serviço.";
  }
  const listPrice = Number(formData.get("listPrice") || 0);
  const discountValue = Number(formData.get("discountValue") || 0);
  if (formData.get("discountType") === "fixed" && discountValue > listPrice) {
    errors.discountValue = "O desconto não pode ser maior que o valor cheio.";
  }
  return errors;
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
  const sent = submittedValues(state);

  const [name, setName] = useState(service?.name ?? "");
  // Escolher um item do catálogo remonta os campos que guardam o próprio valor.
  const [presetKey, setPresetKey] = useState(0);
  const [listPriceDefault, setListPriceDefault] = useState<number | string | null>(
    service?.listPrice ?? null,
  );
  const [listPriceCents, setListPriceCents] = useState<number | null>(
    persistedToCents(service?.listPrice ?? null),
  );
  const [description, setDescription] = useState(service?.description ?? "");
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
  const [mediaBudgetCents, setMediaBudgetCents] = useState<number | null>(
    persistedToCents(service?.mediaBudget ?? null),
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

  const single = billingType === "single";
  const price = centsToNumber(listPriceCents);
  const finalPrice = Math.max(
    0,
    discountType === "percentage"
      ? price * (1 - discountValue / 100)
      : discountType === "fixed"
        ? price - discountValue
        : price,
  );
  const cycles = Number(promotionalCycles) || 0;
  const promoValue = centsToNumber(promotionalPriceCents);
  const promoActive = !single && promotion && promotionalPriceCents !== null && cycles > 0;
  const previewOwnRevenue = promoActive ? promoValue : finalPrice;
  const additionalFee = centsToNumber(additionalFeeCents);
  // Só o adicional declarado como receita entra no que você recebe (ADR-0018).
  const additionalRevenue = additionalNature === "passthrough" ? 0 : additionalFee;
  const mediaBudget = centsToNumber(mediaBudgetCents);
  const hasEntities = !editing && entities.some((entity) => entity.clientId === clientId);
  const catalogMatch = catalog.find(
    (item) => item.name.toLocaleLowerCase("pt-BR") === name.trim().toLocaleLowerCase("pt-BR"),
  );

  // O que está ligado dentro de "Personalizar" aparece aqui em cima: o bloco fica
  // recolhido, e um ajuste herdado do catálogo não pode passar sem ser visto.
  const adjustments = [
    discountType === "percentage" && discountValue > 0
      ? `Desconto de ${formatPercent(discountValue)}`
      : null,
    discountType === "fixed" && discountValue > 0
      ? `Desconto de ${formatCurrency(discountValue)}`
      : null,
    promoActive
      ? `${promoValue === 0 ? "Grátis" : formatCurrency(promoValue)} nas ${cycles} primeira${cycles === 1 ? "" : "s"}`
      : null,
    adjustment ? `Reajuste a cada ${adjustmentInterval || "?"} meses` : null,
    mediaBudget > 0 ? `Mídia ${formatCurrency(mediaBudget)}` : null,
    additionalFee > 0 && additionalNature === "passthrough"
      ? `Repasse ${formatCurrency(additionalFee)}`
      : null,
  ].filter((entry): entry is string => Boolean(entry));

  const chooseCatalogService = (id: string) => {
    const chosen = catalog.find((item) => item.id === id);
    if (!chosen) return;
    setName(chosen.name);
    setDescription(chosen.description ?? "");
    setListPriceDefault(chosen.defaultPrice);
    setListPriceCents(persistedToCents(chosen.defaultPrice));
    setBillingType(chosen.billingType);
    setAdjustment(Boolean(chosen.adjustmentIntervalMonths));
    setAdjustmentInterval(String(chosen.adjustmentIntervalMonths ?? 6));
    setAdjustmentRate(chosen.adjustmentRate === null ? "" : String(chosen.adjustmentRate));
    setPresetKey((key) => key + 1);
  };

  const catalogNote =
    editing || name.trim().length < 2
      ? undefined
      : catalogMatch
        ? `Já existe no catálogo. O valor daqui vale só para este cliente.`
        : `Será salvo no catálogo para reutilizar em outros clientes.`;

  return (
    <Form action={formAction} className="grid gap-4" state={state} validate={validateService}>
      <input name="clientId" type="hidden" value={clientId} />
      {service ? <input name="id" type="hidden" value={service.id} /> : null}

      <div className="form-grid sm:grid-cols-2 xl:grid-cols-12">
        {/* A edição não mexe na entidade: `update_client_service` não reassocia o vínculo,
            e trocá-lo aqui deixaria as cobranças já geradas apontando para outro lugar. */}
        {editing ? null : (
          <EntitySelect
            className="sm:col-span-2 xl:col-span-4"
            clientId={clientId}
            defaultValue={defaultEntityId}
            entities={entities}
          />
        )}
        {editing ? (
          <input name="serviceId" type="hidden" value="" />
        ) : (
          <SelectField
            className={hasEntities ? "xl:col-span-4" : "xl:col-span-5"}
            defaultValue=""
            hint="Escolha um item do catálogo para preencher nome, valor e periodicidade. Você ainda pode ajustar tudo para este cliente."
            label="Partir do catálogo"
            name="serviceId"
            onValueChange={chooseCatalogService}
            optional
            options={[
              {
                description: "Preencho tudo do zero",
                label: "Serviço personalizado",
                value: "",
              },
              ...catalog.map((item) => ({
                description: formatCurrency(item.defaultPrice),
                label: item.name,
                value: item.id,
              })),
            ]}
            placeholder="Serviço personalizado"
          />
        )}
        <TextField
          className={
            editing
              ? "sm:col-span-2 xl:col-span-12"
              : hasEntities
                ? "xl:col-span-4"
                : "xl:col-span-7"
          }
          help={catalogNote}
          label="Nome exibido no cliente"
          maxLength={120}
          minLength={2}
          name="name"
          onValueChange={setName}
          placeholder="Ex.: Gestão de Google Ads"
          required
          value={name}
        />
        <MoneyField
          className={editing ? "sm:col-span-2 xl:col-span-4" : "xl:col-span-3"}
          defaultValue={listPriceDefault}
          hint="O preço sem desconto. É a referência para promoções e reajustes. Use R$ 0,00 para um serviço sem cobrança."
          key={`list-price-${presetKey}`}
          label="Valor cheio"
          name="listPrice"
          onCentsChange={setListPriceCents}
          required
        />
        <SelectField
          className={editing ? "xl:col-span-4" : "xl:col-span-3"}
          label="Periodicidade"
          name="billingType"
          onValueChange={(value) => setBillingType(value as BillingFrequency)}
          options={billingOptions}
          value={billingType}
        />
        {/* Início e parcelas valem só na criação: a RPC de edição não os altera, então
            mostrá-los editáveis ali prometeria uma mudança que não acontece. */}
        {editing ? (
          <input name="startDate" type="hidden" value={service?.startDate ?? ""} />
        ) : (
          <DateField
            className="xl:col-span-3"
            hint="Quando o trabalho começa. O primeiro vencimento não pode ser anterior a esta data."
            label="Início do serviço"
            name="startDate"
            required
          />
        )}
        <DateField
          className={editing ? "xl:col-span-4" : "xl:col-span-3"}
          defaultValue={service?.nextDueDate ?? undefined}
          label={editing ? "Próximo vencimento" : "Primeiro vencimento"}
          name="nextDueDate"
          required
        />
      </div>

      <div aria-live="polite" className="price-summary">
        <div className="min-w-0">
          <span className="price-summary__label">
            <Icon className="size-4" name="receipt" />
            {additionalRevenue > 0 ? "A receber por cobrança" : "Valor por cobrança"}
          </span>
          <span className="price-summary__note">
            {additionalRevenue > 0
              ? `${formatCurrency(previewOwnRevenue)} do serviço + ${formatCurrency(additionalRevenue)} de adicional`
              : editing
                ? "Cobranças pendentes acompanham o novo valor."
                : "A primeira cobrança é criada automaticamente."}
          </span>
          {adjustments.length ? (
            <span className="price-summary__tags">
              {adjustments.map((entry) => (
                <span key={entry}>{entry}</span>
              ))}
            </span>
          ) : null}
        </div>
        <strong className="price-summary__value">
          {formatCurrency(previewOwnRevenue + additionalRevenue)}
        </strong>
      </div>

      <FormMore
        defaultOpen={editing}
        description="Desconto, parcelas, promoção, reajuste e repasses"
        icon="palette"
        title="Personalizar preço e agenda"
      >
        <FormSection title="Desconto e parcelas">
          <div className={`form-grid sm:grid-cols-2 ${single && !editing ? "lg:grid-cols-3" : ""}`}>
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
              <div className="field">
                <div className="field__head">
                  <span className="field__label">Valor do desconto</span>
                </div>
                <input aria-label="Valor do desconto" disabled placeholder="Sem desconto" />
                <input name="discountValue" type="hidden" value="0" />
              </div>
            ) : discountType === "percentage" ? (
              <PercentField
                defaultValue={service?.discountType === "percentage" ? service.discountValue : ""}
                key="discount-percent"
                label="Desconto (%)"
                name="discountValue"
                onCanonicalChange={(value) => setDiscountValue(Number(value) || 0)}
                required
              />
            ) : (
              <MoneyField
                defaultValue={service?.discountType === "fixed" ? service.discountValue : ""}
                key="discount-money"
                label="Desconto (R$)"
                name="discountValue"
                onCentsChange={(cents) => setDiscountValue(centsToNumber(cents))}
                required
              />
            )}
            {single && !editing ? (
              <IntegerField
                className="sm:col-span-2 lg:col-span-1"
                defaultValue={1}
                hint="Divide a cobrança única em parcelas mensais a partir do primeiro vencimento."
                label="Quantidade de parcelas"
                max={120}
                min={1}
                name="installmentCount"
                required
              />
            ) : (
              <input name="installmentCount" type="hidden" value={service?.installmentCount ?? 1} />
            )}
          </div>
        </FormSection>

        <FormSection title="Promoção e reajuste">
          <div className={`form-grid ${single ? "" : "lg:grid-cols-2"}`}>
            {single ? null : (
              <ToggleCard
                checked={promotion}
                description="Outro valor nas primeiras cobranças. Pode ser zero."
                onCheckedChange={setPromotion}
                title="Preço promocional"
              >
                {promotion ? (
                  <>
                    <div className="form-grid sm:grid-cols-2">
                      <MoneyField
                        defaultValue={service?.promotionalPrice ?? ""}
                        label="Valor promocional"
                        name="promotionalPrice"
                        onCentsChange={setPromotionalPriceCents}
                        required
                      />
                      <IntegerField
                        defaultValue={promotionalCycles}
                        label="Quantidade de ciclos"
                        max={60}
                        min={1}
                        name="promotionalCycles"
                        onValueChange={setPromotionalCycles}
                        required
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
                ) : null}
              </ToggleCard>
            )}
            <ToggleCard
              checked={adjustment}
              description="Coloca a revisão do preço no radar de alertas."
              onCheckedChange={setAdjustment}
              title="Lembrete de reajuste"
            >
              {adjustment ? (
                <div className="form-grid sm:grid-cols-2">
                  <IntegerField
                    defaultValue={adjustmentInterval}
                    key={`adjustment-interval-${presetKey}`}
                    label="A cada quantos meses"
                    max={60}
                    min={1}
                    name="adjustmentIntervalMonths"
                    onValueChange={setAdjustmentInterval}
                    required
                  />
                  <PercentField
                    defaultValue={adjustmentRate}
                    key={`adjustment-rate-${presetKey}`}
                    label="Reajuste sugerido (%)"
                    name="adjustmentRate"
                    onCanonicalChange={setAdjustmentRate}
                    required
                  />
                </div>
              ) : null}
            </ToggleCard>
          </div>
          {single || !promotion ? (
            <>
              <input name="promotionalPrice" type="hidden" value="" />
              <input name="promotionalCycles" type="hidden" value="" />
            </>
          ) : null}
          {adjustment ? null : (
            <>
              <input name="adjustmentIntervalMonths" type="hidden" value="" />
              <input name="adjustmentRate" type="hidden" value="" />
            </>
          )}
        </FormSection>

        <FormSection title="Repasses">
          <div className={`form-grid sm:grid-cols-2 ${additionalFee > 0 ? "lg:grid-cols-3" : ""}`}>
            <MoneyField
              defaultValue={service ? service.mediaBudget : ""}
              hint="Dinheiro do cliente que só passa por você para ser investido em anúncios. Fica separado da sua receita nos relatórios."
              label="Verba de mídia"
              name="mediaBudget"
              onCentsChange={setMediaBudgetCents}
              optional
            />
            <MoneyField
              defaultValue={service?.additionalFee ?? ""}
              hint="Valor extra cobrado junto do serviço. Ao preencher, você escolhe se ele é seu ou repasse — é isso que define se entra na receita."
              label="Custo adicional"
              name="additionalFee"
              onCentsChange={setAdditionalFeeCents}
              optional
            />
            {additionalFee > 0 ? (
              <SelectField
                className="sm:col-span-2 lg:col-span-1"
                label="O adicional é"
                name="additionalFeeNature"
                onValueChange={setAdditionalNature}
                options={additionalNatureOptions}
                value={additionalNature}
              />
            ) : (
              <input name="additionalFeeNature" type="hidden" value="revenue" />
            )}
          </div>
        </FormSection>

        <FormSection title="Anotações">
          <div className="form-grid sm:grid-cols-2">
            <TextField
              hint="Aparece no cartão do serviço, na ficha do cliente."
              label="Descrição"
              maxLength={3000}
              multiline
              name="description"
              onValueChange={setDescription}
              optional
              value={description}
            />
            <TextField
              defaultValue={sent.text("notes", service?.notes ?? "")}
              hint="Anotação interna, só para você."
              label="Observações"
              maxLength={5000}
              multiline
              name="notes"
              optional
            />
          </div>
        </FormSection>
      </FormMore>

      <FormActions>
        {onCancel ? (
          <button className="button button--secondary" onClick={onCancel} type="button">
            Cancelar
          </button>
        ) : null}
        <SubmitButton idleLabel={editing ? "Salvar alterações" : "Aplicar serviço"} />
      </FormActions>
    </Form>
  );
}
