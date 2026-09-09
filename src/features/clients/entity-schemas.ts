import { z } from "zod";

/**
 * Empresa, marca ou projeto sob um cliente comercial (ADR-0020). O cliente continua sendo
 * a relação comercial; a entidade é o nome que aparece no serviço, na cobrança, na despesa
 * e no domínio. O vínculo é sempre opcional: o que não tem entidade continua sendo "geral".
 */
export const clientEntityTypeValues = ["company", "brand", "project", "other"] as const;

export type ClientEntityType = (typeof clientEntityTypeValues)[number];

export const clientEntityTypeLabels: Record<ClientEntityType, string> = {
  brand: "Marca",
  company: "Empresa",
  other: "Outro",
  project: "Projeto",
};

export const clientEntityTypeOptions = [
  {
    description: "Um CNPJ ou razão social sob o mesmo cliente",
    label: "Empresa",
    value: "company",
  },
  {
    description: "Uma marca comercial do mesmo grupo",
    label: "Marca",
    value: "brand",
  },
  {
    description: "Uma frente de trabalho com identidade própria",
    label: "Projeto",
    value: "project",
  },
  {
    description: "Qualquer outro recorte que você precise separar",
    label: "Outro",
    value: "other",
  },
];

/** Rótulo seguro para valores vindos do banco, que podem ter nascido antes de um tipo novo. */
export function clientEntityTypeLabel(value: string | null | undefined) {
  return clientEntityTypeLabels[(value ?? "company") as ClientEntityType] ?? "Empresa";
}

export const clientEntityStatusLabels: Record<string, string> = {
  active: "Ativa",
  archived: "Arquivada",
  inactive: "Inativa",
};

/** Confirma a consolidação por digitação exata, como as exclusões irreversíveis do sistema. */
export const consolidationPhrase = "CONSOLIDAR";

/** Confirma a transferência de dados entre clientes sem converter origem em empresa/marca. */
export const transferPhrase = "TRANSFERIR";

const optionalText = (minimum: number, maximum: number) =>
  z.union([z.literal(""), z.string().trim().min(minimum).max(maximum)]);

