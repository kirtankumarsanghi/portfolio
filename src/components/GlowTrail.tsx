import { useEffect, useRef } from "react";
import { useApp } from "@/lib/app-context";

/**
 * Soft cyan-blue haze trail (spec 3).
 *
 *   z0 CSS gradient background
 *   z1 THIS canvas  (mix-blend-mode: screen, blur 16px — UNDER the 3D canvas so the name stays crisp)
 *   z2 R3F canvas   (alpha: true)
 *   z3 DOM text / HUD
 *
 * Radius 70–110px (scales with pointer speed up to 130px), max alpha 0.18, colour stops
 * rgba(70,170,255,A) → rgba(40,100,255,A*0.4) → rgba(30,70,255,0) — no white core, never washes out the name.
 * Composite is 'screen' (not 'lighter'), fade 0.05 per 60fps frame (~1s lifetime).
 * ?debug=glow draws a solid magenta blob at the pointer to verify the canvas is on screen.
 */

export const GLOW = {
  fade: 0.055,
  alpha: 0.12,
  blur: 16,
  minR: 46,
  maxR: 90,
};

type Blob = { x: number; y: number; vx: number; vy: number; r: number; a: number };

const isDebug = () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "glow";

export default function GlowTrail({ active, className = "" }: { active: boolean; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { reduced } = useApp();
  const debug = useRef(isDebug());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reduced) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const dpr = 1;
    let blobs: Blob[] = [];
    let last: { x: number; y: number } | null = null;
    let pointer: { x: number; y: number } | null = null;
    let raf = 0;
    let running = false;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const local = (cx: number, cy: number) => {
      const r = canvas.getBoundingClientRect();
      return { x: (cx - r.left) * dpr, y: (cy - r.top) * dpr, inside: cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom };
    };

    const onMove = (e: PointerEvent) => {
      const p = local(e.clientX, e.clientY);
      pointer = p.inside ? { x: p.x, y: p.y } : null;
      if (!p.inside) {
        last = null;
        return;
      }
      if (last) {
        const dx = p.x - last.x;
        const dy = p.y - last.y;
        const dist = Math.hypot(dx, dy);
        const steps = Math.max(1, Math.floor(dist / 14));
        const rad = Math.min(GLOW.maxR, GLOW.minR + Math.min(dist, 60) * 1.0) * dpr;
        for (let i = 0; i < steps; i++) {
          const t = i / steps;
          blobs.push({
            x: last.x + dx * t,
            y: last.y + dy * t,
            vx: dx * 0.018,
            vy: dy * 0.018,
            r: rad,
            a: GLOW.alpha,
          });
        }
        if (blobs.length > 220) blobs = blobs.slice(-220);
      }
      last = { x: p.x, y: p.y };
    };

    let lastT = performance.now();
    const tick = (now: number) => {
      const frames = Math.min(Math.max((now - lastT) / (1000 / 60), 0), 90);
      lastT = now;
      const fade = 1 - Math.pow(1 - GLOW.fade, frames);
      const keepA = Math.pow(0.935, frames);
      const keepV = Math.pow(0.96, frames);

      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = `rgba(0,0,0,${fade.toFixed(4)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.globalCompositeOperation = "screen";
      for (const b of blobs) {
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, `rgba(90,185,255,${b.a.toFixed(4)})`);
        g.addColorStop(0.5, `rgba(45,115,255,${(b.a * 0.45).toFixed(4)})`);
        g.addColorStop(1, "rgba(30,70,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, 7);
        ctx.fill();
        b.x += b.vx * frames;
        b.y += b.vy * frames;
        b.vx *= keepV;
        b.vy *= keepV;
        b.a *= keepA;
      }
      blobs = blobs.filter((b) => b.a > 0.008);

      if (debug.current && pointer) {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "#ff00ff";
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, 60 * dpr, 0, 7);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      lastT = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    if (active || debug.current) start();
    (canvas as unknown as { __glow: { start: () => void; stop: () => void } }).__glow = { start, stop };

    return () => {
      stop();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  useEffect(() => {
    const c = canvasRef.current as unknown as { __glow?: { start: () => void; stop: () => void } } | null;
    if (!c?.__glow) return;
    if (active || debug.current) c.__glow.start();
    else c.__glow.stop();
  }, [active]);

  if (reduced) return null;
  return (
    <canvas
      ref={canvasRef}
      data-glow
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      style={{ mixBlendMode: debug.current ? "normal" : "screen", filter: debug.current ? "none" : `blur(${GLOW.blur}px)` }}
      aria-hidden="true"
    />
  );
}
