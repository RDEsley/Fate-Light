"use client";

import { useEffect, useRef } from "react";

type Ripple = {
  alpha: number;
  life: number;
  maxRadius: number;
  radius: number;
  x: number;
  y: number;
};

/**
 * Trilha de ondulação suave sob o cursor — efeito “água” discreto na landing.
 * Respeita prefers-reduced-motion e a preferência interna data-system-motion=off.
 */
export function LandingWaterCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const media =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    const motionOff = () =>
      Boolean(media?.matches) || document.documentElement.dataset.systemMotion === "off";

    const context = canvas.getContext("2d");
    if (!context) return;

    const ripples: Ripple[] = [];
    let frame = 0;
    let width = 0;
    let height = 0;
    let lastX = -1;
    let lastY = -1;
    let lastSpawn = 0;
    let pointerInside = false;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const spawn = (x: number, y: number, force = false) => {
      if (motionOff() || !pointerInside) return;
      const now = performance.now();
      if (!force && now - lastSpawn < 42) return;

      const distance =
        lastX < 0 ? 24 : Math.hypot(x - lastX, y - lastY);
      if (!force && distance < 10) return;

      lastSpawn = now;
      lastX = x;
      lastY = y;
      ripples.push({
        alpha: 0.22,
        life: 1,
        maxRadius: 28 + Math.min(distance, 48) * 0.35,
        radius: 4,
        x,
        y,
      });
      if (ripples.length > 28) ripples.shift();
    };

    const onMove = (event: PointerEvent) => {
      pointerInside = true;
      spawn(event.clientX, event.clientY);
    };

    const onLeave = () => {
      pointerInside = false;
      lastX = -1;
      lastY = -1;
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);

      if (!motionOff()) {
        for (let index = ripples.length - 1; index >= 0; index -= 1) {
          const ripple = ripples[index];
          ripple.life -= 0.018;
          ripple.radius += (ripple.maxRadius - ripple.radius) * 0.08 + 0.35;
          ripple.alpha = Math.max(0, ripple.life * 0.2);

          if (ripple.life <= 0) {
            ripples.splice(index, 1);
            continue;
          }

          context.beginPath();
          context.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
          context.strokeStyle = `rgba(8, 127, 115, ${ripple.alpha})`;
          context.lineWidth = 1.4;
          context.stroke();

          context.beginPath();
          context.arc(ripple.x, ripple.y, ripple.radius * 0.45, 0, Math.PI * 2);
          context.fillStyle = `rgba(8, 127, 115, ${ripple.alpha * 0.18})`;
          context.fill();
        }
      }

      frame = window.requestAnimationFrame(draw);
    };

    resize();
    frame = window.requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    document.addEventListener("pointerleave", onLeave);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <canvas
      aria-hidden="true"
      className="landing-water-cursor pointer-events-none fixed inset-0 z-[1]"
      ref={canvasRef}
    />
  );
}
