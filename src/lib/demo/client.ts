import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.generated";

import { demoProfile, demoUserId, type DemoDataset } from "./dataset";

type Row = Record<string, unknown>;
type Predicate = (row: Row) => boolean;
type Column = { name: string; nested?: Column[] };
type QueryError = { code: string; details: string; hint: string; message: string };
type QueryResult = {
  count: number | null;
  data: unknown;
  error: QueryError | null;
  status: number;
  statusText: string;
};

export const guestReadOnlyCode = "GUEST_READ_ONLY";

const readOnlyError: QueryError = {
  code: guestReadOnlyCode,
  details: "",
  hint: "",
  message: "Modo visitante: somente leitura.",
};
const cardinalityError: QueryError = {
  code: "PGRST116",
  details: "",
  hint: "",
  message: "JSON object requested, multiple (or no) rows returned",
};

/** Relações que as telas embutem no `select`. `many` devolve lista; as demais, um registro. */
const relations: Record<
  string,
  { key: string; many?: true; table: keyof DemoDataset; target: string }
> = {
  client_entities: { key: "client_entity_id", table: "client_entities", target: "id" },
  clients: { key: "client_id", table: "clients", target: "id" },
  fiscal_documents: { key: "id", many: true, table: "fiscal_documents", target: "entity_id" },
  workspaces: { key: "workspace_id", table: "workspaces", target: "id" },
};

function splitTopLevel(source: string) {
  const parts: string[] = [];
  let depth = 0;
  let token = "";
  for (const char of source) {
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (char === "," && depth === 0) {
      parts.push(token);
      token = "";
      continue;
    }
    token += char;
  }
  parts.push(token);
  return parts.map((part) => part.trim()).filter(Boolean);
}

function parseColumns(source: string): Column[] {
  return splitTopLevel(source).map((part) => {
    const open = part.indexOf("(");
    if (open < 0) return { name: part };
    return {
      name: part.slice(0, open).trim(),
      nested: parseColumns(part.slice(open + 1, part.lastIndexOf(")"))),
    };
  });
}

function project(row: Row, columns: Column[], data: DemoDataset): Row {
  const output: Row = {};
  for (const column of columns) {
    if (column.name === "*") {
      Object.assign(output, row);
      continue;
    }
    if (!column.nested) {
      output[column.name] = row[column.name] ?? null;
      continue;
    }
    const relation = relations[column.name];
    const nested = column.nested;
    const candidates: Row[] = relation ? data[relation.table] : [];
    const related = relation
      ? candidates.filter((candidate) => candidate[relation.target] === row[relation.key])
      : [];
    const first = related[0];
    output[column.name] = relation?.many
      ? related.map((item) => project(item, nested, data))
      : first
        ? project(first, nested, data)
        : null;
  }
  return output;
}

