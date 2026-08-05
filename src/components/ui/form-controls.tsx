"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { formatDatePtBr, isoToday, parseDatePtBr } from "@/features/mvp/format";

import { Icon } from "./icon";

export type ClientOption = {
  id: string;
  name: string;
  status: string;
  tradeName?: string | null;
};

type ClientFilter = "active" | "all" | "inactive";

export function ClientCombobox({
  clients,
  defaultFilter = "active",
  defaultValue = "",
  label = "Cliente",
  name = "clientId",
  optional = false,
}: {
  clients: ClientOption[];
  defaultFilter?: ClientFilter;
  defaultValue?: string;
  label?: string;
  name?: string;
  optional?: boolean;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const initial = clients.find((client) => client.id === defaultValue);
  const [filter, setFilter] = useState<ClientFilter>(defaultFilter);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(initial?.name ?? "");
  const [selectedId, setSelectedId] = useState(defaultValue);

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  const visibleClients = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return clients
      .filter((client) => filter === "all" || client.status === filter)
      .filter(
        (client) =>
          !normalized ||
          client.name.toLocaleLowerCase("pt-BR").includes(normalized) ||
          client.tradeName?.toLocaleLowerCase("pt-BR").includes(normalized),
      )
      .slice(0, 60);
  }, [clients, filter, query]);

  const selectClient = (client: ClientOption) => {
    setQuery(client.name);
    setSelectedId(client.id);
    setOpen(false);
  };

  return (
    <div className="field client-combobox" ref={rootRef}>
      <label className="field__label" htmlFor={`${listId}-search`}>
        {label} {optional ? <span className="field__optional">opcional</span> : null}
      </label>
      <input name={name} required={!optional} type="hidden" value={selectedId} />
      <div className="client-combobox__control">
        <Icon className="text-muted size-4" name="search" />
        <input
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          autoComplete="off"
          id={`${listId}-search`}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedId("");
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "Enter" && open && visibleClients[0]) {
              event.preventDefault();
              selectClient(visibleClients[0]);
            }
          }}
          placeholder="Digite para buscar..."
          role="combobox"
          type="search"
          value={query}
        />
        {selectedId ? <Icon className="text-positive size-4" name="check" /> : null}
      </div>
      {open ? (
        <div className="client-combobox__popover">
          <div aria-label="Filtrar clientes por status" className="client-combobox__filters">
            {(
              [
                ["active", "Ativos"],
                ["inactive", "Inativos"],
                ["all", "Todos"],
              ] as const
            ).map(([value, text]) => (
              <button
                aria-pressed={filter === value}
                key={value}
                onClick={() => setFilter(value)}
                type="button"
              >
                {text}
              </button>
            ))}
          </div>
          <div className="client-combobox__list" id={listId} role="listbox">
            {optional ? (
              <button
                aria-selected={selectedId === ""}
                className="client-combobox__option"
                onClick={() => {
                  setQuery("");
                  setSelectedId("");
                  setOpen(false);
                }}
                role="option"
                type="button"
              >
                <span className="client-combobox__avatar">—</span>
                <span>Sem vínculo com cliente</span>
              </button>
            ) : null}
            {visibleClients.map((client) => (
              <button
                aria-selected={selectedId === client.id}
                className="client-combobox__option"
                key={client.id}
                onClick={() => selectClient(client)}
                role="option"
                type="button"
              >
                <span className="client-combobox__avatar">{client.name.slice(0, 1)}</span>
                <span className="min-w-0 flex-1 text-left">
                  <strong className="block truncate">{client.name}</strong>
                  <small>{client.status === "active" ? "Ativo" : "Inativo"}</small>
                </span>
              </button>
            ))}
            {!visibleClients.length ? (
              <p className="text-muted px-3 py-5 text-center text-sm">Nenhum cliente encontrado.</p>
            ) : null}
          </div>
          {visibleClients.length === 60 ? (
            <p className="text-muted border-t px-3 py-2 text-xs">
              Continue digitando para refinar os resultados.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function DateField({
  defaultValue,
  label,
  name,
  required = false,
}: {
  defaultValue?: string;
  label: string;
  name: string;
  required?: boolean;
}) {
  const calendarId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const initialValue = defaultValue ?? "";
  const [dateValue, setDateValue] = useState(initialValue);
  const [displayValue, setDisplayValue] = useState(
    initialValue ? formatDatePtBr(initialValue) : "",
  );
  const [open, setOpen] = useState(false);
  const [monthCursor, setMonthCursor] = useState(`${(initialValue || isoToday()).slice(0, 7)}-01`);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, []);

  const [year, month] = monthCursor.split("-").map(Number);
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const calendarDays = Array.from({ length: firstWeekday + daysInMonth }, (_, index) =>
    index < firstWeekday ? null : index - firstWeekday + 1,
  );
  const monthTitle = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${monthCursor}T00:00:00.000Z`));

  const moveMonth = (offset: number) => {
    const next = new Date(Date.UTC(year, month - 1 + offset, 1));
    setMonthCursor(next.toISOString().slice(0, 10));
  };

  const selectDate = (day: number) => {
    const iso = `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
    setDateValue(iso);
    setDisplayValue(formatDatePtBr(iso));
    setOpen(false);
  };

  return (
    <div className="field date-field-root" ref={rootRef}>
      <label className="field__label" htmlFor={`${calendarId}-input`}>
        {label}
      </label>
      <span className="date-field">
        <input name={name} type="hidden" value={dateValue} />
        <input
          aria-controls={calendarId}
          aria-expanded={open}
          aria-haspopup="dialog"
          autoComplete="off"
          id={`${calendarId}-input`}
          inputMode="numeric"
          maxLength={10}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "").slice(0, 8);
            const masked = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)]
              .filter(Boolean)
              .join("/");
            const parsed = parseDatePtBr(masked);
            setDisplayValue(masked);
            setDateValue(parsed ?? "");
            event.currentTarget.setCustomValidity(
              masked && !parsed ? "Informe uma data válida no formato DD/MM/AAAA." : "",
            );
          }}
          onFocus={() => setOpen(true)}
          pattern="\d{2}/\d{2}/\d{4}"
          placeholder="DD/MM/AAAA"
          required={required}
          role="combobox"
          type="text"
          value={displayValue}
        />
        <Icon className="text-brand-strong pointer-events-none size-4" name="calendar" />
      </span>
      {open ? (
        <span className="date-calendar" id={calendarId} role="dialog">
          <span className="date-calendar__header">
            <button aria-label="Mês anterior" onClick={() => moveMonth(-1)} type="button">
              <Icon className="size-4 rotate-90" name="arrow-down" />
            </button>
            <strong className="capitalize">{monthTitle}</strong>
            <button aria-label="Próximo mês" onClick={() => moveMonth(1)} type="button">
              <Icon className="size-4 -rotate-90" name="arrow-down" />
            </button>
          </span>
          <span className="date-calendar__grid" role="grid">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((weekday) => (
              <span className="date-calendar__weekday" key={weekday}>
                {weekday}
              </span>
            ))}
            {calendarDays.map((day, index) =>
              day ? (
                <button
                  aria-label={`${day.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}/${year}`}
                  aria-selected={
                    dateValue ===
                    `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`
                  }
                  className={
                    isoToday() ===
                    `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`
                      ? "is-today"
                      : undefined
                  }
                  key={`${year}-${month}-${day}`}
                  onClick={() => selectDate(day)}
                  role="gridcell"
                  type="button"
                >
                  {day}
                </button>
              ) : (
                <span aria-hidden="true" key={`empty-${index}`} />
              ),
            )}
          </span>
          <button
            className="date-calendar__today"
            onClick={() => {
              const today = isoToday();
              setMonthCursor(`${today.slice(0, 7)}-01`);
              setDateValue(today);
              setDisplayValue(formatDatePtBr(today));
              setOpen(false);
            }}
            type="button"
          >
            Hoje
          </button>
        </span>
      ) : null}
    </div>
  );
}
