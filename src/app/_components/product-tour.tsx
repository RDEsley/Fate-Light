"use client";

import { useEffect, useState } from "react";

import { Icon, type IconName } from "@/components/ui/icon";

const steps: { description: string; icon: IconName; title: string }[] = [
  {
    description:
      "A barra lateral organiza sua rotina. Recolha quando quiser ganhar ainda mais espaço.",
    icon: "menu",
    title: "Tudo no lugar certo",
  },
  {
    description: "O sino reúne cobranças, despesas e domínios que precisam da sua atenção.",
    icon: "bell",
    title: "Nada passa despercebido",
  },
  {
    description: "Use os atalhos do dashboard para registrar o trabalho sem procurar por telas.",
    icon: "sparkles",
    title: "Menos cliques, mais controle",
  },
];

export function ProductTour() {
  const [step, setStep] = useState<number | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (window.localStorage.getItem("fate-light:tour-complete") !== "yes") setStep(0);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  if (step === null) return null;
  const current = steps[step];
  const close = () => {
    window.localStorage.setItem("fate-light:tour-complete", "yes");
    setStep(null);
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-end bg-slate-950/25 p-4 backdrop-blur-[2px] sm:place-items-center">
      <section
        aria-labelledby="tour-title"
        aria-modal="true"
        className="cartoon-card w-full max-w-md overflow-hidden bg-white"
        role="dialog"
      >
        <div className="bg-brand-soft relative overflow-hidden p-6">
          <span className="border-brand/30 absolute -top-8 -right-5 size-24 rounded-full border-2 border-dashed" />
          <span className="bg-brand text-brand-contrast grid size-12 place-items-center rounded-2xl border-2 border-slate-700 shadow-[3px_3px_0_rgba(37,50,58,.16)]">
            <Icon className="size-6" name={current.icon} />
          </span>
          <p className="text-brand-strong mt-5 text-xs font-bold tracking-[0.12em] uppercase">
            Primeiros passos · {step + 1} de {steps.length}
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]" id="tour-title">
            {current.title}
          </h2>
          <p className="text-muted mt-2 leading-6">{current.description}</p>
        </div>
        <div className="flex items-center justify-between gap-3 p-5">
          <button
            className="text-muted min-h-11 px-3 text-sm font-bold"
            onClick={close}
            type="button"
          >
            Pular tutorial
          </button>
          <button
            className="bg-brand text-brand-contrast border-brand-strong min-h-11 rounded-xl border-2 px-5 font-bold shadow-[2px_2px_0_rgba(37,50,58,.16)]"
            onClick={() => (step === steps.length - 1 ? close() : setStep(step + 1))}
            type="button"
          >
            {step === steps.length - 1 ? "Começar" : "Próximo"}
          </button>
        </div>
      </section>
    </div>
  );
}
