import Image from "next/image";
import Link from "next/link";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link aria-label="Fate Light — ir para o dashboard" className="brand-mark" href="/dashboard">
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
