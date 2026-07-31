const messages: Record<string, string> = {
  archived: "Cliente arquivado sem apagar o histórico.",
  "contact-archived": "Contato arquivado.",
  "contact-created": "Contato adicionado.",
  "contact-error": "Não foi possível salvar o contato.",
  "contact-invalid": "Revise o contato e informe ao menos e-mail ou telefone.",
  "contact-updated": "Contato atualizado.",
  created: "Cliente criado com segurança.",
  error: "Não foi possível concluir a operação.",
  invalid: "Revise os campos informados.",
  restored: "Cliente restaurado como ativo.",
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
