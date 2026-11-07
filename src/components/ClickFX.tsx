import { useEffect, useRef } from "react";
import { useApp } from "@/lib/app-context";

/**
 * Minimal click feedback (spec 1): just a 6-pixel lime burst at the click point (0.4s life).
 * No expanding ring, no text impulse. Ignores `a, button, nav, [data-ui]`.
 */

export const CLICK_FX = {
  burst: true,
  count: 6,
  life: 0.4,
};

type Bit = { x: number; y: number; vx: number; vy: number; age: number; size: number };

export default function ClickFX() {
  const { reduced } = useApp();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bits = useRef<Bit[]>([]);
  const running = useRef(false);

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = window.innerWidth;
    let h = window.innerHeight;
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.max(0, Math.min((now - last) / 1000, 0.04));
      last = now;
      ctx.clearRect(0, 0, w, h);

      bits.current = bits.current.filter((b) => b.age < CLICK_FX.life);
      for (const b of bits.current) {
        b.age += dt;
        b.vx *= 0.94;
        b.vy *= 0.94;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        const a = Math.max(0, 1 - b.age / CLICK_FX.life);
        ctx.fillStyle = `rgba(198,255,0,${a.toFixed(3)})`;
        ctx.fillRect(Math.round(b.x - b.size / 2), Math.round(b.y - b.size / 2), b.size, b.size);
      }

      if (bits.current.length) raf = requestAnimationFrame(loop);
      else {
        running.current = false;
        ctx.clearRect(0, 0, w, h);
      }
    };
    const kick = () => {
      if (running.current) return;
      running.current = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };

    const onDown = (e: PointerEvent) => {
      if (!CLICK_FX.burst) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("a, button, nav, input, textarea, [role='button'], [data-ui], [data-nofx]")) return;
      for (let i = 0; i < CLICK_FX.count; i++) {
        const a = (i / CLICK_FX.count) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
        const sp = 110 + Math.random() * 110;
        bits.current.push({
          x: e.clientX,
          y: e.clientY,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          age: 0,
          size: 4 + (i % 2),
        });
      }
      kick();
    };

    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  if (reduced) return null;
  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[70]" aria-hidden="true" />;
}
