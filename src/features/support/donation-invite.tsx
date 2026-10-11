"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";

import { JarArt, WaveArt } from "./donation-art";
import {
  cardHidden,
  countVisit,
  hideCard,
  inviteAfterVisits,
  inviteLockMs,
  inviteSeen,
  markInviteSeen,
} from "./invite";

type Step = "ask" | "thanks";

/**
 * Convite de doação: um cartão no rodapé do menu e uma janela que abre sozinha uma única vez,
 * depois de algumas visitas. Dispensar o cartão abre a janela mais uma vez e o esconde.
 */
export function DonationInvite({ compact = false }: { compact?: boolean }) {
  const [card, setCard] = useState(false);
  const [step, setStep] = useState<Step | null>(null);
  const [unlocked, setUnlocked] = useState<Step | null>(null);

  useEffect(() => {
    const visits = countVisit();
    const timer = window.setTimeout(() => {
      setCard(!cardHidden());
      if (visits < inviteAfterVisits || inviteSeen()) return;
      markInviteSeen();
      setStep("ask");
    }, 1500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!step) return;
    const timer = window.setTimeout(() => setUnlocked(step), inviteLockMs);
    return () => {
      window.clearTimeout(timer);
      setUnlocked(null);
    };
  }, [step]);

  const locked = unlocked !== step;

  const dismissCard = () => {
    hideCard();
    markInviteSeen();
    setCard(false);
    setStep("ask");
  };

  // Fechar pelo X, pelo Esc ou clicando fora vale como recusar, e só depois da trava.
  const decline = () => {
    if (locked) return;
    setStep(step === "ask" ? "thanks" : null);
  };

  return (
    <>
      {card && !compact ? (
        <aside
          aria-label="Apoiar o Fate Light"
          className="border-line relative mb-3 rounded-xl border-2 bg-white p-3 pr-9"
        >
          <p className="text-sm font-black">O Fate Light te ajuda?</p>
          <Link
            className="text-brand-strong mt-1 inline-flex min-h-8 items-center text-sm font-bold hover:underline"
            href="/apoiar"
          >
            Ajudar com uma doação
          </Link>
          <button
            aria-label="Dispensar o convite de apoio"
            className="text-muted hover:bg-brand-soft absolute top-1.5 right-1.5 grid size-8 place-items-center rounded-lg"
            onClick={dismissCard}
            type="button"
          >
            <Icon className="size-4" name="x" />
          </button>
        </aside>
      ) : null}

      <Modal
        description={
          step === "ask"
            ? "Você já abriu o sistema algumas vezes, então ele deve estar sendo útil. Fico feliz de verdade."
            : "Fique à vontade para usar o Fate Light de graça, sempre que precisar. Saber que ele ajuda a sua rotina já faz valer a pena."
        }
        footer={
          step === "ask" ? (
            <>
              <button
                className="button button--secondary"
                disabled={locked}
                onClick={() => setStep("thanks")}
                type="button"
              >
                Agora não
              </button>
              {locked ? (
                <button className="button button--primary" disabled type="button">
                  Quero ajudar
                </button>
              ) : (
                <Link className="button button--primary" href="/apoiar">
                  Quero ajudar
                </Link>
              )}
            </>
          ) : (
            <>
              <button
                className="button button--secondary"
                onClick={() => setStep("ask")}
                type="button"
              >
                <Icon className="size-4" name="arrow-left" /> Voltar
              </button>
              <button
                className="button button--primary"
                disabled={locked}
                onClick={() => setStep(null)}
                type="button"
              >
                Tudo bem
              </button>
            </>
          )
        }
        onClose={decline}
        open={step !== null}
        title={step === "ask" ? "Que bom ter você por aqui!" : "Tudo bem, obrigado mesmo assim!"}
      >
        {step === "ask" ? (
          <>
            <WaveArt className="mx-auto block h-[9.1rem] w-[10.5rem]" />
            <p className="mt-3 text-sm leading-6">
              Usar o Fate Light não custa nada e vai continuar assim. Mantê-lo no ar e evoluindo dá
              trabalho e tem seus custos. Se quiser ajudar, qualquer valor conta:{" "}
              <strong>R$ 1 já ajuda</strong>.
            </p>
          </>
        ) : (
          <>
            <JarArt className="mx-auto size-36" />
            <p className="mt-3 text-sm leading-6">
              Se um dia quiser apoiar, abra o menu da sua conta e escolha{" "}
              <strong>Apoiar o Fate Light</strong>.
            </p>
          </>
        )}
      </Modal>
    </>
  );
}
