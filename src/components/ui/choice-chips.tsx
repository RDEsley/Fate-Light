"use client";

import { useId } from "react";

import { classNames } from "./field";

/**
 * Escolha única entre poucas opções, todas à vista. Substitui a lista suspensa quando a
 * decisão é rápida e as alternativas cabem na linha — como a forma de pagamento.
 */
export function ChoiceChips({
  className,
  defaultValue,
  label,
  name,
  options,
}: {
  className?: string;
  defaultValue: string;
  label: string;
  name: string;
  options: { label: string; value: string }[];
}) {
  const labelId = useId();

  return (
    <div
      aria-labelledby={labelId}
      className={classNames("field", className)}
      role="radiogroup"
    >
      <span className="field__label" id={labelId}>
        {label}
      </span>
      <div className="chip-group">
        {options.map((option) => (
          <label className="chip" key={option.value}>
            <input
              defaultChecked={option.value === defaultValue}
              name={name}
              type="radio"
              value={option.value}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
