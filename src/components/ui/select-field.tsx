"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { Icon } from "./icon";

export type SelectOption = {
  description?: string;
  label: string;
  value: string;
};

/** Altura máxima da lista, espelhando `--select-popover-max` no globals.css. */
const popoverMaxHeight = 272;

/**
 * Campo de seleção próprio. Diferente do `<select>` nativo e dos popovers antigos do sistema,
 * ele mede o espaço disponível e abre para cima quando não cabe abaixo do gatilho.
 */
export function SelectField({
  defaultValue,
  hint,
  label,
  name,
  onValueChange,
  optional = false,
  options,
  placeholder = "Selecione…",
  value: controlledValue,
}: {
  defaultValue?: string;
  hint?: ReactNode;
  label: string;
  name: string;
  onValueChange?: (value: string) => void;
  optional?: boolean;
  options: SelectOption[];
  placeholder?: string;
  value?: string;
}) {
  const listId = useId();
  const triggerId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? "");
  const [placement, setPlacement] = useState<"bottom" | "top">("bottom");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);

  const value = controlledValue ?? uncontrolledValue;
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const measure = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom;
    const above = rect.top;
    setPlacement(below < Math.min(popoverMaxHeight, above) ? "top" : "bottom");
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure, open]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutside);
    return () => document.removeEventListener("pointerdown", closeOnOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const commit = (next: string) => {
    if (controlledValue === undefined) setUncontrolledValue(next);
    onValueChange?.(next);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const openList = (index: number) => {
    setActiveIndex(index);
    setOpen(true);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter")) {
      event.preventDefault();
      openList(selectedIndex >= 0 ? selectedIndex : 0);
      return;
    }
    if (!open) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const option = options[activeIndex];
      if (option) commit(option.value);
    }
  };

  return (
    <div className="field select-field" ref={rootRef}>
      <label className="field__label" htmlFor={triggerId}>
        {label} {optional ? <span className="field__optional">opcional</span> : null}
        {hint}
      </label>
      {/* Sem `required`: campo oculto não participa da validação de restrições do HTML,
          então a marca só daria a impressão de proteger. Todo select do sistema abre com
          um valor default e a garantia real fica com o schema no servidor. */}
      <input name={name} type="hidden" value={value} />
      <button
        aria-controls={open ? listId : undefined}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="select-field__trigger"
        data-placeholder={selected ? undefined : "true"}
        id={triggerId}
        onClick={() => (open ? setOpen(false) : openList(selectedIndex >= 0 ? selectedIndex : 0))}
        onKeyDown={onKeyDown}
        ref={triggerRef}
        role="combobox"
        type="button"
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <Icon className="size-4 flex-none" name={open ? "chevron-up" : "chevron-down"} />
      </button>
      {open ? (
        <div
          aria-labelledby={triggerId}
          className="select-field__popover"
          data-placement={placement}
          id={listId}
          ref={listRef}
          role="listbox"
        >
          {options.map((option, index) => (
            <button
              aria-selected={option.value === value}
              className="select-field__option"
              data-active={index === activeIndex ? "true" : undefined}
              key={option.value}
              onClick={() => commit(option.value)}
              onPointerEnter={() => setActiveIndex(index)}
              role="option"
              type="button"
            >
              <span className="min-w-0 flex-1 text-left">
                <strong className="block truncate">{option.label}</strong>
                {option.description ? <small>{option.description}</small> : null}
              </span>
              {option.value === value ? (
                <Icon className="text-brand-strong size-4 flex-none" name="check" />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
