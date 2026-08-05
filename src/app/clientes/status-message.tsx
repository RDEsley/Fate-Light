import { ToastNotification } from "@/components/ui/toast-notification";

const messages: Record<string, string> = {
  activated: "Cliente ativado.",
  created: "Cliente criado com segurança.",
  deleted: "Cliente excluído. Os demais dados permaneceram intactos.",
  "delete-blocked":
    "Este cliente possui histórico vinculado. Inative-o para preservar os registros.",
  "delete-error": "Não foi possível excluir este cliente.",
  error: "Não foi possível concluir a operação.",
  invalid: "Revise os campos informados.",
  inactivated: "Cliente inativado.",
  "service-created": "Serviço adicionado ao cliente.",
  "service-ended": "Serviço encerrado.",
  "service-reactivated": "Serviço reativado e pronto para novas cobranças.",
  "service-schedule-updated": "Agenda de cobrança futura atualizada.",
  "service-error": "Não foi possível salvar o serviço.",
  "service-invalid": "Revise os dados do serviço.",
  updated: "Cliente atualizado.",
};

export function ClientStatusMessage({ status }: { status?: string }) {
  const message = status ? messages[status] : undefined;
  const isError = status?.includes("error") || status?.includes("invalid");
  return message ? (
    <ToastNotification
      message={message}
      tone={isError ? "error" : status?.includes("blocked") ? "warning" : "success"}
    />
  ) : null;
}
