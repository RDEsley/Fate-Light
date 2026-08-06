import type { z } from "zod";

/**
 * Rótulo em português de cada campo, usado nas mensagens devolvidas aos formulários.
 * Aqui ficam só os nomes que valem em qualquer tela; o que muda de sentido conforme o
 * formulário (`name`, `description`) chega pelo parâmetro `labels` de `formErrors`.
 */
const fieldLabels: Record<string, string> = {
  additionalFee: "Custo adicional",
  additionalFeeIsRevenue: "Natureza do custo adicional",
  adjustmentIntervalMonths: "Intervalo de reajuste",
  adjustmentRate: "Sugestão de reajuste",
  amount: "Valor",
  autoRenew: "Renovação automática",
  billingType: "Periodicidade",
  cancelReason: "Motivo do cancelamento",
  category: "Categoria",
  clientId: "Cliente",
  clientServiceId: "Serviço vinculado",
  companyName: "Razão social ou nome fantasia",
  companyRevenue: "Receita própria",
  cost: "Custo",
  defaultPrice: "Valor padrão",
  description: "Descrição",
  discountType: "Tipo de desconto",
  discountValue: "Desconto",
  domain: "Domínio",
  dueDate: "Vencimento",
  email: "E-mail",
  expenseType: "Tipo",
  expiresOn: "Data de expiração",
  installmentCount: "Quantidade de parcelas",
  listPrice: "Valor cheio",
  mediaBudget: "Verba de mídia",
  name: "Nome",
  nextDueDate: "Primeiro vencimento",
  notes: "Observações",
  paymentMethod: "Forma de pagamento",
  paymentResponsibility: "Responsável pelo pagamento",
  phone: "Telefone",
  priorRevenue: "Total já recebido",
  priorRevenueDate: "Data de referência",
  promotionalCycles: "Quantidade de ciclos",
  promotionalPrice: "Valor promocional",
  registrar: "Registrador",
  serviceId: "Serviço do catálogo",
  startDate: "Início do serviço",
  status: "Status",
  website: "Site",
};

/** Mensagens específicas quando a regra violada não é óbvia pelo campo. */
const ruleMessages: Record<string, string> = {
  adjustmentIntervalMonths:
    "Preencha o intervalo e a porcentagem do reajuste juntos, com a porcentagem até 100.",
  amount: "Informe um valor maior que zero.",
  companyRevenue: "A cobrança precisa de algum valor: receita, verba de mídia ou adicional.",
  discountValue: "O desconto não pode passar de 100% nem ser maior que o valor cheio do serviço.",
  domain: "Informe só o endereço, como exemplo.com.br — sem espaços nem caminho depois da barra.",
  installmentCount: "Use de 1 a 120 parcelas.",
  listPrice: "Informe um valor igual ou maior que zero.",
  nextDueDate: "O primeiro vencimento não pode ser anterior ao início do serviço.",
  paymentMethod: "Para registrar como já paga, informe a forma de pagamento.",
  phone: "Informe um telefone com pelo menos 7 dígitos ou deixe em branco.",
  promotionalCycles: "Informe de 1 a 60 ciclos promocionais.",
  promotionalPrice:
    "Para usar preço promocional, preencha o valor e a quantidade de ciclos juntos.",
  website: "Informe só o endereço, como exemplo.com.br — sem espaços.",
};

/**
 * Traduz o erro do schema no que o formulário precisa: a marca de cada campo e o resumo
 * do topo. `labels` cobre o que muda de nome conforme a tela — "Nome" é do cliente numa
 * e do serviço na outra.
 */
export function formErrors(error: z.ZodError, labels: Record<string, string> = {}) {
  const names = { ...fieldLabels, ...labels };
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    if (!field || fieldErrors[field]) continue;
    fieldErrors[field] =
      ruleMessages[field] ?? `${names[field] ?? "Campo"}: confira o valor informado.`;
  }
  const touched = Object.keys(fieldErrors).map((field) => names[field] ?? field);
  const message = !touched.length
    ? "Revise os dados informados."
    : touched.length === 1
      ? `Revise o campo ${touched[0]}.`
      : `Revise os campos: ${touched.join(", ")}.`;
  return { fieldErrors, message };
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
