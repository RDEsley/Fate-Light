import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { Icon } from "@/components/ui/icon";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <section className="panel-card w-full max-w-lg text-center sm:p-8!">
        <div className="flex justify-center">
          <BrandMark />
        </div>
        <span className="bg-warning-soft text-warning mx-auto mt-7 grid size-14 place-items-center rounded-2xl">
          <Icon className="size-7" name="search" />
        </span>
        <h1 className="mt-4 text-2xl font-black">Não encontramos esta página.</h1>
        <p className="text-muted mt-2 text-sm leading-6">
          O endereço pode ter mudado ou o conteúdo não está disponível para sua conta.
        </p>
        <Link
          className="bg-brand text-brand-contrast mt-6 inline-flex min-h-11 items-center rounded-xl px-5 font-black"
          href="/"
        >
          Voltar ao início
        </Link>
      </section>
    </main>
  );
}
