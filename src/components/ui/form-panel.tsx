"use client";

import type { MouseEvent, ReactNode } from "react";

import { classNames } from "./field";
import { Icon, type IconName } from "./icon";

/**
 * Clicar no cabeçalho só abre e fecha: sem isto o navegador deixava o anel de foco
 * desenhado em volta da barra inteira depois do clique. Pelo teclado o foco segue normal.
 */
function keepFocusOnPointer(event: MouseEvent) {
  event.preventDefault();
}

/**
 * Painel recolhível de "novo registro". Fechado é um convite discreto; aberto vira o
 * cartão do formulário. `<details>` nativo: funciona antes da hidratação e mantém o
 * estado aberto/fechado no próprio DOM.
 */
export function FormPanel({
  children,
  className,
  defaultOpen = false,
  description,
  icon = "plus",
  id,
  title,
  tone = "brand",
}: {
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
  description?: string;
  icon?: IconName;
  id?: string;
  title: string;
  tone?: "brand" | "danger" | "violet" | "warning";
}) {
  return (
    <details
      className={classNames("form-panel", className)}
      data-tone={tone}
      id={id}
      open={defaultOpen}
    >
      <summary className="form-panel__summary" onMouseDown={keepFocusOnPointer}>
        <span className="form-panel__icon">
          <Icon className="size-4" name={icon} />
        </span>
        <span className="form-panel__text">
          <strong>{title}</strong>
          {description ? <small>{description}</small> : null}
        </span>
        <span className="form-panel__toggle">
          <span className="form-panel__closed">Abrir</span>
          <span className="form-panel__opened">Fechar</span>
          <Icon className="form-panel__chevron size-4" name="chevron-down" />
        </span>
      </summary>
      <div className="form-panel__body">{children}</div>
    </details>
  );
}

/** Grupo de campos opcionais dentro de um formulário, recolhido até ser necessário. */
export function FormMore({
  children,
  className,
  defaultOpen = false,
  description,
  icon = "sliders",
  title,
}: {
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
  description?: string;
  icon?: IconName;
  title: string;
}) {
  return (
    <details className={classNames("form-more", className)} open={defaultOpen}>
      <summary className="form-more__summary" onMouseDown={keepFocusOnPointer}>
        <span className="form-more__icon">
          <Icon className="size-4" name={icon} />
        </span>
        <span className="form-more__text">
          <strong>{title}</strong>
          {description ? <small>{description}</small> : null}
        </span>
        <Icon className="form-more__chevron size-4" name="chevron-down" />
      </summary>
      <div className="form-more__body">{children}</div>
    </details>
  );
}
