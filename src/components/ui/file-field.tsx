"use client";

import { useId, type ChangeEvent } from "react";

import { Field } from "./field";
import { useFieldFeedback } from "./form-context";

/**
 * Campo de arquivo no padrão dos formulários do sistema. O tamanho é conferido no
 * navegador para o erro aparecer junto do campo, sem esperar o envio; o servidor confere
 * de novo, junto com o tipo e a assinatura do arquivo.
 */
export function FileField({
  accept,
  className,
  help,
  hint,
  label,
  maxBytes,
  name,
  optional = false,
  tooLargeMessage,
}: {
  accept: string;
  className?: string;
  help?: string;
  hint?: string;
  label: string;
  maxBytes: number;
  name: string;
  optional?: boolean;
  tooLargeMessage: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const feedback = useFieldFeedback(name);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    feedback.clear();
    const file = event.target.files?.[0];
    // `customError` entra na validação do <Form> e vira a mensagem do campo.
    event.target.setCustomValidity(file && file.size > maxBytes ? tooLargeMessage : "");
  }

  return (
    <Field
      className={className}
      error={feedback.error}
      errorId={errorId}
      help={help}
      hint={hint}
      htmlFor={id}
      label={label}
      optional={optional}
    >
      <input
        accept={accept}
        aria-describedby={feedback.error ? errorId : undefined}
        aria-invalid={feedback.error ? true : undefined}
        className="file-field"
        id={id}
        name={name}
        onChange={handleChange}
        type="file"
      />
    </Field>
  );
}
