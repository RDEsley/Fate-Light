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
  paid: "Pagamento registrado. A cobrança foi para o bloco das resolvidas e o próximo ciclo já está agendado.",
  "service-activated": "Serviço reativado no catálogo.",
  "service-created": "Serviço criado no catálogo.",
  "service-deleted": "Serviço removido do catálogo.",
  "service-delete-blocked":
    "Este serviço está em uso por algum cliente. Use “Desvincular e excluir” para tirá-lo do catálogo sem apagar o trabalho já feito.",
  "service-documents-attached":
    "Este serviço possui notas fiscais anexadas. Remova os anexos nas cobranças pagas antes de excluir o histórico.",
  "service-detached":
    "Serviço removido do catálogo. Os clientes que já o usavam seguem com o serviço ativo.",
  "service-ended": "Serviço encerrado. As cobranças já criadas continuam no histórico.",
  "service-inactivated": "Serviço inativado sem perder o histórico.",
  "service-paused": "Serviço pausado. Ele não gera cobranças nem alertas até você retomar.",
  "service-resumed": "Serviço retomado de onde parou.",
  "service-settled": "Pendências do serviço marcadas como pagas.",
  "service-schedule-updated": "Agenda do serviço atualizada.",
  "service-updated": "Serviço atualizado.",
  "service-error": "Não foi possível salvar o serviço.",
  "service-invalid": "Revise os dados do serviço.",
  "domain-deleted": "Domínio removido do acompanhamento.",
  "domain-updated": "Domínio atualizado.",
  "invoice-deleted": "Nota fiscal removida com segurança.",
  "invoice-error": "Não foi possível concluir a operação com a nota fiscal.",
  "invoice-invalid": "Escolha uma nota fiscal válida em PDF, JPEG, PNG ou WebP.",
  "invoice-too-large": "A nota fiscal ultrapassa o limite de 4 MB.",
  "invoice-unavailable": "Anexe a nota fiscal somente depois de marcar a conta como paga.",
  "invoice-uploaded": "Nota fiscal anexada e protegida no armazenamento privado.",
};

export function MvpStatusMessage({ status }: { status?: string }) {
  const message = status ? messages[status] : undefined;
  if (!message) return null;
  const tone =
    status?.includes("error") ||
    status?.includes("invalid") ||
    status?.includes("too-large") ||
    status?.includes("unavailable")
      ? "error"
      : status?.includes("blocked")
        ? "warning"
        : "success";
  return <ToastNotification message={message} tone={tone} />;
}
