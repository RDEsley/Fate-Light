import Image from "next/image";
import Link from "next/link";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    // Versão completa: o nome vem do texto visível (a regra de acessibilidade exige que o rótulo
    // contenha o que se vê). Só a versão compacta, sem texto, precisa de aria-label.
    <Link
      aria-label={compact ? "Fate Light — ir para o dashboard" : undefined}
      className="brand-mark"
      href="/dashboard"
    >
      <span className="brand-mark__image">
        <Image alt="" fill priority sizes="48px" src="/favicons/logo.png" />
      </span>
      {!compact ? (
        <span className="brand-mark__copy">
          <strong>Fate Light</strong>
          <small>Clareza financeira. Caminho Certo.</small>
        </span>
      ) : null}
    </Link>
  );
}