/** Padrão do `ilike` (`%`, `_` e escapes com barra) convertido em expressão regular. */
function likePattern(pattern: string) {
  let source = "";
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern.charAt(index);
    if (char === "\\" && index + 1 < pattern.length) {
      index += 1;
      source += pattern.charAt(index).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    } else if (char === "%") source += ".*";
    else if (char === "_") source += ".";
    else source += char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${source}$`, "isu");
}

function order(left: unknown, right: unknown) {
  if (typeof left === "number" && typeof right === "number") return left - right;
  return String(left).localeCompare(String(right), "pt-BR");
}

/** Comparações de faixa: datas ISO e números ordenam certo sem conversão. */
function ranked(value: unknown, limit: unknown, test: (difference: number) => boolean) {
  if (value === null || value === undefined) return false;
  if (typeof value === "number" && typeof limit === "number") return test(value - limit);
  const [left, right] = [String(value), String(limit)];
  return test(left < right ? -1 : left > right ? 1 : 0);
}

const operators: Record<string, (column: string, value: unknown) => Predicate> = {
  eq: (column, value) => (row) => row[column] === value,
  gt: (column, value) => (row) => ranked(row[column], value, (difference) => difference > 0),
  gte: (column, value) => (row) => ranked(row[column], value, (difference) => difference >= 0),
  ilike: (column, value) => {
    const pattern = likePattern(String(value));
    return (row) => typeof row[column] === "string" && pattern.test(String(row[column]));
  },
  in: (column, value) => (row) => Array.isArray(value) && value.includes(row[column]),
  is: (column, value) => (row) => (row[column] ?? null) === value,
  lt: (column, value) => (row) => ranked(row[column], value, (difference) => difference < 0),
  lte: (column, value) => (row) => ranked(row[column], value, (difference) => difference <= 0),
  neq: (column, value) => (row) => row[column] !== value,
};

function predicate(column: string, operator: string, value: unknown): Predicate {
  return operators[operator]?.(column, value) ?? (() => false);
}

/** Cláusula do `or` do PostgREST: `coluna.operador.valor`, separadas por vírgula. */
function parseCondition(condition: string): Predicate {
  const firstDot = condition.indexOf(".");
  const secondDot = condition.indexOf(".", firstDot + 1);
  if (firstDot < 0 || secondDot < 0) return () => false;
  const column = condition.slice(0, firstDot);
  const operator = condition.slice(firstDot + 1, secondDot);
  const raw = condition.slice(secondDot + 1);
  if (operator === "in") return predicate(column, "in", raw.replace(/^\(|\)$/g, "").split(","));
  if (operator === "is") return predicate(column, "is", raw === "null" ? null : raw === "true");
  return predicate(column, operator, raw);
}

/**
 * Consulta encadeável no formato que as telas já usam com o Supabase, resolvida sobre os
 * dados fictícios em memória. Cobre só leitura: qualquer escrita marca a consulta como
 * recusada e ela devolve erro, sem tocar em nada.
 */
class DemoQuery implements PromiseLike<QueryResult> {
  private cardinality: "many" | "maybe" | "one" = "many";
  private columns: Column[] = [{ name: "*" }];
  private counting = false;
  private filters: Predicate[] = [];
  private headOnly = false;
  private orders: { ascending: boolean; column: string; nullsFirst: boolean }[] = [];
  private refused = false;
  private window: { from: number; to: number } | null = null;

  constructor(
    private readonly data: DemoDataset,
    private readonly rows: Row[],
  ) {}

  select(columns = "*", options?: { count?: string; head?: boolean }) {
    this.columns = parseColumns(columns);
    this.counting = Boolean(options?.count);
    this.headOnly = Boolean(options?.head);
    return this;
  }

  private where(test: Predicate) {
    this.filters.push(test);
    return this;
  }

  eq(column: string, value: unknown) {
    return this.where(predicate(column, "eq", value));
  }

  neq(column: string, value: unknown) {
    return this.where(predicate(column, "neq", value));
  }

  is(column: string, value: boolean | null) {
    return this.where(predicate(column, "is", value));
  }

  in(column: string, values: readonly unknown[]) {
    return this.where(predicate(column, "in", values));
  }

  gt(column: string, value: unknown) {
    return this.where(predicate(column, "gt", value));
  }

  gte(column: string, value: unknown) {
    return this.where(predicate(column, "gte", value));
  }

  lt(column: string, value: unknown) {
    return this.where(predicate(column, "lt", value));
  }

  lte(column: string, value: unknown) {
    return this.where(predicate(column, "lte", value));
  }

  ilike(column: string, pattern: string) {
    return this.where(predicate(column, "ilike", pattern));
  }

  not(column: string, operator: string, value: unknown) {
    const test = predicate(column, operator, value);
    return this.where((row) => !test(row));
  }

  or(conditions: string) {
    const tests = splitTopLevel(conditions).map(parseCondition);
    return this.where((row) => tests.some((test) => test(row)));
  }

  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) {
    const ascending = options?.ascending ?? true;
    // Padrão do Postgres: nulos por último na ordem crescente, primeiro na decrescente.
    this.orders.push({ ascending, column, nullsFirst: options?.nullsFirst ?? !ascending });
    return this;
  }

  range(from: number, to: number) {
    this.window = { from, to };
    return this;
  }

  limit(count: number) {
    const from = this.window?.from ?? 0;
    this.window = { from, to: from + count - 1 };
    return this;
  }

  single() {
    this.cardinality = "one";
    return this;
  }

  maybeSingle() {
    this.cardinality = "maybe";
    return this;
  }

  insert() {
    return this.refuse();
  }

  update() {
    return this.refuse();
  }

  upsert() {
    return this.refuse();
  }

  delete() {
    return this.refuse();
  }

  refuse() {
    this.refused = true;
    return this;
  }

  private sorted(rows: Row[]) {
    if (!this.orders.length) return rows;
    return [...rows].sort((left, right) => {
      for (const { ascending, column, nullsFirst } of this.orders) {
        const [a, b] = [left[column] ?? null, right[column] ?? null];
        if (a === b) continue;
        if (a === null || b === null) return (a === null) === nullsFirst ? -1 : 1;
        const difference = order(a, b);
        if (difference !== 0) return ascending ? difference : -difference;
      }
      return 0;
    });
  }

  private run(): QueryResult {
    const done = (data: unknown, count: number | null = null, error: QueryError | null = null) => ({
      count,
      data,
      error,
      status: error ? 400 : 200,
      statusText: error ? "Bad Request" : "OK",
    });
    if (this.refused) return done(null, null, readOnlyError);

    const matching = this.rows.filter((row) => this.filters.every((test) => test(row)));
    const count = this.counting ? matching.length : null;
    const ordered = this.sorted(matching);
    const page = this.window ? ordered.slice(this.window.from, this.window.to + 1) : ordered;
    const data = page.map((row) => project(row, this.columns, this.data));

    if (this.cardinality === "many") return done(this.headOnly ? null : data, count);
    if (data.length === 1) return done(data[0], count);
    if (data.length === 0 && this.cardinality === "maybe") return done(null, count);
    return done(null, count, cardinalityError);
  }

  then<Fulfilled = QueryResult, Rejected = never>(
    onFulfilled?: ((value: QueryResult) => Fulfilled | PromiseLike<Fulfilled>) | null,
    onRejected?: ((reason: unknown) => Rejected | PromiseLike<Rejected>) | null,
  ): PromiseLike<Fulfilled | Rejected> {
    return Promise.resolve()
      .then(() => this.run())
      .then(onFulfilled, onRejected);
  }
}

const text = (value: unknown) => (typeof value === "string" ? value : "");
const between = (value: string, from: string, to: string) => value >= from && value <= to;
// Os instantes fictícios são sempre meio-dia UTC, então o dia do instante é o dia local.
const paidDay = (value: string | null) => (value ?? "").slice(0, 10);

/** Mesmas regras de `dashboard_financial_summary`, aplicadas aos dados fictícios. */
function financialSummary(data: DemoDataset, parameters: Row) {
  const [start, end, dueEnd, today, nextWeek, nextMonth] = [
    text(parameters.p_start),
    text(parameters.p_end),
    text(parameters.p_due_end),
    text(parameters.p_today),
    text(parameters.p_next_week),
    text(parameters.p_next_month),
  ];
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
  const pendingCharges = data.charges.filter((charge) => charge.status === "pending");
  const pendingExpenses = data.expenses.filter((expense) => expense.status === "pending");
  const activeDomains = data.domains.filter((domain) => domain.status === "active");
  const ownRevenue = (charge: DemoDataset["charges"][number]) =>
    charge.company_revenue + (charge.additional_fee_is_revenue ? charge.additional_fee : 0);

  return {
    active_client_entities: data.client_entities.filter(
      (entity) => entity.status === "active" && !entity.archived_at,
    ).length,
    active_clients: data.clients.filter(
      (client) => client.commercial_status === "active" && !client.archived_at,
    ).length,
    due_soon_charges: pendingCharges.filter((charge) => between(charge.due_date, today, nextWeek))
      .length,
    due_soon_expenses: pendingExpenses.filter((expense) =>
      between(expense.due_date, today, nextWeek),
    ).length,
    expenses_paid: sum(
      data.expenses
        .filter(
          (expense) => expense.status === "paid" && between(paidDay(expense.paid_at), start, end),
        )
        .map((expense) => expense.amount),
    ),
    expired_domains: activeDomains.filter((domain) => domain.expires_on < today).length,
    media_period: sum(
      data.charges
        .filter(
          (charge) => charge.status !== "cancelled" && between(charge.due_date, start, dueEnd),
        )
        .map(
          (charge) =>
            charge.media_budget + (charge.additional_fee_is_revenue ? 0 : charge.additional_fee),
        ),
    ),
    overdue_charges: pendingCharges.filter((charge) => charge.due_date < today).length,
    overdue_expenses: pendingExpenses.filter((expense) => expense.due_date < today).length,
    own_pending: sum(
      pendingCharges.filter((charge) => between(charge.due_date, start, dueEnd)).map(ownRevenue),
    ),
    own_received: sum(
      data.charges
        .filter(
          (charge) => charge.status === "paid" && between(paidDay(charge.paid_at), start, end),
        )
        .map(ownRevenue),
    ),
    upcoming_domains: activeDomains.filter((domain) => between(domain.expires_on, today, nextMonth))
      .length,
  };
}

/** Mesmas regras de `domain_operational_summary`. */
function domainSummary(data: DemoDataset, parameters: Row) {
  const [today, nextWeek] = [text(parameters.p_today), text(parameters.p_next_week)];
  const active = data.domains.filter((domain) => domain.status === "active");
  return {
    active_cost: active.reduce((total, domain) => total + (domain.cost ?? 0), 0),
    due_this_week: active.filter(
      (domain) => domain.expires_on > today && domain.expires_on <= nextWeek,
    ).length,
    due_today: active.filter((domain) => domain.expires_on === today).length,
    overdue: active.filter((domain) => domain.expires_on < today).length,
  };
}

const readFunctions: Record<string, (data: DemoDataset, parameters: Row) => Row[]> = {
  dashboard_financial_summary: (data, parameters) => [financialSummary(data, parameters)],
  domain_operational_summary: (data, parameters) => [domainSummary(data, parameters)],
  get_current_account_lifecycle_requests: () => [],
};

/**
 * Cliente do modo visitante. Não tem URL, chave nem sessão: lê de um objeto em memória e
 * recusa toda escrita. Implementa só a parte da API do Supabase que as páginas usam para
 * ler — por isso a conversão de tipo no fim, isolada aqui e coberta por teste, em vez de
 * espalhar um tipo mais estreito por todas as telas.
 */
export function createDemoClient(data: DemoDataset) {
  const refused = async () => ({ data: null, error: readOnlyError });
  const tables: Record<string, Row[] | undefined> = data;

  const client = {
    auth: {
      getClaims: async () => ({
        data: { claims: { email: demoProfile.email, sub: demoUserId } },
        error: null,
      }),
    },
    from: (table: string) => new DemoQuery(data, tables[table] ?? []),
    rpc: (name: string, parameters: Row = {}) => {
      const read = readFunctions[name];
      return read ? new DemoQuery(data, read(data, parameters)) : new DemoQuery(data, []).refuse();
    },
    storage: {
      from: () => ({ createSignedUrl: refused, remove: refused, upload: refused }),
    },
  };

  return client as unknown as SupabaseClient<Database>;
}
