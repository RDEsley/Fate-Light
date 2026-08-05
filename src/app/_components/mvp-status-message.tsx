import { ToastNotification } from "@/components/ui/toast-notification";

const messages: Record<string, string> = {
  cancelled: "Cadastro cancelado sem apagar o histórico.",
  created: "Cadastro salvo com sucesso.",
  deleted: "Registro excluído com segurança.",
  "delete-blocked": "Este registro possui histórico confirmado ou ainda precisa ser encerrado.",
  "delete-error": "Não foi possível excluir este registro.",
  error: "Não foi possível concluir a operação.",
  invalid: "Revise os campos informados.",
  "delay-recorded": "Motivo do atraso registrado no histórico.",
  paid: "Pagamento registrado com a data e hora atuais.",
  "service-activated": "Serviço reativado no catálogo.",
  "service-created": "Serviço criado no catálogo.",
  "service-inactivated": "Serviço inativado sem perder o histórico.",
  "service-updated": "Serviço atualizado.",
  "service-error": "Não foi possível salvar o serviço.",
  "service-invalid": "Revise os dados do serviço.",
};

export function MvpStatusMessage({ status }: { status?: string }) {
  const message = status ? messages[status] : undefined;
  return message ? (
    <ToastNotification
      message={message}
      tone={
        status === "error" ||
        status === "invalid" ||
        status === "delete-error" ||
        status === "service-error" ||
        status === "service-invalid"
          ? "error"
          : status === "delete-blocked"
            ? "warning"
            : "success"
      }
    />
  ) : null;
}
