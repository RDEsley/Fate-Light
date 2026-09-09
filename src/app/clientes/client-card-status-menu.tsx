"use client";

import { useEffect, useId, useRef, useState } from "react";

import { setClientStatus } from "@/app/clientes/actions";
import { Icon } from "@/components/ui/icon";
import { clientStatusInfo, clientStatusOptions } from "@/features/clients/status";

/**
 * Menu compacto no selo do card: troca a situação comercial sem abrir a ficha.
 * Archived fica fora — a lista de arquivados usa o fluxo próprio de desarquivar.
 */
export function ClientCardStatusMenu({
  clientId,
  status,
}: {
  clientId: string;
  status: string;
}) {
  const info = clientStatusInfo(status);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="client-card-status" ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Situação comercial: ${info.label}. Alterar`}
        className={`${info.className} client-card-status__trigger`}
        onClick={() => setOpen((value) => !value)}
        title="Alterar situação comercial"
        type="button"
      >
        <Icon className="size-3.5" name={info.icon} />
        {info.label}
        <Icon className="size-3 opacity-70" name="chevron-down" />
      </button>
      {open ? (
        <div className="client-card-status__menu" id={menuId} role="menu">
          {clientStatusOptions.map((option) => (
            <form action={setClientStatus} key={option.value} role="none">
              <input name="clientId" type="hidden" value={clientId} />
              <input name="clientStatus" type="hidden" value={option.value} />
              <input name="returnTo" type="hidden" value="/clientes" />
              <button
                aria-current={option.value === status ? "true" : undefined}
                className={option.value === status ? "is-current" : undefined}
                disabled={option.value === status}
                role="menuitem"
                title={option.description}
                type="submit"
              >
                {option.label}
              </button>
            </form>
          ))}
        </div>
      ) : null}
    </div>
  );
}
