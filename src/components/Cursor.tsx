import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import * as THREE from "three";
import { useApp } from "@/lib/app-context";

/**
 * Exact replica of curiositywen.design's pointer overlay trail (`cI` in readable_4d_part2.js):
 * - Native OS cursor remains visible; no lagging square follower.
 * - On solid dark sections (About, Work, Warp, Skills, Education), renders a 16px grid-snapped
 *   circular dot trail (up to 14 cells, radius 0.8 * 8px = 6.4px, color #c0fe04, exponential damp = 2).
 * - In Hero and Contact, FluidPushPass handles the Navier-Stokes fluid ripple + spectral dispersion.
 */

const PIXEL_SIZE = 16;
const TRAIL_COUNT = 14;
const DOT_RADIUS_RATIO = 0.8;
const POINTER_COLOR = "#c0fe04";

export default function Cursor() {
  const { reduced } = useApp();
  const [enabled, setEnabled] = useState(false);
  const [pill, setPill] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  const px = useMotionValue(-100);
  const py = useMotionValue(-100);
  const jx = useSpring(px, { stiffness: 520, damping: 34 });
  const jy = useSpring(py, { stiffness: 520, damping: 34 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trailCells = useRef<{ cx: number; cy: number; strength: number }[]>(
    Array.from({ length: TRAIL_COUNT }, () => ({ cx: -1, cy: -1, strength: 0 })),
  );
  const lastCell = useRef({ cx: -1, cy: -1 });
  const pointerPos = useRef({ x: -100, y: -100, active: false });
  const inWebGLSection = useRef(true);

  useEffect(() => {
    setEnabled(window.matchMedia("(pointer: fine)").matches && !reduced);
  }, [reduced]);

  useEffect(() => {
    if (!enabled) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      c.width = window.innerWidth * dpr;
      c.height = window.innerHeight * dpr;
      c.style.width = `${window.innerWidth}px`;
      c.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const showOverlay = pointerPos.current.active && !inWebGLSection.current;
      const cells = trailCells.current;

      for (let i = showOverlay ? 1 : 0; i < TRAIL_COUNT; i++) {
        cells[i].strength = THREE.MathUtils.damp(cells[i].strength, 0, 2, dt);
      }

      if (showOverlay) {
        const cx = Math.floor(pointerPos.current.x / PIXEL_SIZE);
        const cy = Math.floor(pointerPos.current.y / PIXEL_SIZE);
        if (cx !== lastCell.current.cx || cy !== lastCell.current.cy) {
          for (let i = TRAIL_COUNT - 1; i > 0; i--) {
            cells[i].cx = cells[i - 1].cx;
            cells[i].cy = cells[i - 1].cy;
            cells[i].strength = cells[i - 1].strength;
          }
          lastCell.current = { cx, cy };
        }
        cells[0].cx = cx;
        cells[0].cy = cy;
        cells[0].strength = 1;
      } else {
        lastCell.current = { cx: -1, cy: -1 };
      }

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      if (!inWebGLSection.current) {
        // Deduplicate cells by max strength just like applyPointerOverlay shader
        const cellMap = new Map<string, { cx: number; cy: number; strength: number }>();
        for (let i = 0; i < TRAIL_COUNT; i++) {
          const item = cells[i];
          if (item.strength <= 0.01 || item.cx < 0 || item.cy < 0) continue;
          const key = `${item.cx},${item.cy}`;
          const prev = cellMap.get(key);
          if (!prev || item.strength > prev.strength) {
            cellMap.set(key, item);
          }
        }

        ctx.fillStyle = POINTER_COLOR;
        const radius = (PIXEL_SIZE * 0.5) * DOT_RADIUS_RATIO;
        cellMap.forEach((item) => {
          ctx.globalAlpha = Math.min(1, Math.max(0, item.strength));
          const centerX = (item.cx + 0.5) * PIXEL_SIZE;
          const centerY = (item.cy + 0.5) * PIXEL_SIZE;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const checkSection = (x: number, y: number) => {
      const el = document.elementFromPoint(x, y) as HTMLElement | null;
      const inHeroOrContact = Boolean(el?.closest?.("#top, #contact"));
      inWebGLSection.current = inHeroOrContact;
      const host = el?.closest?.("[data-pill]") as HTMLElement | null;
      setPill(host?.dataset.pill ?? null);
    };

    const onMove = (e: PointerEvent) => {
      setVisible(true);
      pointerPos.current = { x: e.clientX, y: e.clientY, active: true };
      px.set(e.clientX);
      py.set(e.clientY);
      checkSection(e.clientX, e.clientY);
    };

    const onScroll = () => {
      if (pointerPos.current.active) {
        checkSection(pointerPos.current.x, pointerPos.current.y);
      }
    };

    const onLeave = () => {
      setVisible(false);
      pointerPos.current.active = false;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, [enabled, px, py]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[65]"
      style={{ opacity: visible ? 1 : 0, transition: "opacity .25s" }}
    >
      {enabled && <canvas ref={canvasRef} className="absolute inset-0" />}

      {pill && (
        <motion.div className="fixed top-0 left-0 z-[250]" style={{ x: jx, y: jy }}>
          <motion.span
            initial={{ opacity: 0, scale: 0.9, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mono absolute block px-[7px] py-[3px] text-[9px] whitespace-nowrap"
            style={{ background: "#c0fe04", color: "#05060a", transform: "translate(12px, 14px)" }}
          >
            {pill}
          </motion.span>
        </motion.div>
      )}
    </div>
  );
}
