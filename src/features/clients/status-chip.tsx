import { Icon } from "@/components/ui/icon";

import { clientStatusInfo } from "./status";

/**
 * Selo compacto da situação comercial para usar dentro de avisos e textos —
 * destaca o estado sem depender de aspas no meio da frase.
 */
export function ClientStatusChip({
  className = "",
  status,
}: {
  className?: string;
  status: string;
}) {
  const info = clientStatusInfo(status);
  return (
    <span className={`${info.className} client-status--inline ${className}`.trim()}>
      <Icon className="size-3" name={info.icon} />
      {info.label}
    </span>
  );
}
