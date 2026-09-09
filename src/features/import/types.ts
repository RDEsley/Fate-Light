export type ImportIssue = {
  field?: string;
  level: "error" | "warning";
  message: string;
  row: number;
  sheet: string;
};

export type ImportPayload = {
  charges: Array<{
    additionalFee: string;
    clientName: string;
    companyRevenue: string;
    description: string;
    dueDate: string;
    mediaBudget: string;
    notes: string;
    paidAt: string;
    paymentMethod: string;
    serviceName: string;
    status: "cancelled" | "paid" | "pending";
  }>;
  clients: Array<{
    companyName: string;
    email: string;
    name: string;
    notes: string;
    phone: string;
    status: "active" | "blacklist" | "budget" | "inactive" | "pending";
    website: string;
  }>;
  domains: Array<{
    autoRenew: boolean;
    clientName: string;
    cost: string;
    domain: string;
    expiresOn: string;
    notes: string;
    paymentResponsibility: string;
    registrar: string;
  }>;
  expenses: Array<{
    amount: string;
    category:
      | "agents"
      | "artificial_intelligence"
      | "domains"
      | "hosting"
      | "marketing"
      | "other"
      | "software"
      | "staff_contractors"
      | "tools";
    clientName: string;
    description: string;
    dueDate: string;
    expenseType: "fixed" | "variable";
    notes: string;
    paidAt: string;
    status: "paid" | "pending";
  }>;
  services: Array<{
    additionalFee: string;
    billingType: "monthly" | "single";
    clientName: string;
    companyRevenue: string;
    description: string;
    mediaBudget: string;
    name: string;
    nextDueDate: string;
    notes: string;
    startDate: string;
  }>;
};

/**
 * Empresa/marca declarada na planilha. Fica fora de `ImportPayload` de propósito: a RPC de
 * importação é versionada e não conhece esse tipo de linha, então as entidades são gravadas
 * pela action depois que a importação principal termina.
 */
export type ImportEntityRow = {
  clientName: string;
  displayName: string;
  entityType: "brand" | "company" | "other" | "project";
  notes: string;
};

export type ImportPreview = {
  counts: Record<keyof ImportPayload, number> & { entities: number };
  digest: string;
  issues: ImportIssue[];
  legacy: boolean;
  rowCount: number;
  sourceType: "csv" | "xlsx";
};

export type ImportActionState = {
  message: string;
  preview?: ImportPreview;
  result?: {
    counts: Record<string, number>;
    duplicate: boolean;
  };
  status: "error" | "idle" | "preview" | "success";
};
