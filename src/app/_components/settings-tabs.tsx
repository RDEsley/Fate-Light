"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Icon, type IconName } from "@/components/ui/icon";

type SettingsTab = {
  description: string;
  href: Route;
  icon: IconName;
  label: string;
  /** Âncora dentro da própria página, marcada como ativa junto com a rota base. */
  section?: string;
};

const tabs: SettingsTab[] = [
  {
    description: "Nome, contato e localização",
    href: "/perfil",
    icon: "user",
    label: "Meu perfil",
  },
  {
    description: "Antecedência dos avisos",
    href: "/perfil#alertas",
    icon: "bell",
    label: "Alertas",
    section: "/perfil",
  },
  {
    description: "Movimento, contraste e leitura",
    href: "/perfil#experiencia",
    icon: "sparkles",
    label: "Experiência",
    section: "/perfil",
  },
  {
    description: "Tudo o que já aconteceu",
    href: "/historico",
    icon: "history",
    label: "Histórico",
  },
  {
    description: "Exportação e exclusão de conta",
    href: "/perfil#privacidade",
    icon: "info",
    label: "Privacidade",
    section: "/perfil",
  },
  {
    description: "Identidade, datas e alertas",
    href: "/configuracoes/empresa",
    icon: "building",
    label: "Empresa",
  },
];

function tabHash(tab: SettingsTab) {
  const index = tab.href.indexOf("#");
  return index === -1 ? "" : tab.href.slice(index);
}

export function SettingsTabs() {
  const pathname = usePathname();
  // `usePathname` descarta o hash, então as três abas de /perfil (perfil, experiência e
  // privacidade) precisam do hash real da página pra saber qual delas está ativa — sem
  // isso, todas batem com a mesma rota base e acendem juntas. O estado inicial já nasce
  // correto (lazy initializer, não em efeito); o clique atualiza na hora porque trocar só
  // o hash na mesma rota não costuma disparar "hashchange".
  const [hash, setHash] = useState(() =>
    typeof window === "undefined" ? "" : window.location.hash,
  );

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", syncHash);
    window.addEventListener("popstate", syncHash);
    return () => {
      window.removeEventListener("hashchange", syncHash);
      window.removeEventListener("popstate", syncHash);
    };
  }, []);

  return (
    <nav aria-label="Configurações" className="settings-tabs">
      {tabs.map((tab) => {
        const active = pathname === (tab.section ?? tab.href) && hash === tabHash(tab);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className="settings-tabs__item"
            href={tab.href}
            key={tab.href}
            onClick={() => setHash(tabHash(tab))}
          >
            <span className="settings-tabs__icon">
              <Icon className="size-4" name={tab.icon} />
            </span>
            <span className="min-w-0">
              <strong>{tab.label}</strong>
              <small>{tab.description}</small>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
