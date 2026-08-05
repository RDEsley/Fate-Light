"use client";

import { useRef } from "react";

import { setClientStatus } from "@/app/clientes/actions";
import { SelectField } from "@/components/ui/select-field";
import { clientStatusOptions } from "@/features/clients/status";

/** Troca rápida da situação comercial, sem precisar abrir a tela de edição. */
export function ClientStatusSwitcher({ clientId, status }: { clientId: string; status: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form action={setClientStatus} className="client-status-switcher" ref={formRef}>
      <input name="clientId" type="hidden" value={clientId} />
      <SelectField
        defaultValue={status}
        label="Situação comercial"
        name="clientStatus"
        onValueChange={() => formRef.current?.requestSubmit()}
        options={clientStatusOptions}
      />
    </form>
  );
}
