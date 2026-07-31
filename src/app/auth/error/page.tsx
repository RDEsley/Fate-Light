import Link from "next/link";
import type { Metadata } from "next";

import { AuthShell } from "@/app/(auth)/_components/auth-shell";

export const metadata: Metadata = { title: "Link inválido" };

export default function AuthErrorPage() {
  return (
    <AuthShell
      description="O link pode ter expirado, já ter sido usado ou não corresponder a esta solicitação."
      eyebrow="Não foi possível entrar"
      title="Solicite um novo link de acesso."
    >
      <p className="text-muted text-sm leading-6">
        Por segurança, links são temporários e só podem ser usados uma vez.
      </p>
      <Link
        className="bg-brand text-brand-contrast mt-6 block min-h-11 rounded-xl px-4 py-3 text-center font-semibold"
        href="/login"
      >
        Voltar para o login
      </Link>
    </AuthShell>
  );
}
