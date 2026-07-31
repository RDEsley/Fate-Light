import type { Metadata } from "next";

import { AuthShell } from "@/app/(auth)/_components/auth-shell";
import { signOut } from "@/app/(auth)/actions";

export const metadata: Metadata = { title: "Conta indisponível" };

export default function SuspendedAccountPage() {
  return (
    <AuthShell
      description="O acesso aos dados permanece bloqueado. Nenhuma informação financeira é exibida nesta página."
      eyebrow="Acesso indisponível"
      title="Esta conta ou workspace precisa de revisão."
    >
      <p className="text-muted text-sm leading-6">
        Entre em contato com o suporte pelos canais oficiais e informe apenas os dados solicitados.
        Nunca envie seu link de acesso.
      </p>
      <form action={signOut}>
        <button
          className="border-line hover:bg-brand-soft mt-6 min-h-11 w-full rounded-xl border px-4 py-3 font-semibold transition-colors"
          type="submit"
        >
          Encerrar sessão
        </button>
      </form>
    </AuthShell>
  );
}
