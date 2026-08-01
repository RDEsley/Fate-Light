const messages: Record<string, string> = {
  cancelled: "Cadastro cancelado sem apagar o histórico.",
  created: "Cadastro salvo com sucesso.",
  error: "Não foi possível concluir a operação.",
  invalid: "Revise os campos informados.",
  paid: "Pagamento registrado com a data e hora atuais.",
};

export function MvpStatusMessage({ status }: { status?: string }) {
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
