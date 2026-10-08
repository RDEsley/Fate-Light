import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { signOut } from "@/app/(auth)/actions";
import { BrandMark } from "@/components/brand-mark";
import { Icon, type IconName } from "@/components/ui/icon";
import { requireAccountPage } from "@/lib/auth/page-guard";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Boas-vindas" };

const nextSteps: { icon: IconName; text: string; title: string }[] = [
  {
    icon: "users",
    text: "É dele que nascem os serviços e as cobranças.",
    title: "Cadastre o primeiro cliente",
  },
  {
    icon: "briefcase",
    text: "A cobrança é criada na hora e a próxima já fica agendada.",
    title: "Aplique um serviço",
  },
  {
    icon: "bell",
    text: "Vencimentos e domínios aparecem antes de virar problema.",
    title: "Acompanhe os alertas",
  },
];

export default async function OnboardingPage() {
  await requireAccountPage("onboarding");
  const supabase = await createServerSupabaseClient();
  const [{ data: legalDocuments, error }, { data: authData }] = await Promise.all([
    supabase
      .from("legal_documents")
      .select("id, document_type, version")
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
    <main className="onboarding text-foreground">
      <div className="onboarding__inner">
        <header className="onboarding__top">
          <BrandMark />
          <form action={signOut}>
            <button className="button button--ghost button--small" type="submit">
              <Icon className="size-4" name="logout" /> Sair
            </button>
          </form>
        </header>

        <div className="onboarding__layout">
          <section className="onboarding__intro">
            <p className="onboarding__badge">
              <Icon className="size-4" name="check-circle" /> Conta confirmada
            </p>
            <h1>Vamos preparar o seu espaço.</h1>
            <p className="onboarding__lead">
              Leva menos de um minuto. Só o seu nome e o da empresa são obrigatórios — o resto você
              ajusta quando quiser.
            </p>
            <div className="onboarding__next">
              <p>Depois daqui</p>
              <ol>
                {nextSteps.map((step) => (
                  <li key={step.title}>
                    <span>
                      <Icon className="size-4" name={step.icon} />
                    </span>
                    <div>
                      <strong>{step.title}</strong>
                      <small>{step.text}</small>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <OnboardingForm initialDisplayName={initialDisplayName} legalDocuments={legalDocuments} />
        </div>
      </div>
    </main>
  );
}
