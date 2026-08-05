import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { requireAccountPage } from "@/lib/auth/page-guard";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Configurar workspace" };

export default async function OnboardingPage() {
  await requireAccountPage("onboarding");
  const supabase = await createServerSupabaseClient();
  const [{ data: legalDocuments, error }, { data: authData }] = await Promise.all([
    supabase
      .from("legal_documents")
      .select("id, document_type, version, content_markdown")
      .eq("status", "published")
      .eq("is_required", true)
      .lte("effective_at", new Date().toISOString())
      .order("document_type"),
    supabase.auth.getUser(),
  ]);

  if (error || !legalDocuments?.length) {
    redirect("/auth/error");
  }

  const metadataDisplayName = authData.user?.user_metadata?.display_name;
  const initialDisplayName =
    typeof metadataDisplayName === "string" ? metadataDisplayName.trim().slice(0, 120) : "";

  return (
    <main className="bg-canvas text-foreground min-h-screen">
      <div className="mx-auto w-full max-w-5xl px-6 py-6 sm:px-10 lg:px-12">
        <header className="border-line flex items-center justify-between gap-4 border-b pb-5">
          <BrandMark />
          <span className="bg-positive-soft text-positive rounded-full px-3 py-1.5 text-xs font-black">
            Acesso confirmado
          </span>
        </header>

        <section className="py-10">
          <p className="text-brand-strong text-sm font-black tracking-[0.14em] uppercase">
            Primeiros passos · 4 etapas
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

          <div className="panel-card mt-8">
            <OnboardingForm
              initialDisplayName={initialDisplayName}
              legalDocuments={legalDocuments}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
