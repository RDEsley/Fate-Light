import type { Metadata } from "next";

import { signOut } from "@/app/(auth)/actions";
import { requireAccountPage } from "@/lib/auth/page-guard";

export const metadata: Metadata = { title: "Perfil" };

export default async function ProfilePage() {
  await requireAccountPage("active");

  return (
    <main className="bg-canvas text-foreground grid min-h-screen place-items-center px-6 py-12">
      <section className="border-line bg-surface shadow-panel w-full max-w-2xl rounded-2xl border p-8">
        <p className="text-brand-strong text-sm font-semibold tracking-[0.14em] uppercase">
          Sessão ativa
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Seu perfil está protegido.</h1>
        <p className="text-muted mt-4 leading-7">
          A edição de dados textuais e preferências será adicionada na próxima etapa, sem avatar ou
          upload de imagem.
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
