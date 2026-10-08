"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from "react";

import type { ActionState } from "@/lib/forms/action-state";

import { FormFeedbackContext } from "./form-context";
import { pushToast } from "./toast-store";

type FieldControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
type SubmitHandler = NonNullable<ComponentProps<"form">["onSubmit"]>;
type InputHandler = NonNullable<ComponentProps<"form">["onInput"]>;

const noErrors: Record<string, string> = {};

function isFieldControl(element: Element): element is FieldControl {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  );
}

/**
 * Nome do campo como o servidor o conhece. Campos mascarados (dinheiro, data, percentual)
 * enviam o valor por um `hidden` e deixam o controle visível sem `name`; `data-field`
 * liga o que o usuário enxerga ao que o servidor valida.
 */
function fieldKey(control: HTMLElement) {
  return control.dataset.field || control.getAttribute("name") || "";
}

/** Motivo da recusa em português, no lugar do balão nativo do navegador. */
export function describeValidity(control: FieldControl): string {
  const { validity } = control;
  const type = control instanceof HTMLInputElement ? control.type : "";
  if (validity.valueMissing) {
    if (type === "checkbox") return "Marque esta opção para continuar.";
    return control.dataset.requiredMessage ?? "Preencha este campo.";
  }
  if (validity.customError) return control.validationMessage;
  if (validity.typeMismatch) {
    if (type === "email") return "Informe um e-mail válido, como nome@empresa.com.br.";
    return "Informe um endereço válido.";
  }
  if (validity.patternMismatch) {
    return control.dataset.patternMessage ?? "Confira o formato deste campo.";
  }
  if (validity.tooShort && "minLength" in control) {
    return `Use pelo menos ${control.minLength} caracteres.`;
  }
  if (validity.tooLong && "maxLength" in control) {
    return `Use no máximo ${control.maxLength} caracteres.`;
  }
  return "Confira o valor informado.";
}

const textualTypes = new Set(["email", "password", "search", "tel", "text", "textarea", "url"]);

/**
 * O que impede o envio deste controle, ou `null`. Além das restrições do HTML, confere
 * duas coisas que o navegador deixa passar e o servidor recusa depois de aparar o texto:
 * campo obrigatório só com espaços e texto mais curto que o mínimo — que o HTML só acusa
 * quando a última alteração do valor foi uma digitação do usuário.
 */
function fieldProblem(control: FieldControl): string | null {
  if (!control.validity.valid) return describeValidity(control);
  if (control instanceof HTMLSelectElement || !textualTypes.has(control.type)) return null;
  // Espaço faz parte de uma senha; nos demais campos o servidor apara antes de conferir.
  const text = control.type === "password" ? control.value : control.value.trim();
  if (control.required && !text) return control.dataset.requiredMessage ?? "Preencha este campo.";
  if (control.minLength > 0 && text && text.length < control.minLength) {
    return `Use pelo menos ${control.minLength} caracteres.`;
  }
  return null;
}

/** Percorre os controles do formulário e devolve o primeiro erro de cada campo. */
export function collectInvalidFields(form: HTMLFormElement) {
  const errors: Record<string, string> = {};
  let first: FieldControl | null = null;
  let anonymous = 0;
  for (const element of Array.from(form.elements)) {
    if (!isFieldControl(element) || !element.willValidate) continue;
    const problem = fieldProblem(element);
    if (!problem) continue;
    // Controle sem nome não tem onde mostrar a mensagem, mas ainda precisa barrar o envio.
    const key = fieldKey(element) || `:${anonymous++}`;
    if (errors[key]) continue;
    errors[key] = problem;
    first ??= element;
  }
  return { errors, first };
}

function findControl(form: HTMLFormElement, name: string) {
  return Array.from(form.elements).find(
    (element): element is FieldControl =>
      isFieldControl(element) && element.type !== "hidden" && fieldKey(element) === name,
  );
}

function controlLabel(control: FieldControl | undefined) {
  if (!control) return "";
  return (
    control.dataset.fieldLabel ||
    control.getAttribute("aria-label") ||
    control.labels?.[0]?.textContent?.trim() ||
    ""
  );
}

