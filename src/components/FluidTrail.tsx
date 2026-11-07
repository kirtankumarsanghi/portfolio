import { useEffect, useRef } from "react";
import { FluidTrail2D, FLUID_CONFIG, type FluidConfig } from "@/lib/fluid";
import { useApp } from "@/lib/app-context";

/**
 * Soft glowing "liquid light" trail behind the 3D content, over the blue background.
 * Layer order in the parent must be: bg gradient → this → 3D canvas → text.
 * Pointer motion injects velocity splats; a click injects one strong splat.
 * Pauses off-screen and is disabled under prefers-reduced-motion.
 */
export default function FluidTrail({
  active,
  onVelocity,
  cfg,
  className = "",
}: {
  active: boolean;
  onVelocity?: (vx: number, vy: number) => void;
  cfg?: Partial<FluidConfig>;
  className?: string;
}) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const sim = useRef<FluidTrail2D | null>(null);
  const failed = useRef(false);
  const { reduced } = useApp();
  const pointer = useRef({ x: 0, y: 0, px: 0, py: 0, init: false });

  useEffect(() => {
    const el = canvas.current;
    if (!el || reduced || failed.current) return;
    let inst: FluidTrail2D;
    try {
      inst = new FluidTrail2D(el, { ...FLUID_CONFIG, ...cfg });
    } catch {
      failed.current = true; // WebGL unusable → the plain gradient stays, nothing breaks
      return;
    }
    sim.current = inst;
    inst.resize();
    const onResize = () => inst.resize();
    window.addEventListener("resize", onResize);

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
      const p = pointer.current;
      if (!p.init) {
        p.px = e.clientX;
        p.py = e.clientY;
        p.init = true;
      }
      const dx = e.clientX - p.px;
      const dy = e.clientY - p.py;
      p.px = e.clientX;
      p.py = e.clientY;
      const speed = Math.hypot(dx, dy);
      if (speed < 0.6) return;
      inst.splat(
        (e.clientX - r.left) / r.width,
        1 - (e.clientY - r.top) / r.height,
        dx / Math.max(r.width, 1),
        -dy / Math.max(r.height, 1),
        Math.min(2.2, 0.7 + speed / 26),
      );
      onVelocity?.(dx, dy);
    };
    const onClick = (e: Event) => {
      const d = (e as CustomEvent<{ x: number; y: number }>).detail;
      if (!d) return;
      const r = el.getBoundingClientRect();
      inst.splat((d.x - r.left) / r.width, 1 - (d.y - r.top) / r.height, 0.004, 0.004, 3.4);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("ks:click", onClick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("ks:click", onClick);
      window.removeEventListener("resize", onResize);
      inst.dispose();
      sim.current = null;
    };
  }, [reduced, cfg, onVelocity]);

  useEffect(() => {
    const inst = sim.current;
    if (!inst) return;
    if (!active) {
      inst.stop();
      return;
    }
    // let the intro finish first — the sim is GPU-bound and would starve the boot animation
    const t = window.setTimeout(() => inst.start(), 700);
    return () => window.clearTimeout(t);
  }, [active]);

  if (reduced) return null;
  return <canvas ref={canvas} className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} style={{ mixBlendMode: "screen" }} aria-hidden="true" />;
}
