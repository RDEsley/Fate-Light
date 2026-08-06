"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { Icon } from "./icon";

export type SoftRequirement = {
  /** Mensagem exibida quando o requisito não é atendido. */
  message: string;
  /** Campo do formulário; com uma lista, basta um deles preenchido para atender. */
  name: string | string[];
  /** Também avisa quando o valor numérico informado for zero. */
  warnOnZero?: boolean;
};

function ActionButton({
  className,
  idleLabel,
  onGuard,
  pendingLabel,
}: {
  className: string;
  idleLabel: string;
  onGuard: (event: React.MouseEvent<HTMLButtonElement>) => void;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending} onClick={onGuard} type="submit">
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}

/**
 * Envio com aviso, não com bloqueio. O primeiro clique com campos importantes em branco
 * apenas lista o que ficou faltando; o clique seguinte envia assim mesmo, porque neste
 * produto errar é decisão do usuário, não do sistema.
 */
export function SoftSubmitButton({
  className = "primary-action",
  idleLabel,
  pendingLabel = "Salvando…",
  requirements,
}: {
  className?: string;
  idleLabel: string;
  pendingLabel?: string;
  requirements: SoftRequirement[];
}) {
  const [warnings, setWarnings] = useState<string[]>([]);

  const guard = (event: React.MouseEvent<HTMLButtonElement>) => {
    const form = event.currentTarget.form;
    if (!form) return;
    const data = new FormData(form);
    const isFilled = (name: string, warnOnZero?: boolean) => {
      const raw = String(data.get(name) ?? "").trim();
      if (!raw) return false;
      return !(warnOnZero && Number(raw) === 0);
    };
    const missing = requirements.filter((requirement) => {
      const names = Array.isArray(requirement.name) ? requirement.name : [requirement.name];
      return !names.some((name) => isFilled(name, requirement.warnOnZero));
    });
    const messages = missing.map((requirement) => requirement.message);
    // O aviso vale por clique, não para sempre: o segundo clique com a mesma pendência
    // envia assim mesmo, mas preencher o campo e voltar a esvaziá-lo avisa de novo, e um
    // envio limpo apaga a lista em vez de deixar um alerta velho na tela.
    const repeated =
      warnings.length === messages.length &&
      messages.every((message, index) => message === warnings[index]);
    setWarnings(messages);
    if (!messages.length || repeated) return;
    event.preventDefault();
  };

  return (
    <div className="soft-submit">
      {warnings.length ? (
        <div className="soft-submit__warnings" role="status">
          <p className="soft-submit__title">
            <Icon className="size-4" name="alert" /> Vale conferir antes de continuar
          </p>
          <ul>
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
          <small>Clique de novo em “{idleLabel}” para seguir mesmo assim.</small>
        </div>
      ) : null}
      <ActionButton
        className={className}
        idleLabel={idleLabel}
        onGuard={guard}
        pendingLabel={pendingLabel}
      />
    </div>
  );
}