function summarize(form: HTMLFormElement, errors: Record<string, string>) {
  const names = Object.keys(errors);
  if (names.length > 1) {
    return `${names.length} campos precisam de atenção. Eles estão destacados em vermelho.`;
  }
  const label = controlLabel(findControl(form, names[0] ?? ""));
  return label ? `Confira o campo “${label}”.` : "Confira o campo destacado em vermelho.";
}

/**
 * Leva o usuário até o campo: abre qualquer bloco recolhido no caminho, rola e foca.
 * Erro em campo escondido atrás de um disclosure fechado é o mesmo que erro nenhum.
 */
function revealControl(control: HTMLElement) {
  for (let node = control.parentElement; node; node = node.parentElement) {
    if (node instanceof HTMLDetailsElement && !node.open) {
      // O auto-scroll de disclosure brigaria com o foco no campo; quem rola é este fluxo.
      node.dataset.skipAutoScroll = "true";
      node.open = true;
    }
  }
  const reducedMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  control.scrollIntoView?.({
    behavior: reducedMotion ? "auto" : "smooth",
    block: "center",
  });
  control.focus({ preventScroll: true });
}

export type FormProps = Omit<ComponentProps<"form">, "noValidate" | "ref"> & {
  /** Estado devolvido pela action (`useActionState`): marca os campos e dispara o aviso. */
  state?: ActionState;
  /** Regras entre campos que o HTML não expressa. Devolve o erro por nome de campo. */
  validate?: (formData: FormData) => Record<string, string>;
};

/**
 * Formulário padrão do sistema. Substitui o balão nativo do navegador por um retorno
 * único: campo destacado, mensagem logo abaixo dele e uma notificação resumindo o que
 * falta — tanto para o que é barrado aqui quanto para o que o servidor recusa.
 */
export function Form({ children, onInput, onSubmit, state, validate, ...properties }: FormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const pendingReveal = useRef<HTMLElement | null>(null);
  const [errors, setErrors] = useState(noErrors);
  const [trackedState, setTrackedState] = useState(state);
  const [revealTick, setRevealTick] = useState(0);

  // Resposta nova do servidor substitui as marcas anteriores.
  if (trackedState !== state) {
    setTrackedState(state);
    setErrors(state?.status === "error" ? (state.fieldErrors ?? noErrors) : noErrors);
  }

  const clear = useCallback((name: string) => {
    setErrors((current) => {
      if (!(name in current)) return current;
      const rest = { ...current };
      delete rest[name];
      return rest;
    });
  }, []);

  const feedback = useMemo(() => ({ clear, errors }), [clear, errors]);

  useEffect(() => {
    // Action que termina na própria tela (sem redirecionar) confirma pelo mesmo canal.
    if (state?.status === "success" && state.message) {
      pushToast({ group: "form", message: state.message, tone: "success" });
    }
    if (state?.status !== "error") return;
    const marked = Object.keys(state.fieldErrors ?? {}).length > 0;
    if (state.message) {
      pushToast({
        group: "form",
        message: state.message,
        title: marked ? "Revise o formulário" : undefined,
        tone: "error",
      });
    }
    const target = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (target) revealControl(target);
  }, [state]);

  useEffect(() => {
    if (!revealTick) return;
    const target =
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? pendingReveal.current;
    pendingReveal.current = null;
    if (target) revealControl(target);
  }, [revealTick]);

  const handleSubmit: SubmitHandler = (event) => {
    onSubmit?.(event);
    if (event.defaultPrevented) return;
    const form = event.currentTarget;
    const found = collectInvalidFields(form);
    const next = {
      ...(validate ? validate(new FormData(form)) : noErrors),
      ...found.errors,
    };
    if (!Object.keys(next).length) {
      setErrors(noErrors);
      return;
    }
    event.preventDefault();
    pendingReveal.current = found.first;
    setErrors(next);
    setRevealTick((tick) => tick + 1);
    pushToast({
      group: "form",
      message: summarize(form, next),
      title: "Revise o formulário",
      tone: "error",
    });
  };

  const handleInput: InputHandler = (event) => {
    onInput?.(event);
    if (event.target instanceof HTMLElement) clear(fieldKey(event.target));
  };

  return (
    <FormFeedbackContext.Provider value={feedback}>
      <form {...properties} noValidate onInput={handleInput} onSubmit={handleSubmit} ref={formRef}>
        {children}
      </form>
    </FormFeedbackContext.Provider>
  );
}
