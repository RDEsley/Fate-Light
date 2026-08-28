import type { Metadata } from "next";

import { CurrentLegalDocument } from "@/features/legal/current-document";

export const metadata: Metadata = { title: "Termos de Uso" };

export default function TermsPage() {
  return <CurrentLegalDocument type="terms_of_use" />;
}
