"use client";

import { useEffect, useState } from "react";

import { applyMotionPreferences, motionPreferenceKeys } from "./motion-experience";
import { Icon } from "./ui/icon";

export const accessibilityPreferenceKeys = {
  contrast: "fate-light:high-contrast",
  links: "fate-light:emphasize-links",
  text: "fate-light:large-text",
} as const;

function enabled(key: string) {
  return window.localStorage.getItem(key) === "on";
}

export function applyAccessibilityPreferences() {
  const root = document.documentElement;
  root.dataset.contrast = enabled(accessibilityPreferenceKeys.contrast) ? "high" : "standard";
  root.dataset.linkEmphasis = enabled(accessibilityPreferenceKeys.links) ? "on" : "off";
  root.dataset.textSize = enabled(accessibilityPreferenceKeys.text) ? "large" : "standard";
  applyMotionPreferences();
}

type Preferences = {
  contrast: boolean;
  links: boolean;
  mouseMotion: boolean;
  systemMotion: boolean;
  text: boolean;
};

const defaults: Preferences = {
  contrast: false,
  links: false,
  mouseMotion: true,
  systemMotion: true,
  text: false,
};

export function AccessibilityMenu() {
  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState(defaults);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPreferences({
        contrast: enabled(accessibilityPreferenceKeys.contrast),
        links: enabled(accessibilityPreferenceKeys.links),
        mouseMotion: window.localStorage.getItem(motionPreferenceKeys.mouse) !== "off",
        systemMotion: window.localStorage.getItem(motionPreferenceKeys.system) !== "off",
        text: enabled(accessibilityPreferenceKeys.text),
      });
      applyAccessibilityPreferences();
    }, 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const update = (name: keyof Preferences, value: boolean) => {
    const keys: Record<keyof Preferences, string> = {
      contrast: accessibilityPreferenceKeys.contrast,
      links: accessibilityPreferenceKeys.links,
      mouseMotion: motionPreferenceKeys.mouse,
      systemMotion: motionPreferenceKeys.system,
      text: accessibilityPreferenceKeys.text,
    };
    setPreferences((current) => ({ ...current, [name]: value }));
    window.localStorage.setItem(keys[name], value ? "on" : "off");
    applyAccessibilityPreferences();
    window.dispatchEvent(new Event("fate-light:motion-change"));
  };

  const reset = () => {
    Object.values(accessibilityPreferenceKeys).forEach((key) =>
      window.localStorage.removeItem(key),
    );
    window.localStorage.removeItem(motionPreferenceKeys.mouse);
    window.localStorage.removeItem(motionPreferenceKeys.system);
    setPreferences(defaults);
    applyAccessibilityPreferences();
    window.dispatchEvent(new Event("fate-light:motion-change"));
  };

  return (
    <div className="accessibility-widget">
      {open ? (
        <section
          aria-label="Opções de acessibilidade"
          className="accessibility-panel panel-card"
          id="accessibility-panel"
          role="dialog"
        >
          <div className="flex items-start justify-between gap-4 border-b pb-4">
            <div>
              <p className="font-black">Acessibilidade</p>
              <p className="text-muted mt-1 text-xs">Ajustes salvos neste dispositivo.</p>
            </div>
            <button
              aria-label="Fechar acessibilidade"
              className="hover:bg-brand-soft grid size-9 place-items-center rounded-xl"
              onClick={() => setOpen(false)}
              type="button"
            >
              <Icon className="size-4" name="x" />
            </button>
          </div>
          <div className="divide-line divide-y py-2">
            <AccessibilityToggle
              checked={preferences.text}
              description="Aumenta textos e controles sem ampliar o navegador."
              label="Texto maior"
              onChange={(value) => update("text", value)}
            />
            <AccessibilityToggle
              checked={preferences.contrast}
              description="Reforça bordas, textos secundários e foco."
              label="Contraste reforçado"
              onChange={(value) => update("contrast", value)}
            />
            <AccessibilityToggle
              checked={preferences.links}
              description="Sublinha links de texto para facilitar o reconhecimento."
              label="Destacar links"
              onChange={(value) => update("links", value)}
            />
            <AccessibilityToggle
              checked={preferences.mouseMotion}
              description="Exibe o pequeno efeito divertido ao clicar."
              label="Efeito de clique"
              onChange={(value) => update("mouseMotion", value)}
            />
            <AccessibilityToggle
              checked={preferences.systemMotion}
              description="Mantém transições e entradas dos componentes."
              label="Animações do sistema"
              onChange={(value) => update("systemMotion", value)}
            />
          </div>
          <button
            className="border-line hover:bg-brand-soft min-h-10 w-full rounded-xl border text-sm font-black"
            onClick={reset}
            type="button"
          >
            Restaurar padrão
          </button>
        </section>
      ) : null}
      <button
        aria-controls="accessibility-panel"
        aria-expanded={open}
        aria-label="Abrir opções de acessibilidade"
        className="accessibility-launcher"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <Icon className="size-6" name="accessibility" />
      </button>
    </div>
  );
}

function AccessibilityToggle({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
      <span>
        <strong className="block text-sm">{label}</strong>
        <span className="text-muted mt-0.5 block text-xs leading-5">{description}</span>
      </span>
      <input
        checked={checked}
        className="preference-switch"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
    </label>
  );
}
