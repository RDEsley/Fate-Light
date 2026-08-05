export const billingFrequencyValues = [
  "single",
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "bimonthly",
  "quarterly",
  "semiannual",
  "annual",
] as const;

export const billingFrequencies = [
  ["single", "Uma única vez"],
  ["daily", "Todos os dias"],
  ["weekly", "Toda semana"],
  ["biweekly", "A cada 2 semanas"],
  ["monthly", "Todo mês"],
  ["bimonthly", "A cada 2 meses"],
  ["quarterly", "A cada 3 meses"],
  ["semiannual", "A cada 6 meses"],
  ["annual", "Todo ano"],
] as const;

export type BillingFrequency = (typeof billingFrequencies)[number][0];

export function billingFrequencyLabel(value: string) {
  return billingFrequencies.find(([frequency]) => frequency === value)?.[1] ?? "Personalizada";
}

export function addBillingPeriod(date: string, frequency: BillingFrequency, steps = 1) {
  const value = new Date(`${date}T00:00:00.000Z`);
  const dayOffsets: Partial<Record<BillingFrequency, number>> = {
    daily: 1,
    weekly: 7,
    biweekly: 14,
  };
  const monthOffsets: Partial<Record<BillingFrequency, number>> = {
    monthly: 1,
    bimonthly: 2,
    quarterly: 3,
    semiannual: 6,
    annual: 12,
  };
  const dayOffset = dayOffsets[frequency];
  if (dayOffset) {
    value.setUTCDate(value.getUTCDate() + dayOffset * steps);
    return value.toISOString().slice(0, 10);
  }
  const monthOffset = monthOffsets[frequency] ?? 1;
  const originalDay = value.getUTCDate();
  value.setUTCDate(1);
  value.setUTCMonth(value.getUTCMonth() + monthOffset * steps);
  const lastDay = new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0),
  ).getUTCDate();
  value.setUTCDate(Math.min(originalDay, lastDay));
  return value.toISOString().slice(0, 10);
}
