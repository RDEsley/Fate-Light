"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

export function AccountTheme({ theme }: { theme: string }) {
  const { setTheme } = useTheme();

  useEffect(() => {
    if (theme === "light" || theme === "dark" || theme === "system") {
      setTheme(theme);
    }
  }, [setTheme, theme]);

  return null;
}
