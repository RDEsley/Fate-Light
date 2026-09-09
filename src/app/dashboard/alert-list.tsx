import type { Route } from "next";
import Link from "next/link";

import { Icon, type IconName } from "@/components/ui/icon";

export type AlertItem = {
  /** Rota do próprio registro: âncora na lista da área, para não obrigar a procurar. */
  href: Route;
  id: string;
  /** Contexto curto: cliente, empresa/marca e vencimento. */
  meta: string;
  title: string;
};

const toneClasses = {
  danger: "bg-negative-soft text-negative",
  warning: "bg-warning-soft text-warning",
};

/**
 * Painel de alertas do dashboard. A contagem vem do resumo do banco e pode ser maior que a
 * prévia listada; o link do cabeçalho é o caminho para o restante.
 */
export function AlertList({
  count,
  empty,
  href,
  icon = "alert",
  items,
  title,
  tone,
}: {
  count: number;
  empty: string;
  href: Route;
  icon?: IconName;
  items: AlertItem[];
  title: string;
  tone: "danger" | "warning";
}) {
  return (
    <section className="alert-panel" data-tone={tone}>
      <div className="alert-panel__head">
        <div className="alert-panel__title">
          <span className={`alert-panel__icon ${toneClasses[tone]}`}>
            <Icon className="size-4" name={icon} />
          </span>
          <h2>{title}</h2>
          <span className="alert-panel__badge">{count}</span>
        </div>
        <Link className="alert-panel__all" href={href}>
          Ver todos
        </Link>
      </div>
      {items.length ? (
        <div className="alert-panel__list">
          {items.map((item) => (
            <Link className="alert-panel__item" href={item.href} key={item.id}>
              <strong>{item.title}</strong>
              <small>{item.meta}</small>
            </Link>
          ))}
        </div>
      ) : (
        <p className="alert-panel__empty">
          <Icon className="size-4 shrink-0" name="check" /> {empty}
        </p>
      )}
    </section>
  );
}
