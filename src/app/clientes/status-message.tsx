const messages: Record<string, string> = {
  activated: "Cliente ativado.",
  created: "Cliente criado com segurança.",
  error: "Não foi possível concluir a operação.",
  invalid: "Revise os campos informados.",
  inactivated: "Cliente inativado.",
  "service-created": "Serviço adicionado ao cliente.",
  "service-ended": "Serviço encerrado.",
  "service-error": "Não foi possível salvar o serviço.",
  "service-invalid": "Revise os dados do serviço.",
  updated: "Cliente atualizado.",
};

export function ClientStatusMessage({ status }: { status?: string }) {
  const message = status ? messages[status] : undefined;
  return message ? (
    <p
      className="border-brand/25 bg-brand-soft text-brand-strong mb-6 rounded-xl border px-4 py-3 text-sm"
      role="status"
    >
      {message}
    </p>
  ) : null;
}
