"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider({
  children,
  ...properties
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...properties}>{children}</NextThemesProvider>;
}
