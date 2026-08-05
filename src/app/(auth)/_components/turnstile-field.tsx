"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import { useState } from "react";

export function TurnstileField({ siteKey }: { siteKey?: string }) {
  const [token, setToken] = useState("");

  if (!siteKey) {
    return null;
  }

  return (
    <div className="min-h-16" data-testid="turnstile-field">
      <Turnstile
        onError={() => setToken("")}
        onExpire={() => setToken("")}
        onSuccess={setToken}
        options={{ language: "pt-BR", theme: "light" }}
        siteKey={siteKey}
      />
      <input name="captchaToken" type="hidden" value={token} />
    </div>
  );
}
