"use client";

import { useEffect, useRef, useState } from "react";

export const motionPreferenceKeys = {
  mouse: "fate-light:mouse-motion",
  system: "fate-light:system-motion",
} as const;

/** Duração da onda de clique; mantida em sincronia com as animações de `pointer-ripple-*`. */
export const pointerMarkDuration = 620;

type PointerMark = { id: number; x: number; y: number };

function preferenceEnabled(key: string) {
  return window.localStorage.getItem(key) !== "off";
}

export function applyMotionPreferences() {
  const root = document.documentElement;
  const reduced =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.dataset.mouseMotion =
    !reduced && preferenceEnabled(motionPreferenceKeys.mouse) ? "on" : "off";
  root.dataset.systemMotion =
    !reduced && preferenceEnabled(motionPreferenceKeys.system) ? "on" : "off";
}

export function MotionExperience() {
  const [marks, setMarks] = useState<PointerMark[]>([]);
  const counter = useRef(0);

  useEffect(() => {
    applyMotionPreferences();
    const pendingTimers = new Set<number>();
    const refresh = () => applyMotionPreferences();
    window.addEventListener("fate-light:motion-change", refresh);

    const removeLater = (id: number, delay: number) => {
      const timer = window.setTimeout(() => {
        pendingTimers.delete(timer);
        setMarks((current) => current.filter((mark) => mark.id !== id));
      }, delay);
      pendingTimers.add(timer);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (document.documentElement.dataset.mouseMotion !== "on" || event.pointerType === "touch")
        return;
      const id = counter.current++;
      setMarks((current) => [...current.slice(-23), { id, x: event.clientX, y: event.clientY }]);
      removeLater(id, pointerMarkDuration);
    };

    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    return () => {
      pendingTimers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("fate-light:motion-change", refresh);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-effects">
      <svg focusable="false">
        {marks.map((mark) => (
          <g key={mark.id} transform={`translate(${mark.x} ${mark.y})`}>
            <g className="pointer-click-pop">
              <circle className="pointer-click-pop__bubble" cx="0" cy="0" r="19" />
              <circle className="pointer-click-pop__wake" cx="0" cy="0" r="13" />
              <circle className="pointer-click-pop__dot" cx="0" cy="0" r="7" />
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
}
