"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { formatDatePtBr, isoToday, parseDatePtBr } from "@/features/mvp/format";

import { classNames, Field } from "./field";
import { useFieldFeedback } from "./form-context";
import { Icon } from "./icon";
import { SelectField } from "./select-field";
import { scrollPopoverIntoView } from "./disclosure-auto-scroll";

/** Empresa, marca ou projeto sob um cliente (ADR-0020). Sempre um vínculo opcional. */
export type ClientEntityOption = {
  clientId: string;
  id: string;
  name: string;
  typeLabel: string;
};

/**
 * Escolha da empresa/marca dentro do cliente já selecionado. O campo só aparece quando
 * há algo a escolher: oferecer um seletor vazio em cliente sem empresa cadastrada só
 * acrescenta ruído ao formulário.
 */
export function EntitySelect({
  className,
  clientId,
  defaultValue = "",
  entities,
  error,
  label = "Empresa ou marca",
  name = "clientEntityId",
}: {
  className?: string;
  clientId: string | null;
  defaultValue?: string;
  entities: ClientEntityOption[];
  error?: string;
  label?: string;
  name?: string;
}) {
  const available = useMemo(
    () => entities.filter((entity) => entity.clientId === clientId),
    [clientId, entities],
  );

  if (!clientId || !available.length) return <input name={name} type="hidden" value="" />;

  const selected = available.some((entity) => entity.id === defaultValue) ? defaultValue : "";
  return (
    // Remonta ao trocar de cliente: a lista muda e o valor anterior deixa de existir.
    <SelectField
      className={className}
      defaultValue={selected}
      error={error}
      key={clientId}
      label={label}
      name={name}
      optional
      options={[
        {
          description: "Sem separar por empresa, marca ou projeto",
          label: "Geral / sem empresa",
          value: "",
        },
        ...available.map((entity) => ({
          description: entity.typeLabel,
          label: entity.name,
          value: entity.id,
        })),
      ]}
      placeholder="Geral / sem empresa"
    />
  );
}

export type ClientOption = {
  email?: string | null;
  id: string;
  name: string;
  status: string;
  tradeName?: string | null;
};

type ClientFilter = "active" | "all" | "inactive";

const statusLabels: Record<string, string> = {
  active: "Ativo",
  blacklist: "Lista negra",
  budget: "Orçamento",
  inactive: "Inativo",
  pending: "Pendente",
};

