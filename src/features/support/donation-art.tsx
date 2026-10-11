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
 * Potinho de doações (Lottie). O player e o arquivo só são baixados quando a animação aparece
 * na tela; se falhar, o espaço fica vazio e nada mais é afetado.
 */
export function JarArt({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let destroy: (() => void) | null = null;
    Promise.all([
      import("lottie-web/build/player/lottie_light"),
      fetch("/animations/donation-jar.json").then((response) =>
        response.ok
          ? (response.json() as Promise<unknown>)
          : Promise.reject(new Error("animation")),
      ),
    ])
      .then(([{ default: lottie }, animationData]) => {
        if (cancelled || !containerRef.current) return;
        const item = lottie.loadAnimation({
          animationData,
          autoplay: !prefersStill(),
          container: containerRef.current,
          loop: true,
          renderer: "svg",
        });
        destroy = () => item.destroy();
      })
      .catch(() => {
        // Decorativa: sem ela a tela continua completa.
      });
    return () => {
      cancelled = true;
      destroy?.();
    };
  }, []);

  return <div aria-hidden="true" className={className} ref={containerRef} />;
}
