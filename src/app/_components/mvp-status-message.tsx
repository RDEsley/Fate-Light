import { ToastNotification } from "@/components/ui/toast-notification";

const messages: Record<string, string> = {
  cancelled: "Cobrança cancelada com o motivo registrado no histórico.",
  "cancel-invalid": "Escolha o motivo e escreva ao menos uma frase para cancelar.",
  created: "Cadastro salvo com sucesso.",
  "created-paid": "Cobrança registrada como já paga.",
  deleted: "Registro excluído com segurança.",
  "delete-blocked": "Este registro possui histórico confirmado ou ainda precisa ser encerrado.",
  "delete-error": "Não foi possível excluir este registro.",
  error: "Não foi possível concluir a operação.",
  invalid: "Revise os campos informados.",
  "delay-recorded": "Motivo do atraso registrado no histórico.",
  paid: "Pagamento registrado. A próxima cobrança do ciclo já foi agendada.",
  "service-activated": "Serviço reativado no catálogo.",
  "service-created": "Serviço criado no catálogo.",
  "service-deleted": "Serviço removido do catálogo.",
  "service-delete-blocked":
    "Este serviço está em uso por algum cliente. Inative-o no catálogo em vez de excluir.",
  "service-inactivated": "Serviço inativado sem perder o histórico.",
  "service-updated": "Serviço atualizado.",
  "service-error": "Não foi possível salvar o serviço.",
  "service-invalid": "Revise os dados do serviço.",
};

export function MvpStatusMessage({ status }: { status?: string }) {
  const message = status ? messages[status] : undefined;
  if (!message) return null;
  const tone =
    status?.includes("error") || status?.includes("invalid")
      ? "error"
      : status?.includes("blocked")
        ? "warning"
        : "success";
  return <ToastNotification message={message} tone={tone} />;
}