/** Mesmo tratamento do site do cliente: guarda só o host em minúsculas. */
const websiteSchema = z.union([
  z.literal(""),
  z
    .string()
    .trim()
    .toLowerCase()
    .transform((value) => value.replace(/^https?:\/\//, "").split("/")[0] ?? "")
    .pipe(z.string().regex(/^[a-z0-9]([a-z0-9.-]{1,251}[a-z0-9])?$/)),
]);

export const clientEntitySchema = z.object({
  displayName: z.string().trim().min(2).max(160),
  email: z.union([z.literal(""), z.string().trim().toLowerCase().email().max(254)]),
  entityType: z.enum(clientEntityTypeValues),
  legalName: optionalText(2, 200),
  notes: z.string().trim().max(5000),
  phone: optionalText(7, 32),
  taxId: optionalText(8, 32),
  website: websiteSchema,
});

export type ClientEntityInput = z.infer<typeof clientEntitySchema>;

function optional(value: string) {
  return value || null;
}

/**
 * Devolve o `ZodError` no erro, como `parseClientForm`: sem ele a action não consegue
 * dizer qual campo recusou e o formulário volta com um aviso genérico.
 */
export function parseClientEntityForm(formData: FormData) {
  const text = (field: string) => String(formData.get(field) ?? "");
  const parsed = clientEntitySchema.safeParse({
    displayName: text("displayName"),
    email: text("email"),
    entityType: text("entityType") || "company",
    legalName: text("legalName"),
    notes: text("notes"),
    phone: text("phone"),
    taxId: text("taxId"),
    website: text("website"),
  });
  if (!parsed.success) return { error: parsed.error, success: false as const };
  return {
    data: {
      display_name: parsed.data.displayName,
      email: optional(parsed.data.email),
      entity_type: parsed.data.entityType,
      legal_name: optional(parsed.data.legalName),
      notes: optional(parsed.data.notes),
      phone: optional(parsed.data.phone),
      tax_id: optional(parsed.data.taxId),
      website: optional(parsed.data.website),
    },
    success: true as const,
  };
}

/**
 * Consolidação de um cliente legado em uma entidade de outro cliente. A frase de
 * confirmação é validada aqui e reenviada à RPC, que exige a mesma palavra.
 */
export const consolidateClientSchema = z.object({
  confirmation: z.literal(consolidationPhrase),
  entityType: z.enum(clientEntityTypeValues),
  displayName: z.string().trim().min(2).max(160),
  sourceClientId: z.string().uuid(),
  targetClientId: z.string().uuid(),
});

/** Motivos devolvidos pelas RPCs de consolidação, traduzidos para a interface. */
export const consolidationReasonMessages: Record<string, string> = {
  confirmation_required: "Digite CONSOLIDAR para liberar a consolidação.",
  invalid_display_name: "O nome da empresa/marca precisa ter entre 2 e 160 caracteres.",
  invalid_entity_type: "Escolha um tipo válido para a empresa/marca.",
  missing_ids: "Escolha o cliente de origem antes de consolidar.",
  same_client: "Origem e destino precisam ser clientes diferentes.",
  source_has_entities:
    "O cliente de origem já possui empresas/marcas. Consolide-as antes ou mova manualmente.",
  source_not_found: "Cliente de origem não encontrado.",
  target_not_found_or_cross_workspace: "Cliente de destino não encontrado neste workspace.",
};

export type ConsolidationPreview = {
  counts: {
    charges: number;
    contacts: number;
    domains: number;
    expenses: number;
    services: number;
  };
  copiedFields: Record<string, string>;
  ok: true;
  preserved: { activityEvents: boolean; contacts: boolean };
  source: { id: string; name: string; status: string };
  target: { id: string; name: string; status: string };
  totals: { expenses_paid: number; media: number; own_received: number };
};

export type ConsolidationResult =
  ConsolidationPreview | { message?: string; ok: false; reason: string };

/**
 * Transferência move os dados deste cliente para outro cadastro do mesmo workspace.
 * A frase TRANSFERIR é validada aqui e reenviada à RPC.
 */
export const transferClientSchema = z.object({
  confirmation: z.literal(transferPhrase),
  sourceClientId: z.string().uuid(),
  targetClientId: z.string().uuid(),
});

/** Motivos devolvidos pelas RPCs de transferência, traduzidos para a interface. */
export const transferReasonMessages: Record<string, string> = {
  confirmation_required: "Digite TRANSFERIR para liberar a transferência.",
  missing_ids: "Escolha o cliente de destino antes de transferir.",
  same_client: "Origem e destino precisam ser clientes diferentes.",
  source_not_found: "Cliente de origem não encontrado.",
  target_not_found_or_cross_workspace: "Cliente de destino não encontrado neste workspace.",
};

export type TransferPreview = {
  counts: {
    charges: number;
    contacts: number;
    domains: number;
    entities: number;
    expenses: number;
    services: number;
  };
  entityRenames: Array<{ from: string; id: string; to: string }>;
  ok: true;
  preserved: { activityEvents: boolean };
  source: { id: string; name: string; status: string };
  target: { id: string; name: string; status: string };
  totals: { expenses_paid: number; media: number; own_received: number };
};

export type TransferResult = TransferPreview | { message?: string; ok: false; reason: string };

function readNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readGroup(value: unknown) {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

/** Normaliza o JSON das RPCs; o tipo gerado é `Json` e a página precisa de números. */
export function readConsolidationPayload(payload: unknown): ConsolidationResult | null {
  if (typeof payload !== "object" || payload === null) return null;
  const record = payload as Record<string, unknown>;
  if (record.ok !== true) {
    return {
      message: typeof record.message === "string" ? record.message : undefined,
      ok: false,
      reason: typeof record.reason === "string" ? record.reason : "unknown",
    };
  }
  const counts = readGroup(record.counts);
  const totals = readGroup(record.totals);
  const source = readGroup(record.source);
  const target = readGroup(record.target);
  const preserved = readGroup(record.preserved);
  const copiedFields = readGroup(record.copied_fields);
  return {
    counts: {
      charges: readNumber(counts.charges),
      contacts: readNumber(counts.contacts),
      domains: readNumber(counts.domains),
      expenses: readNumber(counts.expenses),
      services: readNumber(counts.services),
    },
    copiedFields: Object.fromEntries(
      Object.entries(copiedFields).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    ),
    ok: true,
    preserved: {
      activityEvents: preserved.activity_events === true,
      contacts: preserved.contacts === true,
    },
    source: {
      id: String(source.id ?? ""),
      name: String(source.name ?? ""),
      status: String(source.status ?? "inactive"),
    },
    target: {
      id: String(target.id ?? ""),
      name: String(target.name ?? ""),
      status: String(target.status ?? "inactive"),
    },
    totals: {
      expenses_paid: readNumber(totals.expenses_paid),
      media: readNumber(totals.media),
      own_received: readNumber(totals.own_received),
    },
  };
}

/** Normaliza o JSON das RPCs de transferência para a prévia na ficha do cliente. */
export function readTransferPayload(payload: unknown): TransferResult | null {
  if (typeof payload !== "object" || payload === null) return null;
  const record = payload as Record<string, unknown>;
  if (record.ok !== true) {
    return {
      message: typeof record.message === "string" ? record.message : undefined,
      ok: false,
      reason: typeof record.reason === "string" ? record.reason : "unknown",
    };
  }
  const counts = readGroup(record.counts);
  const totals = readGroup(record.totals);
  const source = readGroup(record.source);
  const target = readGroup(record.target);
  const preserved = readGroup(record.preserved);
  const renames = Array.isArray(record.entity_renames) ? record.entity_renames : [];
  return {
    counts: {
      charges: readNumber(counts.charges),
      contacts: readNumber(counts.contacts),
      domains: readNumber(counts.domains),
      entities: readNumber(counts.entities),
      expenses: readNumber(counts.expenses),
      services: readNumber(counts.services),
    },
    entityRenames: renames.flatMap((entry) => {
      if (typeof entry !== "object" || entry === null) return [];
      const rename = entry as Record<string, unknown>;
      return [
        {
          from: String(rename.from ?? ""),
          id: String(rename.id ?? ""),
          to: String(rename.to ?? ""),
        },
      ];
    }),
    ok: true,
    preserved: {
      activityEvents: preserved.activity_events === true,
    },
    source: {
      id: String(source.id ?? ""),
      name: String(source.name ?? ""),
      status: String(source.status ?? "inactive"),
    },
    target: {
      id: String(target.id ?? ""),
      name: String(target.name ?? ""),
      status: String(target.status ?? "inactive"),
    },
    totals: {
      expenses_paid: readNumber(totals.expenses_paid),
      media: readNumber(totals.media),
      own_received: readNumber(totals.own_received),
    },
  };
}
