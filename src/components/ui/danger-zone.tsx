import type { ReactNode } from "react";

import { Icon } from "./icon";

/**
 * Envelope único das ações destrutivas do sistema. Sempre fechado por padrão: o que
 * apaga dados não deve competir por atenção com o uso normal da tela.
 */
export function DangerZone({
  children,
  description,
  summary = "Opções avançadas e exclusões",
  title,
}: {
  children: ReactNode;
  description: string;
  summary?: string;
  title: string;
}) {
  return (
    <details className="danger-zone form-disclosure mt-8">
      <summary className="flex cursor-pointer items-center justify-between gap-3">
        <span className="text-muted flex items-center gap-2 text-sm font-bold">
          <Icon className="size-4" name="settings" /> {summary}
        </span>
        <span className="text-muted flex items-center gap-1 text-xs">
          <span className="form-disclosure__closed-label">Ver</span>
          <span className="form-disclosure__open-label">Fechar</span>
          <Icon className="form-disclosure__chevron size-4" name="chevron-down" />
        </span>
      </summary>
      <div className="mt-4">
        <div className="section-heading mb-4">
          <span className="section-heading__icon bg-negative-soft text-negative">
            <Icon name="alert" />
          </span>
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
        </div>
        <div className="danger-zone__items">{children}</div>
      </div>
    </details>
  );
}

/** Uma linha da zona de risco: explicação à esquerda, ação à direita. */
export function DangerAction({
  action,
  description,
  title,
}: {
  action: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="danger-zone__row">
      <div className="min-w-0">
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
