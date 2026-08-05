import type { IconName } from "@/components/ui/icon";

export const clientStatusValues = ["budget", "pending", "active", "inactive", "blacklist"] as const;

export type ClientStatus = (typeof clientStatusValues)[number];

type ClientStatusDefinition = {
  /** Classe do selo exibido no card e no detalhe. */
  className: string;
  description: string;
  icon: IconName;
  label: string;
};

const definitions: Record<ClientStatus | "archived", ClientStatusDefinition> = {
  budget: {
    className: "client-status client-status--budget",
    description: "Proposta enviada, ainda sem contrato fechado.",
    icon: "receipt",
    label: "Orçamento",
  },
  pending: {
    className: "client-status client-status--pending",
    description: "Falta algo do cliente para começar ou continuar.",
    icon: "history",
    label: "Pendente",
  },
  active: {
    className: "client-status client-status--active",
    description: "Cliente em operação normal, gerando cobranças.",
    icon: "check",
    label: "Ativo",
  },
  inactive: {
    className: "client-status client-status--inactive",
    description: "Parado por ora, sem novas cobranças.",
    icon: "pause",
    label: "Inativo",
  },
  blacklist: {
    className: "client-status client-status--blacklist",
    description: "Não voltar a atender. Fica registrado para consulta.",
    icon: "alert",
    label: "Lista negra",
  },
  archived: {
    className: "client-status client-status--archived",
    description: "Fora da operação do dia a dia, com histórico preservado.",
    icon: "archive",
    label: "Arquivado",
  },
};

export function clientStatusInfo(status: string) {
  return definitions[status as ClientStatus] ?? definitions.inactive;
}

/** Situações em que faz sentido aplicar serviços e gerar cobranças. */
export const billableClientStatuses: readonly string[] = ["active", "budget", "pending"];

export function isBillableClientStatus(status: string) {
  return billableClientStatuses.includes(status);
}

export const clientStatusOptions = clientStatusValues.map((value) => ({
  description: definitions[value].description,
  label: definitions[value].label,
  value,
}));
