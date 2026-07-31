import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ThemeSelect } from "@/components/ui/theme-select";
import { requireAccountPage } from "@/lib/auth/page-guard";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Configurar workspace" };

export default async function OnboardingPage() {
  await requireAccountPage("onboarding");
  const supabase = await createServerSupabaseClient();
  const { data: legalDocuments, error } = await supabase
    .from("legal_documents")
    .select("id, document_type, version, content_markdown")
    .eq("status", "published")
    .eq("is_required", true)
    .lte("effective_at", new Date().toISOString())
    .order("document_type");

  if (error || !legalDocuments?.length) {
    redirect("/auth/error");
  }

  return (
    <main className="bg-canvas text-foreground min-h-screen">
      <div className="mx-auto w-full max-w-5xl px-6 py-6 sm:px-10 lg:px-12">
        <header className="border-line flex items-center justify-between gap-4 border-b pb-5">
          <div>
            <p className="font-semibold tracking-tight">Fate Eight Finance</p>
            <p className="text-muted text-xs">Configuração inicial protegida</p>
          </div>
          <ThemeSelect />
        </header>

        <section className="py-10">
          <p className="text-brand-strong text-sm font-semibold tracking-[0.14em] uppercase">
            Onboarding
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em]">
            Prepare seu workspace com contexto.
          </h1>
          <p className="text-muted mt-4 max-w-3xl leading-7">
            Confirme seus dados, preferências e as versões legais vigentes. O e-mail já foi
            verificado e não será duplicado no perfil.
          </p>
          <p className="border-line bg-surface text-muted mt-5 rounded-xl border px-4 py-3 text-sm">
            Ambiente local: os documentos atuais são placeholders fictícios e não possuem validade
            jurídica. A produção exige versões revisadas.
          </p>

          <div className="border-line bg-surface shadow-panel mt-8 rounded-2xl border p-5 sm:p-8">
            <OnboardingForm legalDocuments={legalDocuments} />
          </div>
        </section>
      </div>
    </main>
  );
}