export function ClientCombobox({
  className,
  clients,
  defaultFilter = "active",
  defaultValue = "",
  error,
  hint,
  label = "Cliente",
  name = "clientId",
  onSelect,
  optional = false,
}: {
  className?: string;
  clients: ClientOption[];
  defaultFilter?: ClientFilter;
  defaultValue?: string;
  error?: string;
  hint?: string;
  label?: string;
  name?: string;
  onSelect?: (client: ClientOption | null) => void;
  optional?: boolean;
}) {
  const listId = useId();
  const errorId = `${listId}-error`;
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const feedback = useFieldFeedback(name, error);
  const initial = clients.find((client) => client.id === defaultValue);
  const [filter, setFilter] = useState<ClientFilter>(defaultFilter);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(initial?.name ?? "");
  const [selectedId, setSelectedId] = useState(defaultValue);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const closeWhenOutside = (event: Event) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    // `focusin` cobre a saída por Tab: sem ele a lista ficava aberta sobre o campo seguinte.
    document.addEventListener("pointerdown", closeWhenOutside);
    document.addEventListener("focusin", closeWhenOutside);
    return () => {
      document.removeEventListener("pointerdown", closeWhenOutside);
      document.removeEventListener("focusin", closeWhenOutside);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    scrollPopoverIntoView(
      rootRef.current?.querySelector<HTMLElement>(".client-combobox__popover") ?? null,
    );
  }, [open]);

  // A obrigatoriedade mora no campo visível, não no `hidden`: input oculto fica fora da
  // validação de restrições do HTML, então `required` ali não impedia nada e o envio sem
  // cliente escolhido só era barrado no servidor, com o formulário inteiro perdido.
  useEffect(() => {
    searchRef.current?.setCustomValidity(
      optional || selectedId ? "" : "Escolha um cliente da lista.",
    );
  }, [optional, selectedId]);

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

  // Nomes iguais são comuns (duas filiais, dois "Studio X"). Quando isso acontece, o
  // rótulo secundário deixa de ser opcional: é o único jeito de saber quem é quem.
  const duplicatedNames = useMemo(() => {
    const seen = new Set<string>();
    const repeated = new Set<string>();
    for (const client of clients) {
      const key = client.name.toLocaleLowerCase("pt-BR");
      if (seen.has(key)) repeated.add(key);
      seen.add(key);
    }
    return repeated;
  }, [clients]);

  const describe = (client: ClientOption) => {
    const status = statusLabels[client.status] ?? "Inativo";
    const detail = client.tradeName || client.email;
    if (detail) return `${status} · ${detail}`;
    if (duplicatedNames.has(client.name.toLocaleLowerCase("pt-BR"))) {
      return `${status} · sem dado para diferenciar (código ${client.id.slice(0, 8)})`;
    }
    return status;
  };

  const selectClient = (client: ClientOption) => {
    setQuery(client.name);
    setSelectedId(client.id);
    setOpen(false);
    feedback.clear();
    onSelect?.(client);
  };

  const highlighted = Math.min(activeIndex, Math.max(visibleClients.length - 1, 0));

  return (
    <Field
      className={classNames("client-combobox", className)}
      error={feedback.error}
      errorId={errorId}
      hint={hint}
      htmlFor={`${listId}-search`}
      label={label}
      optional={optional}
      ref={rootRef}
    >
      <input name={name} type="hidden" value={selectedId} />
      <div className="client-combobox__control">
        <Icon className="text-muted size-4" name="search" />
        <input
          aria-autocomplete="list"
          aria-controls={listId}
          aria-describedby={feedback.error ? errorId : undefined}
          aria-expanded={open}
          aria-invalid={feedback.error ? true : undefined}
          autoComplete="off"
          data-field={name}
          id={`${listId}-search`}
          ref={searchRef}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedId("");
            setActiveIndex(0);
            setOpen(true);
            feedback.clear();
            if (selectedId) onSelect?.(null);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              const step = event.key === "ArrowDown" ? 1 : -1;
              const last = Math.max(visibleClients.length - 1, 0);
              setActiveIndex(Math.min(Math.max(highlighted + step, 0), last));
            }
            if (event.key === "Enter" && open && visibleClients[highlighted]) {
              event.preventDefault();
              selectClient(visibleClients[highlighted]);
            }
          }}
          placeholder="Digite para buscar..."
          role="combobox"
          type="text"
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
                onClick={() => {
                  setFilter(value);
                  setActiveIndex(0);
                }}
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
                  feedback.clear();
                  onSelect?.(null);
                }}
                role="option"
                type="button"
              >
                <span className="client-combobox__avatar">—</span>
                <span>Sem vínculo com cliente</span>
              </button>
            ) : null}
            {visibleClients.map((client, index) => (
              <button
                aria-selected={selectedId === client.id}
                className="client-combobox__option"
                data-active={index === highlighted ? "true" : undefined}
                key={client.id}
                onClick={() => selectClient(client)}
                onPointerEnter={() => setActiveIndex(index)}
                role="option"
                type="button"
              >
                <span className="client-combobox__avatar">{client.name.slice(0, 1)}</span>
                <span className="min-w-0 flex-1 text-left">
                  <strong className="block truncate">{client.name}</strong>
                  <small className="block truncate">{describe(client)}</small>
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
    </Field>
  );
}

const invalidDateMessage = "Informe uma data válida no formato DD/MM/AAAA.";

export function DateField({
  className,
  defaultValue,
  error,
  hint,
  label,
  name,
  onValueChange,
  optional = false,
  required = false,
}: {
  className?: string;
  defaultValue?: string;
  error?: string;
  hint?: string;
  label: string;
  name: string;
  onValueChange?: (isoDate: string) => void;
  optional?: boolean;
  required?: boolean;
}) {
  const calendarId = useId();
  const errorId = `${calendarId}-error`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const feedback = useFieldFeedback(name, error);
  const initialValue = defaultValue ?? "";
  const [dateValue, setDateValue] = useState(initialValue);
  const [displayValue, setDisplayValue] = useState(
    initialValue ? formatDatePtBr(initialValue) : "",
  );
  const [open, setOpen] = useState(false);
  const [monthCursor, setMonthCursor] = useState(`${(initialValue || isoToday()).slice(0, 7)}-01`);

  const commitDate = (iso: string) => {
    setDateValue(iso);
    feedback.clear();
    onValueChange?.(iso);
  };

  useEffect(() => {
    const closeWhenOutside = (event: Event) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeWhenOutside);
    document.addEventListener("focusin", closeWhenOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeWhenOutside);
      document.removeEventListener("focusin", closeWhenOutside);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    scrollPopoverIntoView(rootRef.current?.querySelector<HTMLElement>(".date-calendar") ?? null);
  }, [open]);

  // A restrição acompanha o estado, não o evento de digitação: escolher um dia no
  // calendário depois de digitar uma data incompleta precisa limpar o bloqueio, e ele
  // ficava preso no campo impedindo o envio mesmo com a data já válida.
  useEffect(() => {
    inputRef.current?.setCustomValidity(displayValue && !dateValue ? invalidDateMessage : "");
  }, [dateValue, displayValue]);

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
  const today = isoToday();
  const dayIso = (day: number) =>
    `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;

  const moveMonth = (offset: number) => {
    const next = new Date(Date.UTC(year, month - 1 + offset, 1));
    setMonthCursor(next.toISOString().slice(0, 10));
  };

  const chooseDate = (iso: string) => {
    commitDate(iso);
    setDisplayValue(formatDatePtBr(iso));
    setMonthCursor(`${iso.slice(0, 7)}-01`);
    setOpen(false);
  };

  return (
    <Field
      className={classNames("date-field-root", className)}
      error={feedback.error}
      errorId={errorId}
      hint={hint}
      htmlFor={`${calendarId}-input`}
      label={label}
      optional={optional}
      ref={rootRef}
    >
      <span className="date-field">
        <input name={name} type="hidden" value={dateValue} />
        <input
          aria-controls={calendarId}
          aria-describedby={feedback.error ? errorId : undefined}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-invalid={feedback.error ? true : undefined}
          autoComplete="off"
          data-field={name}
          data-required-message="Informe a data."
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
            commitDate(parsed ?? "");
            if (parsed) setMonthCursor(`${parsed.slice(0, 7)}-01`);
          }}
          onFocus={() => setOpen(true)}
          placeholder="DD/MM/AAAA"
          ref={inputRef}
          required={required}
          role="combobox"
          type="text"
          value={displayValue}
        />
        <Icon className="date-field__icon pointer-events-none size-4" name="calendar" />
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
                  aria-selected={dateValue === dayIso(day)}
                  className={today === dayIso(day) ? "is-today" : undefined}
                  key={`${year}-${month}-${day}`}
                  onClick={() => chooseDate(dayIso(day))}
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
          <button className="date-calendar__today" onClick={() => chooseDate(today)} type="button">
            Hoje
          </button>
        </span>
      ) : null}
    </Field>
  );
}
