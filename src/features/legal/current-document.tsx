import Link from "next/link";
import { notFound } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type LegalDocumentType = "privacy_policy" | "terms_of_use";

export async function CurrentLegalDocument({ type }: { type: LegalDocumentType }) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("legal_documents")
    .select("content_markdown, document_type, effective_at, version")
    .eq("document_type", type)
    .eq("status", "published")
    .order("effective_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) notFound();
  const title = type === "terms_of_use" ? "Termos de Uso" : "Política de Privacidade";

  return (
    <main className="min-h-screen px-4 py-5 sm:px-7 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <BrandMark />
          <Link className="text-brand-strong text-sm font-bold hover:underline" href="/">
            Voltar ao início
          </Link>
        </div>
        <article className="panel-card mt-8 sm:p-8!">
          <p className="text-brand-strong text-xs font-black tracking-wider uppercase">
            Documento vigente · versão {data.version}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">{title}</h1>
          {data.effective_at ? (
            <p className="text-muted mt-2 text-sm">
              Vigente desde {new Date(data.effective_at).toLocaleDateString("pt-BR")}.
            </p>
          ) : null}
          <pre className="text-foreground mt-7 overflow-x-auto font-sans text-sm leading-7 whitespace-pre-wrap">
            {data.content_markdown}
          </pre>
        </article>
      </div>
    </main>
  );
}
