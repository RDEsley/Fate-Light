import type { CellValue, Sheet } from "read-excel-file/node";

import type { ImportIssue, ImportPayload } from "./types";

type SheetRow = Array<CellValue | null>;

export type NormalizedWorkbook = {
  issues: ImportIssue[];
  legacy: boolean;
  payload: ImportPayload;
  rowCount: number;
};

const emptyPayload = (): ImportPayload => ({
  charges: [],
  clients: [],
  domains: [],
  expenses: [],
  services: [],
});

function key(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function buildHeaders(row: SheetRow) {
  const headers = new Map<string, number>();
  row.forEach((cell, index) => {
    const normalized = key(cell);
    if (normalized && !headers.has(normalized)) headers.set(normalized, index);
  });
  return headers;
}

function value(row: SheetRow, headers: Map<string, number>, aliases: string[]) {
  for (const alias of aliases) {
    const index = headers.get(key(alias));
    if (index !== undefined) return row[index] ?? null;
  }
  return null;
}

function issue(
  issues: ImportIssue[],
  sheet: string,
  row: number,
  message: string,
  field?: string,
  level: ImportIssue["level"] = "error",
) {
  issues.push({ field, level, message, row, sheet });
}

function dateValue(input: unknown) {
  if (input instanceof Date && !Number.isNaN(input.valueOf())) {
    return [input.getUTCFullYear(), input.getUTCMonth() + 1, input.getUTCDate()]
      .map((part, index) => String(part).padStart(index ? 2 : 4, "0"))
      .join("-");
  }
  if (typeof input === "number" && Number.isFinite(input)) {
    const epoch = Date.UTC(1899, 11, 30);
    return dateValue(new Date(epoch + Math.round(input) * 86_400_000));
  }
  const raw = text(input);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const brazilian = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.exec(raw);
  if (brazilian) {
    return `${brazilian[3]}-${brazilian[2].padStart(2, "0")}-${brazilian[1].padStart(2, "0")}`;
  }
  return "";
}

function moneyValue(input: unknown) {
  if (typeof input === "number" && Number.isFinite(input)) return Math.abs(input).toFixed(2);
  const raw = text(input).replace(/R\$/gi, "").replace(/\s/g, "");
  if (!raw) return "0.00";
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw.replace(/,/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.abs(parsed).toFixed(2) : "";
}

function booleanValue(input: unknown) {
  if (typeof input === "boolean") return input;
  return ["1", "sim", "s", "true", "yes", "y"].includes(key(input));
}

function statusValue(input: unknown, kind: "client"): "active" | "inactive";
function statusValue(input: unknown, kind: "financial"): "pending" | "paid" | "cancelled";
function statusValue(input: unknown, kind: "client" | "financial") {
  const normalized = key(input);
  if (kind === "client")
    return ["inactive", "inativo", "inativa"].includes(normalized) ? "inactive" : "active";
  if (["paid", "pago", "paga"].includes(normalized)) return "paid";
  if (["cancelled", "canceled", "cancelado", "cancelada"].includes(normalized)) return "cancelled";
  return "pending";
}

const categoryValues: ImportPayload["expenses"][number]["category"][] = [
  "tools",
  "artificial_intelligence",
  "agents",
  "staff_contractors",
  "domains",
  "hosting",
  "software",
  "marketing",
  "other",
];

function categoryValue(input: unknown) {
  const normalized = key(input).replace(/ /g, "_");
  const aliases: Record<string, ImportPayload["expenses"][number]["category"]> = {
    agentes: "agents",
    dominios: "domains",
    ferramentas: "tools",
    hospedagem: "hosting",
    ia: "artificial_intelligence",
    outros: "other",
    pessoal: "staff_contractors",
  };
  return categoryValues.includes(normalized as ImportPayload["expenses"][number]["category"])
    ? (normalized as ImportPayload["expenses"][number]["category"])
    : (aliases[normalized] ?? "other");
}

function validateText(
  issues: ImportIssue[],
  sheet: string,
  row: number,
  field: string,
  input: string,
  minimum: number,
  maximum: number,
) {
  if (input.length < minimum || input.length > maximum) {
    issue(issues, sheet, row, `${field} deve ter entre ${minimum} e ${maximum} caracteres.`, field);
    return false;
  }
  return true;
}

function parseCanonicalSheet(sheet: Sheet, payload: ImportPayload, issues: ImportIssue[]) {
  const headers = buildHeaders(sheet.data[0] ?? []);
  sheet.data.slice(1).forEach((row, index) => {
    if (row.every((cell) => cell === null || text(cell) === "")) return;
    const sourceRow = index + 2;
    const type = key(value(row, headers, ["Tipo", "Type"]));
    const clientName = text(value(row, headers, ["Cliente", "Client"]));
    const notes = text(value(row, headers, ["Observações", "Observacoes", "Notes"]));

    if (!type) {
      issue(issues, sheet.sheet, sourceRow, "Informe o Tipo da linha.", "Tipo");
      return;
    }
    if (!clientName || !validateText(issues, sheet.sheet, sourceRow, "Cliente", clientName, 2, 160))
      return;

    if (["cliente", "client"].includes(type)) {
      const email = text(value(row, headers, ["Email", "E-mail"])).toLowerCase();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        issue(issues, sheet.sheet, sourceRow, "E-mail inválido.", "Email");
      }
      payload.clients.push({
        companyName: text(value(row, headers, ["Empresa", "Company"])),
        email,
        name: clientName,
        notes,
        phone: text(value(row, headers, ["Telefone", "Phone"])),
        status: statusValue(value(row, headers, ["Status"]), "client"),
      });
      return;
    }

    if (["servico", "service"].includes(type)) {
      const name = text(value(row, headers, ["Serviço", "Servico", "Service"]));
      const startDate = dateValue(
        value(row, headers, ["Data inicial", "Data de início", "Start Date"]),
      );
      const nextDueDate = dateValue(
        value(row, headers, ["Próximo vencimento", "Proximo vencimento", "Next Due Date"]),
      );
      const companyRevenue = moneyValue(
        value(row, headers, ["Receita própria", "Receita propria", "Company Revenue"]),
      );
      const mediaBudget = moneyValue(
        value(row, headers, ["Verba de mídia", "Verba de midia", "Media Budget"]),
      );
      const additionalFee = moneyValue(value(row, headers, ["Adicional", "Additional Fee"]));
      if (!validateText(issues, sheet.sheet, sourceRow, "Serviço", name, 2, 120)) return;
      if (!startDate)
        issue(issues, sheet.sheet, sourceRow, "Data inicial inválida.", "Data inicial");
      if (nextDueDate && startDate && nextDueDate < startDate) {
        issue(
          issues,
          sheet.sheet,
          sourceRow,
          "O próximo vencimento não pode anteceder a data inicial.",
          "Próximo vencimento",
        );
      }
      if (![companyRevenue, mediaBudget, additionalFee].every(Boolean)) {
        issue(issues, sheet.sheet, sourceRow, "Há um valor monetário inválido.", "Valores");
      }
      payload.services.push({
        additionalFee,
        billingType: ["mensal", "monthly", "recorrente"].includes(
          key(value(row, headers, ["Tipo de cobrança", "Tipo de cobranca", "Billing Type"])),
        )
          ? "monthly"
          : "single",
        clientName,
        companyRevenue,
        description: text(value(row, headers, ["Descrição", "Descricao", "Description"])),
        mediaBudget,
        name,
        nextDueDate,
        notes,
        startDate,
      });
      return;
    }

    if (["cobranca", "charge"].includes(type)) {
      const description = text(value(row, headers, ["Descrição", "Descricao", "Description"]));
      const dueDate = dateValue(value(row, headers, ["Vencimento", "Due Date"]));
      const companyRevenue = moneyValue(
        value(row, headers, ["Receita própria", "Receita propria", "Company Revenue"]),
      );
      const mediaBudget = moneyValue(
        value(row, headers, ["Verba de mídia", "Verba de midia", "Media Budget"]),
      );
      const additionalFee = moneyValue(value(row, headers, ["Adicional", "Additional Fee"]));
      const status = statusValue(value(row, headers, ["Status"]), "financial");
      const paidOn = dateValue(value(row, headers, ["Data de pagamento", "Paid At"]));
      if (!validateText(issues, sheet.sheet, sourceRow, "Descrição", description, 2, 200)) return;
      if (!dueDate) issue(issues, sheet.sheet, sourceRow, "Vencimento inválido.", "Vencimento");
      if (
        [companyRevenue, mediaBudget, additionalFee].some((amount) => !amount) ||
        Number(companyRevenue) + Number(mediaBudget) + Number(additionalFee) <= 0
      ) {
        issue(
          issues,
          sheet.sheet,
          sourceRow,
          "A cobrança precisa ter valor total maior que zero.",
          "Valores",
        );
      }
      if (status === "paid" && !paidOn)
        issue(
          issues,
          sheet.sheet,
          sourceRow,
          "Cobrança paga exige data de pagamento.",
          "Data de pagamento",
        );
      payload.charges.push({
        additionalFee,
        clientName,
        companyRevenue,
        description,
        dueDate,
        mediaBudget,
        notes,
        paidAt: paidOn ? `${paidOn}T12:00:00.000Z` : "",
        paymentMethod: text(value(row, headers, ["Forma de pagamento", "Payment Method"])),
        serviceName: text(value(row, headers, ["Serviço", "Servico", "Service"])),
        status,
      });
      return;
    }

    if (["despesa", "expense"].includes(type)) {
      const description = text(value(row, headers, ["Descrição", "Descricao", "Description"]));
      const amount = moneyValue(value(row, headers, ["Valor", "Amount"]));
      const dueDate = dateValue(value(row, headers, ["Vencimento", "Due Date"]));
      const status = statusValue(value(row, headers, ["Status"]), "financial");
      const paidOn = dateValue(value(row, headers, ["Data de pagamento", "Paid At"]));
      if (!validateText(issues, sheet.sheet, sourceRow, "Descrição", description, 2, 200)) return;
      if (!amount || Number(amount) <= 0)
        issue(issues, sheet.sheet, sourceRow, "Valor da despesa inválido.", "Valor");
      if (!dueDate) issue(issues, sheet.sheet, sourceRow, "Vencimento inválido.", "Vencimento");
      if (status === "paid" && !paidOn)
        issue(
          issues,
          sheet.sheet,
          sourceRow,
          "Despesa paga exige data de pagamento.",
          "Data de pagamento",
        );
      payload.expenses.push({
        amount,
        category: categoryValue(value(row, headers, ["Categoria", "Category"])),
        clientName,
        description,
        dueDate,
        expenseType: ["fixa", "fixed"].includes(
          key(value(row, headers, ["Tipo de despesa", "Expense Type"])),
        )
          ? "fixed"
          : "variable",
        notes,
        paidAt: paidOn ? `${paidOn}T12:00:00.000Z` : "",
        status: status === "paid" ? "paid" : "pending",
      });
      return;
    }

    if (["dominio", "domain"].includes(type)) {
      const domain =
        text(value(row, headers, ["Domínio", "Dominio", "Domain"]))
          .toLowerCase()
          .replace(/^https?:\/\//, "")
          .split("/")[0] ?? "";
      const expiresOn = dateValue(value(row, headers, ["Expiração", "Expiracao", "Expiration"]));
      if (!/^[a-z0-9]([a-z0-9.-]{1,251}[a-z0-9])?$/.test(domain))
        issue(issues, sheet.sheet, sourceRow, "Domínio inválido.", "Domínio");
      if (!expiresOn)
        issue(issues, sheet.sheet, sourceRow, "Data de expiração inválida.", "Expiração");
      payload.domains.push({
        autoRenew: booleanValue(
          value(row, headers, ["Renovação automática", "Renovacao automatica", "Auto Renew"]),
        ),
        clientName,
        cost: moneyValue(value(row, headers, ["Custo", "Cost"])) || "",
        domain,
        expiresOn,
        notes,
        paymentResponsibility:
          text(
            value(row, headers, [
              "Responsável pelo pagamento",
              "Responsavel pelo pagamento",
              "Payment Responsibility",
            ]),
          ) || "Empresa",
        registrar: text(value(row, headers, ["Registrador", "Registrar"])),
      });
      return;
    }

    issue(
      issues,
      sheet.sheet,
      sourceRow,
      `Tipo “${text(value(row, headers, ["Tipo", "Type"]))}” não reconhecido.`,
      "Tipo",
    );
  });
}

function parseLegacySheet(sheet: Sheet, payload: ImportPayload, issues: ImportIssue[]) {
  const headers = buildHeaders(sheet.data[0] ?? []);
  issue(
    issues,
    sheet.sheet,
    1,
    "Formato legado reconhecido. Planning Value e Mens/ ADS serão tratados como receita própria; totais calculados serão recalculados.",
    undefined,
    "warning",
  );
  sheet.data.slice(1).forEach((row, index) => {
    if (row.every((cell) => cell === null || text(cell) === "")) return;
    const sourceRow = index + 2;
    const clientName = text(value(row, headers, ["Client"]));
    if (!clientName) {
      issue(
        issues,
        sheet.sheet,
        sourceRow,
        "Linha legada ignorada porque não possui Client.",
        "Client",
        "warning",
      );
      return;
    }
    if (!payload.clients.some((client) => key(client.name) === key(clientName))) {
      payload.clients.push({
        companyName: "",
        email: "",
        name: clientName,
        notes: "Importado da planilha legada.",
        phone: "",
        status: "active",
      });
    }
    const startDate = dateValue(value(row, headers, ["Start Date"]));
    const nextMonthly = dateValue(value(row, headers, ["Next pay/ mens/"]));
    const nextAds = dateValue(value(row, headers, ["Next pay/ ADS"]));
    const paymentType = key(value(row, headers, ["Payment type"]));
    const development = text(value(row, headers, ["Service DEV"]));
    const serviceValue = moneyValue(value(row, headers, ["Service Value"]));
    const monthlyValue = moneyValue(value(row, headers, ["Mens/ value"]));
    const ads = text(value(row, headers, ["Service ADS"])) || "Gestão de Ads";
    const planning = moneyValue(value(row, headers, ["Planning Value"]));
    const monthlyAds = moneyValue(value(row, headers, ["Mens/ ADS"]));

    const addLegacyService = (
      name: string,
      amount: string,
      billingType: "monthly" | "single",
      nextDueDate: string,
    ) => {
      if (!name || Number(amount) <= 0) return;
      if (!startDate) {
        issue(
          issues,
          sheet.sheet,
          sourceRow,
          `O serviço “${name}” exige Start Date válida.`,
          "Start Date",
        );
        return;
      }
      payload.services.push({
        additionalFee: "0.00",
        billingType,
        clientName,
        companyRevenue: amount,
        description: "Migrado da planilha legada.",
        mediaBudget: "0.00",
        name,
        nextDueDate,
        notes: "Revise a classificação após importar.",
        startDate,
      });
      if (nextDueDate) {
        payload.charges.push({
          additionalFee: "0.00",
          clientName,
          companyRevenue: amount,
          description: name,
          dueDate: nextDueDate,
          mediaBudget: "0.00",
          notes: "Próxima cobrança criada a partir da planilha legada.",
          paidAt: "",
          paymentMethod: "",
          serviceName: name,
          status: "pending",
        });
      }
    };

    addLegacyService(
      development,
      serviceValue,
      paymentType.includes("mens") ? "monthly" : "single",
      nextMonthly,
    );
    addLegacyService("Mensalidade de site", monthlyValue, "monthly", nextMonthly);
    addLegacyService(`${ads} · Planejamento`, planning, "single", nextAds);
    addLegacyService(`${ads} · Gestão mensal`, monthlyAds, "monthly", nextAds);

    const expense = moneyValue(value(row, headers, ["Expenses"]));
    if (Number(expense) > 0) {
      const dueDate = nextMonthly || nextAds || startDate;
      if (dueDate) {
        payload.expenses.push({
          amount: expense,
          category: "other",
          clientName,
          description: `Despesa legada · ${clientName}`,
          dueDate,
          expenseType: "variable",
          notes: "Categoria e vencimento inferidos; revise após importar.",
          paidAt: "",
          status: "pending",
        });
        issue(
          issues,
          sheet.sheet,
          sourceRow,
          "Despesa normalizada para valor positivo, categoria Outros e status Pendente.",
          "Expenses",
          "warning",
        );
      } else {
        issue(
          issues,
          sheet.sheet,
          sourceRow,
          "Expenses não pôde ser importada sem uma data de referência.",
          "Expenses",
        );
      }
    }

    const expiresOn = dateValue(value(row, headers, ["DOMAIN EXPIRATION"]));
    const domain = text(value(row, headers, ["Domain", "Domínio", "Dominio"]));
    if (expiresOn && !domain) {
      issue(
        issues,
        sheet.sheet,
        sourceRow,
        "A expiração do domínio foi reconhecida, mas a planilha não possui o nome do domínio. Adicione uma coluna Domain para importá-lo.",
        "DOMAIN EXPIRATION",
        "warning",
      );
    } else if (expiresOn && domain) {
      payload.domains.push({
        autoRenew: false,
        clientName,
        cost: "",
        domain: domain.toLowerCase(),
        expiresOn,
        notes: "Importado da planilha legada.",
        paymentResponsibility: "Empresa",
        registrar: "",
      });
    }
  });
}

function checkDuplicates(payload: ImportPayload, issues: ImportIssue[]) {
  const seen = new Set<string>();
  payload.clients.forEach((client, index) => {
    const identifier = key(client.name);
    if (seen.has(identifier))
      issue(
        issues,
        "Importação",
        index + 2,
        `Cliente duplicado no arquivo: ${client.name}.`,
        "Cliente",
      );
    seen.add(identifier);
  });
}

export function normalizeWorkbook(sheets: Sheet[]): NormalizedWorkbook {
  const payload = emptyPayload();
  const issues: ImportIssue[] = [];
  let legacy = false;
  let recognized = false;

  for (const sheet of sheets) {
    const headers = buildHeaders(sheet.data[0] ?? []);
    if (headers.has("tipo") || headers.has("type")) {
      recognized = true;
      parseCanonicalSheet(sheet, payload, issues);
      continue;
    }
    if (headers.has("client") && headers.has("start date") && headers.has("service dev")) {
      recognized = true;
      legacy = true;
      parseLegacySheet(sheet, payload, issues);
    }
  }

  if (!recognized) {
    issue(
      issues,
      "Arquivo",
      1,
      "Nenhuma aba reconhecida. Use a coluna Tipo do modelo Fate Light ou os 18 cabeçalhos da planilha legada.",
    );
  }
  checkDuplicates(payload, issues);
  const rowCount = Object.values(payload).reduce((total, rows) => total + rows.length, 0);
  if (rowCount > 1000)
    issue(issues, "Arquivo", 1, "O lote excede o limite de 1.000 registros. Divida a planilha.");
  if (rowCount === 0 && !issues.some(({ level }) => level === "error"))
    issue(issues, "Arquivo", 1, "Nenhum registro importável foi encontrado.");
  return { issues, legacy, payload, rowCount };
}

export function parseCsv(content: string): Sheet[] {
  const rows: SheetRow[] = [];
  let row: SheetRow = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    if (character === '"') {
      if (quoted && content[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && content[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((entry) => text(entry))) rows.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }
  row.push(cell);
  if (row.some((entry) => text(entry))) rows.push(row);
  return [{ data: rows, sheet: "CSV" }];
}
