import type { z } from "zod";

/** Rótulo em português de cada campo, usado nas mensagens devolvidas aos formulários. */
const fieldLabels: Record<string, string> = {
  additionalFee: "Custo adicional",
  adjustmentIntervalMonths: "Intervalo de reajuste",
  adjustmentRate: "Sugestão de reajuste",
  billingType: "Periodicidade",
  cancelReason: "Motivo do cancelamento",
  clientId: "Cliente",
  companyRevenue: "Receita própria",
  description: "Descrição",
  discountValue: "Desconto",
  dueDate: "Vencimento",
  installmentCount: "Quantidade de parcelas",
  listPrice: "Valor cheio",
  mediaBudget: "Verba de mídia",
  name: "Nome do serviço",
  nextDueDate: "Primeiro vencimento",
  notes: "Observações",
  promotionalCycles: "Quantidade de ciclos",
  promotionalPrice: "Valor promocional",
  startDate: "Início do serviço",
};

/** Mensagens específicas quando a regra violada não é óbvia pelo campo. */
const ruleMessages: Record<string, string> = {
  adjustmentIntervalMonths:
    "Preencha o intervalo e a porcentagem do reajuste juntos, com a porcentagem até 100.",
  discountValue: "O desconto não pode passar de 100% nem ser maior que o valor cheio do serviço.",
  installmentCount: "Use de 1 a 120 parcelas.",
  listPrice: "Informe um valor igual ou maior que zero.",
  nextDueDate: "O primeiro vencimento não pode ser anterior ao início do serviço.",
  promotionalCycles: "Informe de 1 a 60 ciclos promocionais.",
  promotionalPrice:
    "Para usar preço promocional, preencha o valor e a quantidade de ciclos juntos.",
};

export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    if (!field || errors[field]) continue;
    errors[field] =
      ruleMessages[field] ?? `${fieldLabels[field] ?? "Campo"}: confira o valor informado.`;
  }
  return errors;
}

export function summarizeFieldErrors(errors: Record<string, string>) {
  const names = Object.keys(errors).map((field) => fieldLabels[field] ?? field);
  if (!names.length) return "Revise os dados informados.";
  if (names.length === 1) return `Revise o campo ${names[0]}.`;
  return `Revise os campos: ${names.join(", ")}.`;
}

/**
 * Traduz o erro cru do banco em algo acionável. O Postgres devolve o nome da constraint
 * ou a mensagem levantada pela função; ambos são inúteis para quem está preenchendo o form.
 */
export function databaseErrorMessage(error: { code?: string; message?: string } | null) {
  const raw = `${error?.message ?? ""}`.toLowerCase();

  if (raw.includes("discount exceeds list price")) {
    return "O desconto ficou maior que o valor cheio. Reduza o desconto ou aumente o valor.";
  }
  if (raw.includes("installment count exceeds divisible amount")) {
    return "Não dá para dividir esse valor nessa quantidade de parcelas. Use menos parcelas.";
  }
  if (raw.includes("catalog service is not available")) {
    return "O serviço escolhido saiu do catálogo. Recarregue a página e escolha de novo.";
  }
  if (raw.includes("active workspace owner required")) {
    return "Sua sessão perdeu a permissão para esta ação. Entre novamente.";
  }
  if (raw.includes("charges_values_check")) {
    return "Os valores da cobrança não podem ser negativos.";
  }
  if (raw.includes("client_services_promotion_check")) {
    return "A promoção precisa de valor e de 1 a 60 ciclos.";
  }
  if (raw.includes("client_services_price_policy_check")) {
    return "O desconto informado não combina com o valor cheio do serviço.";
  }
  if (raw.includes("services_workspace_active_name_unique") || error?.code === "23505") {
    return "Já existe um registro ativo com esse nome.";
  }
  if (raw.includes("violates foreign key") || error?.code === "23503") {
    return "Um dos registros vinculados não existe mais. Recarregue a página.";
  }
  return "Não foi possível salvar. Revise os dados e tente de novo.";
}
