import "server-only";

import { revalidatePath } from "next/cache";

/**
 * Invalida as superfícies que exibem dinheiro após mutações financeiras.
 * Dashboard e histórico sempre; cobranças/despesas e ficha do cliente conforme o caso.
 *
 * Em Next.js 16, `revalidatePath("/clientes")` invalida só a listagem — não as rotas
 * dinâmicas `/clientes/[clientId]`. Por isso, mutações de cobrança também invalidam o
 * padrão dinâmico da ficha.
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
    // Garante ficha do cliente mesmo quando a mutação veio de /cobrancas sem clientId.
    revalidatePath("/clientes/[clientId]", "page");
  }

  if (includeExpenses) {
    revalidatePath("/despesas");
    // Despesa vinculada a cliente pode aparecer em métricas/contexto da ficha.
    revalidatePath("/clientes/[clientId]", "page");
  }

  if (clientId) {
    revalidatePath(`/clientes/${clientId}`);
    if (includeExpenses) {
      revalidatePath("/clientes");
    }
  }
}
