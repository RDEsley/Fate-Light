import type { CSSProperties } from "react";

const wordStyle = (delay: string) => ({ "--landing-word-delay": delay }) as CSSProperties;

export function LandingHeroTitle() {
  return (
    <h1 className="landing-hero__title max-w-3xl text-4xl leading-[1.02] font-semibold tracking-[-0.05em] sm:text-5xl xl:text-6xl">
      <span className="landing-hero__word" style={wordStyle("80ms")}>
        Sua
      </span>{" "}
      <span className="landing-hero__word" style={wordStyle("180ms")}>
        rotina
      </span>{" "}
      <span className="landing-hero__word" style={wordStyle("280ms")}>
        financeira
      </span>{" "}
      <span className="landing-hero__word" style={wordStyle("380ms")}>
        pode
      </span>{" "}
      <span className="landing-hero__word" style={wordStyle("480ms")}>
        ser
      </span>{" "}
      <span className="landing-hero__word landing-hero__word--light" style={wordStyle("580ms")}>
        leve
      </span>
      <span aria-hidden="true" className="landing-hero__period">
        .
      </span>
    </h1>
  );
}
