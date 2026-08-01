import Link from "next/link";
import type { ReactNode } from "react";

import { ThemeSelect } from "@/components/ui/theme-select";

type AuthShellProps = {
  children: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
};

export function AuthShell({ children, description, eyebrow, title }: AuthShellProps) {
  return (
    <main className="bg-canvas text-foreground min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-6 sm:px-10 lg:px-12">
        <header className="border-line flex items-center justify-between gap-4 border-b pb-5">
          <Link className="flex items-center gap-3" href="/">
            <span
              aria-hidden="true"
              className="bg-brand text-brand-contrast grid size-10 place-items-center rounded-xl font-bold shadow-sm"
            >
              8
            </span>
            <span className="font-semibold tracking-tight">Fate Eight</span>
          </Link>
          <ThemeSelect />
        </header>

        <section className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1fr_30rem] lg:py-20">
          <div className="max-w-2xl">
            <p className="text-brand-strong text-sm font-semibold tracking-[0.14em] uppercase">
              {eyebrow}
            </p>
            <h1 className="mt-4 text-4xl leading-tight font-semibold tracking-[-0.035em] text-balance sm:text-5xl">
              {title}
            </h1>
            <p className="text-muted mt-5 text-lg leading-8">{description}</p>
          </div>

          <div className="border-line bg-surface shadow-panel rounded-2xl border p-6 sm:p-8">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
