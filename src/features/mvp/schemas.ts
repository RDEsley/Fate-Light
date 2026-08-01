import { z } from "zod";

const money = z.coerce.number().finite().min(0).max(9_999_999_999_999.99);
const optionalText = (maximum: number) => z.string().trim().max(maximum);
const optionalMoney = z.union([z.literal(""), money]);

export const identifierSchema = z.string().uuid();

export const clientServiceSchema = z
  .object({
    additionalFee: money,
    billingType: z.enum(["single", "monthly"]),
    companyRevenue: money,
    description: optionalText(3000),
    mediaBudget: money,
    name: z.string().trim().min(2).max(120),
    nextDueDate: z.string().date(),
    notes: optionalText(5000),
    startDate: z.string().date(),
  })
  .refine((value) => value.nextDueDate >= value.startDate, { path: ["nextDueDate"] });

export const chargeSchema = z
  .object({
    additionalFee: money,
    clientId: identifierSchema,
    clientServiceId: z.union([z.literal(""), identifierSchema]),
    companyRevenue: money,
    description: z.string().trim().min(2).max(200),
    dueDate: z.string().date(),
    mediaBudget: money,
    notes: optionalText(5000),
  })
  .refine((value) => value.companyRevenue + value.mediaBudget + value.additionalFee > 0, {
    path: ["companyRevenue"],
  });

export const expenseSchema = z.object({
  amount: money.refine((value) => value > 0),
  category: z.enum([
    "tools",
    "artificial_intelligence",
    "agents",
    "staff_contractors",
    "domains",
    "hosting",
    "software",
    "marketing",
    "other",
  ]),
  clientId: z.union([z.literal(""), identifierSchema]),
  description: z.string().trim().min(2).max(200),
  dueDate: z.string().date(),
  expenseType: z.enum(["fixed", "variable"]),
  notes: optionalText(5000),
  status: z.enum(["pending", "paid"]),
});

export const domainSchema = z.object({
  autoRenew: z.boolean(),
  clientId: identifierSchema,
  cost: optionalMoney,
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .transform((value) => value.replace(/^https?:\/\//, "").split("/")[0] ?? "")
    .pipe(z.string().regex(/^[a-z0-9]([a-z0-9.-]{1,251}[a-z0-9])?$/)),
  expiresOn: z.string().date(),
  notes: optionalText(5000),
  paymentResponsibility: z.string().trim().min(2).max(120),
  registrar: optionalText(120),
});

export const paymentSchema = z.object({
  id: identifierSchema,
  paymentMethod: z.string().trim().min(2).max(80),
});

export function optional(value: string) {
  return value || null;
}
