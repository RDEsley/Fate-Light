import type { Metadata } from "next";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { DonationPanel } from "@/features/support/donation-panel";

export const metadata: Metadata = {
  title: "Apoiar o Fate Light",
  description: "Doação voluntária por Pix ao desenvolvedor do Fate Light.",
};

export default function SupportPage() {
  return (
    <main className="min-h-screen px-4 py-5 sm:px-7 sm:py-8">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center justify-between gap-4">
          <BrandMark />
          <Link className="text-brand-strong text-sm font-bold hover:underline" href="/">
            Voltar ao início
          </Link>
        </div>

        <h1 className="mt-8 text-3xl font-black tracking-tight">Apoiar o Fate Light</h1>
        <p className="text-muted mt-3 text-sm leading-7">
          Usar o Fate Light não custa nada. Se ele ajuda a sua rotina e você quiser retribuir o
          trabalho de quem o desenvolve e mantém, pode doar qualquer valor por Pix.
        </p>
        <p className="text-muted mt-2 text-sm leading-7">
          A doação é opcional, não libera nenhuma função e não muda nada na sua conta: o sistema é o
          mesmo para quem doa e para quem não doa.
        </p>

        <DonationPanel />

        <p className="text-muted mt-5 text-xs leading-6">
          O pagamento acontece no app do seu banco. O Fate Light não registra a doação, não coleta
          dados de pagamento e não fica sabendo quem doou nem quanto. Doou por engano? Escreva para{" "}
          <a
            className="text-brand-strong font-bold hover:underline"
            href="mailto:richardesleyso@gmail.com"
          >
            richardesleyso@gmail.com
          </a>{" "}
          que o valor é devolvido.
        </p>
      </div>
    </main>
  );
}
