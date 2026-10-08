import { FocusRecord } from "@/components/ui/focus-record";

/** O alerta funciona como guia: abre a lista já na cobrança citada, com a borda em destaque. */
export function FocusCharge({ chargeId }: { chargeId?: string }) {
  return <FocusRecord targetId={chargeId ? `charge-${chargeId}` : undefined} />;
}
