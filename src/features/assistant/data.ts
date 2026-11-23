import type { SupabaseClient } from "@supabase/supabase-js";

import { addDays, daysBetween } from "@/features/mvp/format";
import { centsToCanonical, persistedToCents } from "@/features/mvp/money";
import type { Database } from "@/types/database.generated";

import { AssistantToolError } from "./errors";
import { cleanText } from "./untrusted";

export type OverdueCharge = {
  cliente: string;
  descricao: string;
  diasAtraso: number;
  id: string;
  valor: string;
  vencimento: string;
};

export type MonthSummary = {
  mes: string;
  pendente: { quantidade: number; total: string };
  recebido: { quantidade: number; total: string };
  vencido: { quantidade: number; total: string };
};

export type ReminderResult = {
  criados: string[];
  jaExistiam: string[];
  naoElegiveis: number;
  simulado: boolean;
};

/** Tudo que as tools podem ler. Não há método genérico de consulta nem de escrita. */
export type AssistantReader = {
  describeCharges(ids: string[]): Promise<OverdueCharge[]>;
  listOverdue(moreThanDays: number): Promise<OverdueCharge[]>;
  monthSummary(month: string): Promise<MonthSummary>;
};

export type AssistantWriter = {
  createReminders(ids: string[]): Promise<ReminderResult>;
};

type Scope = { supabase: SupabaseClient<Database>; today: string; workspaceId: string };

// Lista fechada de colunas: documento, contato e observações nunca chegam ao modelo.
const chargeColumns = "id, description, due_date, gross_total, clients(name)";
const money = (value: number | string | null) => centsToCanonical(persistedToCents(value) ?? 0);

function lastDayOfMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const nextMonth =
    monthNumber === 12 ? `${year + 1}-01` : `${year}-${String(monthNumber + 1).padStart(2, "0")}`;
  return addDays(`${nextMonth}-01`, -1);
}

export function createAssistantReader({ supabase, today, workspaceId }: Scope): AssistantReader {
  const toOverdue = (row: {
    clients: { name: string } | null;
    description: string;
    due_date: string;
    gross_total: number | null;
    id: string;
  }): OverdueCharge => ({
    cliente: cleanText(row.clients?.name),
    descricao: cleanText(row.description),
    diasAtraso: daysBetween(row.due_date, today),
    id: row.id,
    valor: money(row.gross_total),
    vencimento: row.due_date,
  });

  const overdueQuery = () =>
    supabase
      .from("charges")
      .select(chargeColumns)
      .eq("workspace_id", workspaceId)
      .eq("status", "pending");

  return {
    async describeCharges(ids) {
      const { data, error } = await overdueQuery().lt("due_date", today).in("id", ids);
      if (error) throw new AssistantToolError();
      return (data ?? []).map(toOverdue);
    },
    async listOverdue(moreThanDays) {
      const { data, error } = await overdueQuery()
        .lt("due_date", addDays(today, -moreThanDays))
        .order("due_date", { ascending: true })
        .limit(50);
      if (error) throw new AssistantToolError();
      return (data ?? []).map(toOverdue);
    },
    async monthSummary(month) {
      const { data, error } = await supabase
        .rpc("assistant_month_summary", {
          p_end: lastDayOfMonth(month),
          p_start: `${month}-01`,
          p_today: today,
          p_workspace_id: workspaceId,
        })
        .single();
      if (error || !data) throw new AssistantToolError();
      return {
        mes: month,
        pendente: { quantidade: data.pending_count, total: money(data.pending) },
        recebido: { quantidade: data.received_count, total: money(data.received) },
        vencido: { quantidade: data.overdue_count, total: money(data.overdue) },
      };
    },
  };
}

export function createAssistantWriter({ supabase, today, workspaceId }: Scope): AssistantWriter {
  return {
    async createReminders(ids) {
      const { data, error } = await supabase.rpc("create_assistant_reminders", {
        p_charge_ids: ids,
        p_today: today,
        p_workspace_id: workspaceId,
      });
      if (error) throw new AssistantToolError();
      const rows = data ?? [];
      return {
        criados: rows.filter((row) => row.created).map((row) => cleanText(row.client_name)),
        jaExistiam: rows.filter((row) => !row.created).map((row) => cleanText(row.client_name)),
        naoElegiveis: ids.length - rows.length,
        simulado: false,
      };
    },
  };
}

/** Demonstração: confere o que seria criado e não grava nada em lugar nenhum. */
export function createDemoAssistantWriter(reader: AssistantReader): AssistantWriter {
  return {
    async createReminders(ids) {
      const charges = await reader.describeCharges(ids);
      return {
        criados: charges.map((charge) => charge.cliente),
        jaExistiam: [],
        naoElegiveis: ids.length - charges.length,
        simulado: true,
      };
    },
  };
}
