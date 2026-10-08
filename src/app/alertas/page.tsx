import type { Metadata } from "next";
import Link from "next/link";

import { AccountShell } from "@/app/_components/account-shell";
import { Icon } from "@/components/ui/icon";
import { FormPanel } from "@/components/ui/form-panel";
import { StatusToast } from "@/components/ui/toaster";
import { getAttentionItems } from "@/features/alerts/attention";
import { toAlertRows } from "@/features/alerts/board";
import { isoDateInTimeZone } from "@/features/mvp/format";
import { requireWorkspaceContext } from "@/lib/auth/workspace-context";

import { AlertBoard } from "./alert-board";
import { ManualAlertForm } from "./manual-alert-form";

export const metadata: Metadata = { title: "Alertas" };

const statusMessages: Record<string, { message: string; tone: "error" | "success" }> = {
  created: { message: "Alerta criado. Ele já está no seu radar.", tone: "success" },
  error: { message: "Não foi possível salvar o alerta. Tente novamente.", tone: "error" },
  invalid: { message: "Revise o título, a data e a prioridade.", tone: "error" },
  resolved: { message: "Alerta resolvido e retirado da lista aberta.", tone: "success" },
  snoozed: { message: "Alerta adiado. A nova data já vale no radar.", tone: "success" },
};

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const context = await requireWorkspaceContext();
  const attention = await getAttentionItems(context);
  const today = isoDateInTimeZone(context.workspaceTimezone);
  const rows = toAlertRows(attention.items, today);
  const feedback = status ? (statusMessages[status] ?? statusMessages.error) : null;

  return (
    <AccountShell
      actions={
        <Link className="button button--secondary" href="/perfil#alertas">
          <Icon className="size-4" name="settings" /> Antecedência
        </Link>
      }
      description="Veja o que venceu e o que está chegando antes de virar um problema."
      title="Central de alertas"
    >
      {feedback ? <StatusToast message={feedback.message} tone={feedback.tone} /> : null}
      <FormPanel className="mb-5" description="Lembrete interno com data" title="Criar alerta">
        <ManualAlertForm today={today} />
      </FormPanel>

      {attention.total > rows.length ? (
        <p className="helper-note mb-4" role="status">
          <Icon className="size-4" name="info" />
          Há {attention.total} alertas abertos. A tela exibe primeiro os {rows.length} de maior
          prioridade; resolva os itens atendidos para avançar pela fila.
        </p>
      ) : null}

      {rows.length ? (
        <AlertBoard rows={rows} total={attention.total} />
      ) : (
        <section className="empty-state">
          <span className="empty-state__icon">
            <Icon name="check" />
          </span>
          <strong>Tudo em dia por aqui</strong>
          <p>
            Quando uma cobrança, despesa ou domínio se aproximar do vencimento, ele aparecerá aqui.
          </p>
        </section>
      )}
    </AccountShell>
  );
}
