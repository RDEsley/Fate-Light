import { tool } from "ai";
import { z } from "zod";

import { centsToCanonical, centsToDisplay, persistedToCents } from "@/features/mvp/money";
import { formatDatePtBr } from "@/features/mvp/format";

import { AGENT_MAX_REMINDERS, type AssistantToolName } from "./config";
import type { AssistantReader, AssistantWriter, OverdueCharge } from "./data";
import { AssistantToolError } from "./errors";
import { asUntrustedData } from "./untrusted";

export const overdueInputSchema = z.strictObject({
  maisDeDias: z
    .number()
    .int()
    .min(0)
    .max(3650)
    .describe("Só cobranças com mais que este número de dias de atraso. 0 traz todas."),
});

export const monthInputSchema = z.strictObject({
  mes: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .describe("Mês no formato AAAA-MM."),
});

export const reminderInputSchema = z.strictObject({
  cobrancaIds: z
    .array(z.uuid())
    .min(1)
    .max(AGENT_MAX_REMINDERS)
    .describe("Ids das cobranças vencidas retornados por listarClientesEmAtraso."),
});

function groupByClient(charges: OverdueCharge[]) {
  const groups = new Map<string, OverdueCharge[]>();
  for (const charge of charges) {
    groups.set(charge.cliente, [...(groups.get(charge.cliente) ?? []), charge]);
  }
  return [...groups].map(([cliente, cobrancas]) => ({
    cliente,
    cobrancas: cobrancas.map(({ descricao, diasAtraso, id, valor, vencimento }) => ({
      descricao,
      diasAtraso,
      id,
      valor,
      vencimento,
    })),
    totalDevido: centsToCanonical(
      cobrancas.reduce((sum, charge) => sum + (persistedToCents(charge.valor) ?? 0), 0),
    ),
  }));
}

export type ToolRun = {
  args: Record<string, number | string>;
  status: "approval" | "error" | "ok";
  tool: AssistantToolName;
};
export type ToolObserver = (run: ToolRun) => void;

export function createAssistantTools(
  reader: AssistantReader,
  writer: AssistantWriter,
  observe: ToolObserver = () => undefined,
) {
  const observed = async <T>(
    name: AssistantToolName,
    args: ToolRun["args"],
    run: () => Promise<T>,
  ) => {
    try {
      const result = await run();
      observe({ args, status: "ok", tool: name });
      return result;
    } catch {
      observe({ args, status: "error", tool: name });
      throw new AssistantToolError();
    }
  };

  return {
    criarLembreteCobranca: tool({
      description:
        "Propõe lembretes internos de cobrança. Só executa depois que a pessoa aprova na tela.",
      execute: ({ cobrancaIds }) =>
        observed("criarLembreteCobranca", { quantidade: cobrancaIds.length }, async () =>
          asUntrustedData(await writer.createReminders([...new Set(cobrancaIds)])),
        ),
      inputSchema: reminderInputSchema,
    }),
    listarClientesEmAtraso: tool({
      description: "Lista, somente leitura, clientes com cobranças vencidas e não pagas.",
      execute: ({ maisDeDias }) =>
        observed("listarClientesEmAtraso", { maisDeDias }, async () => {
          const charges = await reader.listOverdue(maisDeDias);
          return asUntrustedData({
            clientes: groupByClient(charges),
            totalCobrancas: charges.length,
          });
        }),
      inputSchema: overdueInputSchema,
    }),
    resumirMes: tool({
      description: "Resume, somente leitura, recebido, pendente e vencido de um mês.",
      execute: ({ mes }) =>
        observed("resumirMes", { mes }, async () =>
          asUntrustedData(await reader.monthSummary(mes)),
        ),
      inputSchema: monthInputSchema,
    }),
  };
}

export type AssistantTools = ReturnType<typeof createAssistantTools>;

/** Resumo calculado no servidor: o cartão mostra o que será feito, não o texto do modelo. */
export function describeReminderApproval(charges: OverdueCharge[]) {
  return charges
    .map(
      (charge) =>
        `${charge.cliente}: ${centsToDisplay(persistedToCents(charge.valor))}, venceu em ${formatDatePtBr(charge.vencimento)} (${charge.diasAtraso} dias)`,
    )
    .join("\n");
}

/** Aprovação obrigatória, reavaliada a cada passo: cobrança já paga deixa de ser aprovável. */
export function createToolApproval(
  reader: AssistantReader,
  secret: string | undefined,
  observe: ToolObserver = () => undefined,
) {
  return {
    criarLembreteCobranca: async ({ cobrancaIds }: z.infer<typeof reminderInputSchema>) => {
      observe({
        args: { quantidade: cobrancaIds.length },
        status: "approval",
        tool: "criarLembreteCobranca",
      });
      if (!secret) {
        return { reason: "Confirmação segura não configurada.", type: "denied" as const };
      }
      const charges = await reader.describeCharges([...new Set(cobrancaIds)]);
      if (!charges.length) {
        return { reason: "Nenhuma cobrança vencida encontrada.", type: "denied" as const };
      }
      return { reason: describeReminderApproval(charges), type: "user-approval" as const };
    },
  };
}
