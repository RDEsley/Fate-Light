"use client";

import { useState } from "react";

import { recordChargeDelayReason } from "@/app/_actions/mvp";
import { SubmitButton } from "@/app/_components/submit-button";
import { FormActions, TextField } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { SelectField } from "@/components/ui/select-field";

const reasons = [
  ["client_requested", "Cliente pediu mais prazo"],
  ["invoice_issue", "Nota ou cobrança precisou ser corrigida"],
  ["payment_rescheduled", "Pagamento foi reagendado"],
  ["commercial_negotiation", "Negociação comercial em andamento"],
  ["internal_follow_up", "Aguardando acompanhamento interno"],
  ["other", "Outro motivo"],
] as const;

const reasonOptions = reasons.map(([value, label]) => ({ label, value }));

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
      <Form action={recordChargeDelayReason} className="mt-3 grid gap-4">
        <input name="id" type="hidden" value={chargeId} />
        <SelectField
          label="Motivo"
          name="code"
          onValueChange={(value) => setCode(value as typeof code)}
          options={reasonOptions}
          value={code}
        />
        <TextField
          defaultValue={code === "other" ? "" : standardReason}
          key={code}
          label={code === "other" ? "Explique o motivo" : "Observação (você pode ajustar)"}
          maxLength={500}
          minLength={code === "other" ? 4 : 2}
          multiline
          name="reason"
          placeholder="Ex.: cliente pediu para pagar junto com a mensalidade seguinte"
          required
        />
        <FormActions>
          <SubmitButton idleLabel="Salvar no histórico" />
        </FormActions>
      </Form>
    </details>
  );
}
