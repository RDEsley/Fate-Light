"use client";

import { useTheme } from "next-themes";

const availableThemes = [
  { label: "Sistema", value: "system" },
  { label: "Claro", value: "light" },
  { label: "Escuro", value: "dark" },
] as const;

export function ThemeSelect() {
  const { setTheme, theme } = useTheme();

  return (
    <label className="text-muted inline-flex items-center gap-2 text-sm font-medium">
      <span>Tema</span>
      <select
        aria-label="Selecionar tema"
        className="border-line bg-surface text-foreground focus-visible:border-brand focus-visible:ring-brand/30 rounded-md border px-3 py-2 text-sm shadow-sm transition outline-none focus-visible:ring-2"
        onChange={(event) => setTheme(event.target.value)}
        value={theme ?? "system"}
      >
        {availableThemes.map((availableTheme) => (
          <option key={availableTheme.value} value={availableTheme.value}>
            {availableTheme.label}
          </option>
        ))}
      </select>
    </label>
  );
}
