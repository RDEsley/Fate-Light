"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
    description: "Movimento, contraste e leitura",
    href: "/perfil#experiencia",
    icon: "sparkles",
    label: "Experiência",
    section: "/perfil",
  },
  {
    description: "Identidade, datas e alertas",
    href: "/configuracoes/empresa",
    icon: "building",
    label: "Empresa",
  },
  {
    description: "Exportação e exclusão de conta",
    href: "/perfil#privacidade",
    icon: "info",
    label: "Privacidade",
    section: "/perfil",
  },
];

export function SettingsTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Configurações" className="settings-tabs">
      {tabs.map((tab) => (
        <Link
          // `usePathname` descarta o hash, então as abas de âncora pertencem à rota base.
          aria-current={pathname === (tab.section ?? tab.href) ? "page" : undefined}
          className="settings-tabs__item"
          href={tab.href}
          key={tab.href}
        >
          <span className="settings-tabs__icon">
            <Icon className="size-4" name={tab.icon} />
          </span>
          <span className="min-w-0">
            <strong>{tab.label}</strong>
            <small>{tab.description}</small>
          </span>
        </Link>
      ))}
    </nav>
  );
}
