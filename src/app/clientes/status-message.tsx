import { ToastNotification } from "@/components/ui/toast-notification";

const messages: Record<string, string> = {
  archived: "Cliente arquivado. O histórico continua guardado.",
  created: "Cliente criado com segurança.",
  deleted: "Registro excluído. Os demais dados permaneceram intactos.",
  "delete-blocked":
    "Este cliente possui histórico vinculado. Arquive-o para preservar os registros.",
  "delete-error": "Não foi possível excluir este registro.",
  error: "Não foi possível concluir a operação.",
  invalid: "Revise os campos informados.",
  "prior-revenue-deleted": "Lançamento de histórico anterior removido.",
  "prior-revenue-error":
    "Cliente salvo, mas o total já recebido não pôde ser registrado. Lance-o como cobrança avulsa já paga.",
  "prior-revenue-updated": "Lançamento de histórico anterior atualizado.",
  restored: "Cliente desarquivado e de volta à operação.",
  "service-created": "Serviço aplicado e cobrança criada.",
  "service-delete-blocked":
    "Existe cobrança paga neste serviço. Encerre-o em vez de excluir para preservar o histórico.",
  "service-ended": "Serviço encerrado.",
  "service-error": "Não foi possível salvar o serviço.",
  "service-invalid": "Revise os dados do serviço.",
  "service-paused": "Serviço pausado. Sem novas cobranças nem alertas até você retomar.",
  "service-resumed": "Serviço retomado.",
  "service-schedule-updated": "Agenda de cobrança futura atualizada.",
  "service-settled": "Pendências já vencidas do serviço marcadas como pagas.",
  "service-updated": "Serviço atualizado. Cobranças pendentes acompanharam o novo valor.",
  "status-updated": "Situação comercial atualizada.",
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
