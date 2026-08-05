"use client";

import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/icon";

import { applyMotionPreferences, motionPreferenceKeys } from "./motion-experience";

function readPreference(key: string) {
  return window.localStorage.getItem(key) !== "off";
}

export function MotionSettings() {
  const [mouseMotion, setMouseMotion] = useState(true);
  const [systemMotion, setSystemMotion] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setMouseMotion(readPreference(motionPreferenceKeys.mouse));
      setSystemMotion(readPreference(motionPreferenceKeys.system));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const update = (key: string, enabled: boolean, setter: (value: boolean) => void) => {
    setter(enabled);
    window.localStorage.setItem(key, enabled ? "on" : "off");
    applyMotionPreferences();
    window.dispatchEvent(new Event("fate-light:motion-change"));
  };

  return (
    <section className="panel-card space-y-5" id="experiencia">
      <div className="section-heading">
        <span className="section-heading__icon bg-violet-100 text-violet-700">
          <Icon name="sparkles" />
        </span>
        <div>
          <h2>Experiência do sistema</h2>
          <p>Controle os movimentos divertidos sem afetar suas informações.</p>
        </div>
      </div>
      <div className="divide-line divide-y">
        <PreferenceToggle
          checked={mouseMotion}
          description="Pequena animação divertida ao clicar, sem rastro no cursor."
          label="Animações do mouse"
          onChange={(enabled) => update(motionPreferenceKeys.mouse, enabled, setMouseMotion)}
        />
        <PreferenceToggle
          checked={systemMotion}
          description="Transições, entradas e pequenos movimentos dos componentes."
          label="Animações do sistema"
          onChange={(enabled) => update(motionPreferenceKeys.system, enabled, setSystemMotion)}
        />
      </div>
      <p className="helper-note">
        <Icon className="size-4" name="alert" /> A preferência de movimento reduzido do seu
        dispositivo sempre tem prioridade.
      </p>
    </section>
  );
}

function PreferenceToggle({
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
    <label className="flex cursor-pointer items-center justify-between gap-5 py-4 first:pt-0 last:pb-0">
      <span>
        <strong className="block text-sm">{label}</strong>
        <span className="text-muted mt-1 block text-sm">{description}</span>
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
