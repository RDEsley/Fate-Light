"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

import { AppFrame, readShellIdentity } from "./_components/app-frame";

const appPrefixes = [
  "/dashboard",
  "/clientes",
  "/servicos",
  "/cobrancas",
  "/despesas",
  "/dominios",
  "/alertas",
  "/historico",
  "/importar",
  "/perfil",
  "/configuracoes",
];

const noopSubscribe = () => () => {};

/** Bichinho que pula enquanto os dados chegam: fecha os olhos no ar e achata ao cair. */
function Loader() {
  return (
    <div aria-live="polite" className="text-center" role="status">
      <span aria-hidden="true" className="cartoon-loader mx-auto">
        <span className="cartoon-loader__body">
          <i />
          <i />
        </span>
        <span className="cartoon-loader__shadow" />
      </span>
      <p className="mt-4 font-semibold">Carregando dados do workspace…</p>
    </div>
  );
}

/**
 * Nas telas do sistema o menu e a barra do topo continuam no lugar durante o
 * carregamento: só a área de conteúdo espera. O nome e o contador de alertas vêm da última
 * tela aberta nesta aba; na primeira visita ainda não há o que mostrar e eles ficam vazios.
 */
export default function Loading() {
  const pathname = usePathname();
  const identity = useSyncExternalStore(noopSubscribe, readShellIdentity, () => null);
  const insideApp = appPrefixes.some(
    (prefix) => pathname === prefix || pathname?.startsWith(`${prefix}/`),
  );

  if (!insideApp) {
    return (
      <main className="bg-canvas text-foreground grid min-h-screen place-items-center px-6">
        <Loader />
      </main>
    );
  }

  return (
    <AppFrame
      attentionItems={[]}
      attentionTotal={identity?.attentionTotal ?? 0}
      description=""
      fullName={identity?.fullName ?? ""}
      guest={identity?.guest ?? false}
      loading
      title=""
      workspaceName={identity?.workspaceName ?? ""}
    >
      <div className="grid min-h-[50vh] place-items-center">
        <Loader />
      </div>
    </AppFrame>
  );
}
