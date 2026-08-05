"use client";

import { useEffect, useRef, useState } from "react";

export const motionPreferenceKeys = {
  mouse: "fate-light:mouse-motion",
  system: "fate-light:system-motion",
} as const;

type PointerMark = { id: number; rotation: number; x: number; y: number };

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
      setMarks((current) => [
        ...current.slice(-23),
        {
          id,
          rotation: (id * 29) % 45,
          x: event.clientX,
          y: event.clientY,
        },
      ]);
      removeLater(id, 380);
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
          <g key={mark.id} transform={`translate(${mark.x} ${mark.y}) rotate(${mark.rotation})`}>
            <g className="pointer-click-pop">
              <ellipse className="pointer-click-pop__bubble" cx="0" cy="0" rx="5.8" ry="4.8" />
              <circle className="pointer-click-pop__dot" cx="6.5" cy="-6.5" r="1.6" />
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
}
