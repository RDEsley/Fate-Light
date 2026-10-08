"use client";

import { useId, type ChangeEvent, type HTMLAttributes, type ReactNode, type Ref } from "react";

import { FieldError } from "./field-error";
import { FieldHint } from "./field-hint";
import { useFieldFeedback } from "./form-context";

export function classNames(...values: (false | null | string | undefined)[]) {
  return values.filter(Boolean).join(" ");
}

/**
 * Moldura comum de todo campo: rótulo, explicação opcional no ícone de informação,
 * controle e a mensagem logo abaixo. Manter essa ordem em um só lugar é o que deixa os
 * formulários alinhados entre si — cada campo desenhando a própria moldura foi o que
 * produziu alturas e espaçamentos diferentes de uma tela para outra.
 */
export function Field({
  children,
  className,
  error,
  errorId,
  help,
  hint,
  htmlFor,
  label,
  optional = false,
  ref,
}: {
  children: ReactNode;
  className?: string;
  error?: string;
  errorId?: string;
  /** Orientação permanente e curta abaixo do campo. Some quando há erro. */
  help?: ReactNode;
  /** Explicação sob demanda, aberta pelo ícone de informação ao lado do rótulo. */
  hint?: string;
  htmlFor: string;
  label: ReactNode;
  optional?: boolean;
  ref?: Ref<HTMLDivElement>;
}) {
  return (
    <div
      className={classNames("field", className)}
      data-invalid={error ? "true" : undefined}
      ref={ref}
    >
      <div className="field__head">
        <label className="field__label" htmlFor={htmlFor}>
          {label}
          {/* O espaço separa as palavras no nome acessível: "E-mail opcional". */}
          {optional ? " " : null}
          {optional ? <span className="field__optional">opcional</span> : null}
        </label>
        {hint ? <FieldHint>{hint}</FieldHint> : null}
      </div>
      {children}
      {error ? (
        <FieldError id={errorId} message={error} />
      ) : help ? (
        <span className="field__hint">{help}</span>
      ) : null}
    </div>
  );
}

type TextFieldProps = {
  autoComplete?: string;
  className?: string;
  defaultValue?: string;
  error?: string;
  /**
   * Chave do erro quando o `name` se repete no formulário (linhas de uma lista): sem ela
   * a recusa de uma linha marcaria todas as outras com o mesmo nome.
   */
  fieldKey?: string;
  help?: ReactNode;
  hint?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  label: string;
  maxLength?: number;
  minLength?: number;
  /** Texto longo: usa `<textarea>` no lugar do `<input>`. */
  multiline?: boolean;
  name: string;
  onValueChange?: (value: string) => void;
  optional?: boolean;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  type?: "email" | "tel" | "text";
  value?: string;
};

/** Campo de texto simples ou longo, com o retorno de erro padrão do sistema. */
export function TextField({
  autoComplete,
  className,
  defaultValue,
  error,
  fieldKey,
  help,
  hint,
  inputMode,
  label,
  maxLength,
  minLength,
  multiline = false,
  name,
  onValueChange,
  optional = false,
  placeholder,
  required = false,
  rows,
  type = "text",
  value,
}: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const feedback = useFieldFeedback(fieldKey ?? name, error);
  const shared = {
    "aria-describedby": feedback.error ? errorId : undefined,
    "aria-invalid": feedback.error ? (true as const) : undefined,
    autoComplete,
    "data-field": fieldKey,
    defaultValue,
    id,
    maxLength,
    minLength,
    name,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      feedback.clear();
      onValueChange?.(event.target.value);
    },
    placeholder,
    required: required && !optional,
    value,
  };

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
      {multiline ? (
        <textarea {...shared} rows={rows} />
      ) : (
        <input {...shared} inputMode={inputMode} type={type} />
      )}
    </Field>
  );
}

/**
 * Opção de ligar/desligar que pode revelar campos extras. O conteúdo só aparece com a
 * chave ligada, então o formulário mostra apenas o que a escolha atual pede.
 */
export function ToggleCard({
  checked,
  children,
  className,
  defaultChecked,
  description,
  error,
  name,
  onCheckedChange,
  title,
}: {
  checked?: boolean;
  children?: ReactNode;
  className?: string;
  defaultChecked?: boolean;
  description?: string;
  error?: string;
  name?: string;
  onCheckedChange?: (checked: boolean) => void;
  title: string;
}) {
  const feedback = useFieldFeedback(name, error);

  return (
    <div
      className={classNames("toggle-card", className)}
      data-invalid={feedback.error ? "true" : undefined}
    >
      <label className="toggle-card__head">
        <input
          checked={checked}
          className="toggle-card__switch"
          defaultChecked={defaultChecked}
          name={name}
          onChange={(event) => {
            feedback.clear();
            onCheckedChange?.(event.target.checked);
          }}
          type="checkbox"
        />
        <span className="toggle-card__text">
          <strong>{title}</strong>
          {description ? <small>{description}</small> : null}
        </span>
      </label>
      {children ? <div className="toggle-card__body">{children}</div> : null}
      <FieldError message={feedback.error} />
    </div>
  );
}

/** Caixa de marcação com o texto ao lado e a mensagem de erro logo abaixo. */
export function CheckboxField({
  children,
  className,
  defaultChecked,
  fieldKey,
  name,
  required = false,
  value,
}: {
  children: ReactNode;
  className?: string;
  defaultChecked?: boolean;
  /** Chave do erro quando o `name` se repete (uma caixa por documento, por exemplo). */
  fieldKey?: string;
  name: string;
  required?: boolean;
  value?: string;
}) {
  const feedback = useFieldFeedback(fieldKey ?? name);
  return (
    <div
      className={classNames("check-field", className)}
      data-invalid={feedback.error ? "true" : undefined}
    >
      <label>
        <input
          aria-invalid={feedback.error ? true : undefined}
          data-field={fieldKey}
          defaultChecked={defaultChecked}
          name={name}
          onChange={feedback.clear}
          required={required}
          type="checkbox"
          value={value}
        />
        <span>{children}</span>
      </label>
      <FieldError message={feedback.error} />
    </div>
  );
}

/** Bloco de campos com título próprio dentro de um formulário longo. */
export function FormSection({
  children,
  className,
  description,
  title,
}: {
  children: ReactNode;
  className?: string;
  description?: string;
  title: string;
}) {
  const titleId = useId();
  return (
    <div aria-labelledby={titleId} className={classNames("form-section", className)} role="group">
      <div className="form-section__head">
        <h3 id={titleId}>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

/** Rodapé de ações do formulário: secundárias à esquerda da principal, sempre no fim. */
export function FormActions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={classNames("form-actions", className)}>{children}</div>;
}
