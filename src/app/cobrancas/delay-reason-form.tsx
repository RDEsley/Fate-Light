"use client";

import { useState } from "react";

import { recordChargeDelayReason } from "@/app/_actions/mvp";
import { SubmitButton } from "@/app/_components/submit-button";
import { Icon } from "@/components/ui/icon";

const reasons = [
  ["client_requested", "Cliente pediu mais prazo"],
  ["invoice_issue", "Nota ou cobrança precisou ser corrigida"],
  ["payment_rescheduled", "Pagamento foi reagendado"],
  ["commercial_negotiation", "Negociação comercial em andamento"],
  ["internal_follow_up", "Aguardando acompanhamento interno"],
  ["other", "Outro motivo"],
] as const;

export function DelayReasonForm({ chargeId }: { chargeId: string }) {
  const [code, setCode] = useState<(typeof reasons)[number][0]>("client_requested");
  const standardReason = reasons.find(([value]) => value === code)?.[1] ?? "";

  return (
    <details className="delay-reason-disclosure">
      <summary>
        <Icon className="size-4" name="alert" />
        <span className="flex-1">Registrar motivo do atraso</span>
        <Icon className="delay-reason-disclosure__chevron size-4" name="chevron-down" />
      </summary>
      <form action={recordChargeDelayReason} className="form-grid mt-3 sm:grid-cols-2">
        <input name="id" type="hidden" value={chargeId} />
        <label className="text-sm font-semibold">
          Motivo
          <select
            name="code"
            onChange={(event) => setCode(event.target.value as typeof code)}
            value={code}
          >
            {reasons.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold sm:col-span-2">
          {code === "other" ? "Explique o motivo" : "Observação (você pode ajustar)"}
          <textarea
            defaultValue={code === "other" ? "" : standardReason}
            key={code}
            name="reason"
            required
          />
        </label>
        <div className="sm:col-span-2">
          <SubmitButton idleLabel="Salvar no histórico" />
        </div>
      </form>
    </details>
  );
}
