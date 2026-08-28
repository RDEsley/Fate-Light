import type { CSSProperties } from "react";

const wordStyle = (delay: string) => ({ "--landing-word-delay": delay }) as CSSProperties;

export function LandingHeroTitle() {
  return (
    <h1 className="landing-hero__title mt-6 max-w-3xl text-5xl leading-[.98] font-black tracking-[-0.055em] sm:text-6xl xl:text-7xl">
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
