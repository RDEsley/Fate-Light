import type { Metadata } from "next";

import { CurrentLegalDocument } from "@/features/legal/current-document";

export const metadata: Metadata = { title: "Política de Privacidade" };

export default function PrivacyPage() {
  return <CurrentLegalDocument type="privacy_policy" />;
}
