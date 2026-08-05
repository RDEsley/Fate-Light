"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";

import { Icon, type IconName } from "@/components/ui/icon";

const tabs: { href: Route; icon: IconName; label: string }[] = [
  { href: "/perfil", icon: "user", label: "Meu perfil" },
  { href: "/perfil#experiencia", icon: "sparkles", label: "Experiência" },
  { href: "/configuracoes/empresa", icon: "building", label: "Empresa" },
];

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Configurações"
      className="mb-5 flex gap-1 overflow-x-auto rounded-2xl border-2 border-slate-700/10 bg-white p-1.5"
    >
      {tabs.map((tab) => {
        const active = tab.href === "/perfil" ? pathname === "/perfil" : pathname === tab.href;
        return (
          <Link
            className={`${active ? "bg-brand-soft text-brand-strong" : "text-muted hover:bg-[#f1f3ef]"} flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-black`}
            href={tab.href}
            key={tab.href}
          >
            <Icon className="size-4" name={tab.icon} /> {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
