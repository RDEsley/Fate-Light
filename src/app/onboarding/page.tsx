import type { Metadata } from "next";

import { signOut } from "@/app/(auth)/actions";
import { requireAccountPage } from "@/lib/auth/page-guard";

export const metadata: Metadata = { title: "Configurar workspace" };

export default async function OnboardingPage() {
  await requireAccountPage("onboarding");

  return (
    <main className="bg-canvas text-foreground grid min-h-screen place-items-center px-6 py-12">
      <section className="border-line bg-surface shadow-panel w-full max-w-2xl rounded-2xl border p-8">
        <p className="text-brand-strong text-sm font-semibold tracking-[0.14em] uppercase">
          Conta confirmada
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          Vamos preparar seu workspace.
        </h1>
        <p className="text-muted mt-4 leading-7">
          Sua sessão está protegida. O formulário de aceite legal e configuração será habilitado na
          próxima etapa desta fase.
        </p>
        <form action={signOut}>
          <button
            className="border-line mt-6 rounded-xl border px-4 py-3 font-semibold"
            type="submit"
          >
            Encerrar sessão
          </button>
        </form>
      </section>
    </main>
  );
}
