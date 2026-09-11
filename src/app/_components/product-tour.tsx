"use client";

import { useCallback, useEffect, useState } from "react";

import { Icon, type IconName } from "@/components/ui/icon";

type TourStep = {
  description: string;
  icon: IconName;
  /** Valor de `data-tour` do elemento destacado; sem alvo, o passo é centralizado. */
  target?: string;
  title: string;
};

const steps: TourStep[] = [
  {
    description:
      "Você permanece neste painel durante o tutorial. Aqui entram o que entrou, o que saiu e o que precisa de ação, no período que você escolher.",
    icon: "dashboard",
    target: "nav-dashboard",
    title: "Tudo começa aqui",
  },
  {
    description:
      "No menu, a aba Clientes é o ponto de partida: cadastre o cliente uma vez. É dele que nascem os serviços, e dos serviços nascem as cobranças.",
    icon: "users",
    target: "nav-clientes",
    title: "Primeiro o cliente",
  },
  {
    description:
      "A aba Serviços é a engrenagem principal: ao aplicar um serviço no card do cliente, o sistema cria a cobrança e já agenda a próxima do ciclo.",
    icon: "briefcase",
    target: "nav-servicos",
    title: "Depois o serviço",
  },
  {
    description:
      "Em Cobranças elas aparecem prontas. As pendentes ficam no topo pela ordem de vencimento; ao receber, descem para as resolvidas.",
    icon: "receipt",
    target: "nav-cobrancas",
    title: "As cobranças se cuidam",
  },
  {
    description:
      "O sino avisa antes do vencimento e leva direto ao item citado. Você escolhe a antecedência no seu perfil.",
    icon: "bell",
    target: "notifications",
    title: "Nada vence sem aviso",
  },
];

export const tourCompleteStorageKey = "fate-light:tour-complete";
const padding = 8;

type Spotlight = { height: number; left: number; top: number; width: number };

export function ProductTour() {
  const [step, setStep] = useState<number | null>(null);
  const [spotlight, setSpotlight] = useState<Spotlight | null>(null);

  useEffect(() => {
    // Adiado por um tick: ler storage antes da hidratação causaria divergência entre o
    // HTML do servidor e o do cliente.
    const timeout = window.setTimeout(() => {
      if (window.localStorage.getItem(tourCompleteStorageKey) === "yes") return;
      setStep(0);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const current = step === null ? null : steps[step];

  const finish = useCallback(() => {
    window.localStorage.setItem(tourCompleteStorageKey, "yes");
    setStep(null);
  }, []);

  const measure = useCallback(() => {
    if (!current?.target) {
      setSpotlight(null);
      return;
    }
    const element = document.querySelector<HTMLElement>(`[data-tour="${current.target}"]`);
    if (!element) {
      setSpotlight(null);
      return;
    }
    const rect = element.getBoundingClientRect();
    setSpotlight({
      height: rect.height + padding * 2,
      left: rect.left - padding,
      top: rect.top - padding,
      width: rect.width + padding * 2,
    });
  }, [current]);

  useEffect(() => {
    if (step === null) return;
    const frame = window.requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure, step]);

  useEffect(() => {
    if (step === null) return;
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
    };
    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [finish, step]);

  if (step === null || !current) return null;

  const last = step === steps.length - 1;

  return (
    <div className="tour" role="presentation">
      {spotlight ? (
        <span
          aria-hidden="true"
          className="tour__spotlight"
          style={{
            height: spotlight.height,
            left: spotlight.left,
            top: spotlight.top,
            width: spotlight.width,
          }}
        />
      ) : (
        <span aria-hidden="true" className="tour__scrim" />
      )}

      <section
        aria-labelledby="tour-title"
        aria-modal="true"
        className="tour__card"
        data-centered={spotlight ? undefined : "true"}
        role="dialog"
        style={
          spotlight
            ? {
                left: Math.min(Math.max(12, spotlight.left), Math.max(12, window.innerWidth - 360)),
                top: Math.min(
                  spotlight.top + spotlight.height + 12,
                  Math.max(12, window.innerHeight - 260),
                ),
              }
            : undefined
        }
      >
        <span className="tour__icon">
          <Icon className="size-5" name={current.icon} />
        </span>
        <p className="tour__eyebrow">
          Primeiros passos · {step + 1} de {steps.length}
        </p>
        <h2 id="tour-title">{current.title}</h2>
        <p className="tour__text">{current.description}</p>
        <div className="tour__dots" aria-hidden="true">
          {steps.map((entry, index) => (
            <span data-active={index === step ? "true" : undefined} key={entry.title} />
          ))}
        </div>
        <div className="tour__actions">
          <button className="tour__skip" onClick={finish} type="button">
            {last ? "Fechar" : "Pular tutorial"}
          </button>
          <div className="flex gap-2">
            {step > 0 ? (
              <button className="modal-cancel" onClick={() => setStep(step - 1)} type="button">
                Voltar
              </button>
            ) : null}
            <button
              className="modal-confirm"
              onClick={() => (last ? finish() : setStep(step + 1))}
              type="button"
            >
              {last ? "Começar a usar" : "Próximo"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
