"use client";

import { useState } from "react";

import { DateField } from "@/components/ui/form-controls";
import { isoDateInTimeZone } from "@/features/mvp/format";

/** Hoje no fuso do navegador de quem está registrando o pagamento. */
function localToday() {
  return isoDateInTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
}

/**
 * Data em que o dinheiro entrou ou saiu. Começa em hoje — o caso comum continua a um
 * clique —, mas quem registra com atraso corrige o dia e a receita cai no mês certo.
 * Montado só dentro do diálogo aberto, então "hoje" é calculado no navegador.
 */
export function PaymentDateField() {
  const [today] = useState(localToday);

  return (
    <DateField
      defaultValue={today}
      hint="Quando o dinheiro de fato entrou ou saiu. Datas futuras não são aceitas."
      label="Data do pagamento"
      name="paidOn"
      required
    />
  );
}
