"use client";

import { useEffect, useRef, useState } from "react";

import { setClientStatus } from "@/app/clientes/actions";
import { SelectField } from "@/components/ui/select-field";
import { clientStatusOptions } from "@/features/clients/status";

/** Troca rápida da situação comercial, sem precisar abrir a tela de edição. */
export function ClientStatusSwitcher({ clientId, status }: { clientId: string; status: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [value, setValue] = useState(status);
  const lastSubmitted = useRef(status);

  useEffect(() => {
    // O SelectField é controlado de propósito: chamar requestSubmit() direto no
    // onValueChange (como antes) rodava antes do React aplicar o novo valor no input
    // escondido, então o form sempre reenviava o status ANTERIOR — parecia salvar, mas
    // nada mudava. O efeito só roda depois que o DOM já reflete o valor novo.
    if (lastSubmitted.current === value) return;
    lastSubmitted.current = value;
    formRef.current?.requestSubmit();
  }, [value]);

  return (
    <form action={setClientStatus} className="client-status-switcher" ref={formRef}>
      <input name="clientId" type="hidden" value={clientId} />
      <SelectField
        label="Situação comercial"
        name="clientStatus"
        onValueChange={setValue}
        options={clientStatusOptions}
        value={value}
      />
    </form>
  );
}
