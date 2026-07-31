import Link from "next/link";
import type { ReactNode } from "react";

import { signOut } from "@/app/(auth)/actions";
import { ThemeSelect } from "@/components/ui/theme-select";
import { getInitials } from "@/lib/profile/initials";

import { AccountTheme } from "./account-theme";

type AccountShellProps = {
  children: ReactNode;
  description: string;
  fullName: string;
  theme: string;
  title: string;
};

export function AccountShell({ children, description, fullName, theme, title }: AccountShellProps) {
  return (
    <main className="bg-canvas text-foreground min-h-screen">
      <AccountTheme theme={theme} />
      <div className="mx-auto w-full max-w-6xl px-6 py-6 sm:px-10 lg:px-12">
        <header className="border-line flex flex-wrap items-center justify-between gap-4 border-b pb-5">
          <Link className="flex items-center gap-3" href="/perfil">
            <span
              aria-hidden="true"
              className="bg-brand text-brand-contrast grid size-10 place-items-center rounded-xl font-bold"
            >
              8
            </span>
            <span className="font-semibold tracking-tight">Fate Eight Finance</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeSelect />
            <span
              aria-label={`Perfil de ${fullName}`}
              className="bg-brand-soft text-brand-strong grid size-10 place-items-center rounded-full text-sm font-bold"
              title={fullName}
            >
              {getInitials(fullName)}
            </span>
          </div>
        </header>

        <nav aria-label="Conta" className="border-line flex flex-wrap gap-2 border-b py-4">
          <Link
            className="hover:bg-brand-soft rounded-lg px-3 py-2 text-sm font-semibold"
            href="/clientes"
          >
            Clientes
          </Link>
          <Link
            className="hover:bg-brand-soft rounded-lg px-3 py-2 text-sm font-semibold"
            href="/perfil"
          >
            Perfil
          </Link>
          <Link
            className="hover:bg-brand-soft rounded-lg px-3 py-2 text-sm font-semibold"
            href="/configuracoes/empresa"
          >
            Configurações da empresa
          </Link>
          <form action={signOut} className="ml-auto">
            <button
              className="hover:bg-brand-soft rounded-lg px-3 py-2 text-sm font-semibold"
              type="submit"
            >
              Sair
            </button>
          </form>
        </nav>

        <section className="py-10">
          <div className="max-w-3xl">
            <p className="text-brand-strong text-sm font-semibold tracking-[0.14em] uppercase">
              Sua conta
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em]">{title}</h1>
            <p className="text-muted mt-3 leading-7">{description}</p>
          </div>
          <div className="mt-8">{children}</div>
        </section>
      </div>
    </main>
  );
}
