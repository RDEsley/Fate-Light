import "server-only";

import { revalidatePath } from "next/cache";

/**
 * Invalida as superfícies que exibem dinheiro após mutações financeiras.
 * Dashboard e histórico sempre; cobranças/despesas e ficha do cliente conforme o caso.
 */
export function revalidateFinancialSurfaces({
  clientId,
  includeCharges = false,
  includeExpenses = false,
}: {
  clientId?: string | null;
  includeCharges?: boolean;
  includeExpenses?: boolean;
} = {}) {
  revalidatePath("/dashboard");
  revalidatePath("/historico");

  if (includeCharges) {
    revalidatePath("/cobrancas");
    revalidatePath("/clientes");
  }

  if (includeExpenses) {
    revalidatePath("/despesas");
  }

  if (clientId) {
    revalidatePath(`/clientes/${clientId}`);
    if (includeExpenses) {
      revalidatePath("/clientes");
    }
  }
}
