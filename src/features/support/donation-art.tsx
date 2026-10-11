"use client";

import { useEffect, useRef } from "react";

const prefersStill = () =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Personagem acenando: WebP animado, com um quadro parado para quem prefere menos movimento. */
export function WaveArt({ className }: { className?: string }) {
  return (
    <picture className={className}>
      <source
        media="(prefers-reduced-motion: reduce)"
        srcSet="/animations/donation-wave-still.webp"
      />
      <img
        alt=""
        className="size-full object-contain"
        height={293}
        src="/animations/donation-wave.webp"
        width={336}
      />
    </picture>
  );
}

/**
 * Animação Lottie decorativa. O player e o arquivo só são baixados quando ela aparece na tela;
 * se falhar, o espaço fica vazio e nada mais é afetado. Com `from` e `to` (quadros da
 * composição) o trecho toca uma única vez e para no fim; sem eles a animação fica em laço.
 */
function LottieArt({
  className,
  from,
  src,
  to,
}: {
  className?: string;
  from?: number;
  src: string;
  to?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let destroy: (() => void) | null = null;
    Promise.all([
      import("lottie-web/build/player/lottie_light"),
      fetch(src).then((response) =>
        response.ok
          ? (response.json() as Promise<unknown>)
          : Promise.reject(new Error("animation")),
      ),
    ])
      .then(([{ default: lottie }, animationData]) => {
        if (cancelled || !containerRef.current) return;
        const once = from !== undefined && to !== undefined;
        const item = lottie.loadAnimation({
          animationData,
          autoplay: !once && !prefersStill(),
          container: containerRef.current,
          loop: !once,
          renderer: "svg",
        });
        if (once) {
          // Quem prefere menos movimento vê direto o quadro final do trecho.
          if (prefersStill()) item.goToAndStop(to - from, true);
          else item.playSegments([from, to], true);
        }
        destroy = () => item.destroy();
      })
      .catch(() => {
        // Decorativa: sem ela a tela continua completa.
      });
    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [from, src, to]);

  return <div aria-hidden="true" className={className} ref={containerRef} />;
}

/** Potinho de doações, na página de apoio. */
export function JarArt({ className }: { className?: string }) {
  return <LottieArt className={className} src="/animations/donation-jar.json" />;
}

/**
 * Coração de agradecimento, para quem recusa o convite. A chama vira coração e ele fica na
 * tela: o arquivo termina fazendo o coração sumir, então o trecho para antes disso.
 */
export function HeartArt({ className }: { className?: string }) {
  return (
    <LottieArt className={className} from={40} src="/animations/donation-heart.json" to={330} />
  );
}
