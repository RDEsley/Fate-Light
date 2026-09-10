"use client";

import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/icon";

function isFullscreenActive() {
  return Boolean(document.fullscreenElement);
}

export function FullscreenToggle() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const sync = () => setActive(isFullscreenActive());
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const toggle = async () => {
    try {
      if (isFullscreenActive()) {
        await document.exitFullscreen();
        return;
      }
      await document.documentElement.requestFullscreen();
    } catch {
      // Alguns navegadores/dispositivos bloqueiam a API sem feedback útil.
    }
  };

  return (
    <button
      aria-label={active ? "Sair da tela cheia" : "Expandir para tela cheia"}
      aria-pressed={active}
      className="cartoon-card hover:bg-brand-soft grid size-10 place-items-center"
      onClick={() => {
        void toggle();
      }}
      title={active ? "Sair da tela cheia" : "Tela cheia"}
      type="button"
    >
      <Icon className="size-[1.1rem]" name={active ? "minimize" : "maximize"} />
    </button>
  );
}
