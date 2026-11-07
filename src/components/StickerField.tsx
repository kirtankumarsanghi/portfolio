import { useEffect, useRef, useState, type ReactNode } from "react";
import { gsap } from "gsap";
import { applyBayer } from "@/lib/bayerMask";
import { SPAWN_POOL } from "@/components/Stickers";

const SHADOW = "drop-shadow(0 16px 14px rgba(2,4,44,0.5)) drop-shadow(0 3px 3px rgba(2,4,44,0.35))";
const MAX_STICKERS = 24;
const DISSOLVE_S = 0.6;

export type StickerItem = {
  id: string;
  node: ReactNode;
  /** home position, % of the field */
  x: number;
  y: number;
  /** px at a 1440-wide viewport */
  size: number;
  repel?: number;
  drift?: number;
  spin?: number;
  flip?: number;
};

type Spawned = { id: number; kind: string; size: number; node: ReactNode };
type Body = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  size: number;
  drag: boolean;
  px: number;
  py: number;
  dissolve: number; // -1 alive, 0..1 dissolving
};

const scaleFor = (w: number) => Math.min(1.25, Math.max(0.5, w / 1440));

/**
 * Hero stickers (spec 1):
 *  - Resting stickers drift around their home spot, are repelled by the pointer within 180px, and can be
 *    dragged + thrown.
 *  - Pointerdown anywhere in the hero (ignoring `a, button, nav, [data-ui]`, and existing stickers) spawns
 *    ONE die-cut sticker from the 14-design pool (no immediate repeats) with the pointer's recent velocity
 *    (or a small random velocity if still). Spawned stickers float with light damping, bounce softly off the
 *    viewport edges, and collide with every other sticker (elastic 2D disc collisions).
 *  - Capped at 24 total stickers; beyond that the oldest spawned sticker dissolves with a 0.6s Bayer pixel
 *    fade and is removed. ESC or double-clicking empty hero space dissolves all spawned stickers.
 */
export function StickerField({
  items,
  active,
  reduced,
  spawnOnClick = false,
  className = "",
}: {
  items: StickerItem[];
  active: boolean;
  reduced: boolean;
  spawnOnClick?: boolean;
  className?: string;
}) {
  const root = useRef<HTMLDivElement | null>(null);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const spawnRefs = useRef(new Map<number, HTMLDivElement>());
  const [spawned, setSpawned] = useState<Spawned[]>([]);
  const bodies = useRef<Body[]>([]);
  const seq = useRef(1);
  const lastKind = useRef("");

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let w = el.clientWidth;
    let h = el.clientHeight;
    const homeY = (it: StickerItem) => (w < 640 ? Math.max(it.y, 34) : it.y);
    const st = items.map((it, i) => ({
      x: (it.x / 100) * w,
      y: (homeY(it) / 100) * h,
      vx: 0,
      vy: 0,
      ph: i * 1.93 + 0.7,
      drag: false,
      px: 0,
      py: 0,
    }));
    const ptr = { x: -9999, y: -9999, vx: 0, vy: 0, t: 0, downKind: "" as "" | "rest" | "spawn", downIdx: -1 };
    let t = 0;

    const publish = () => {
      const alive = bodies.current.filter((b) => b.dissolve < 0).length;
      (window as unknown as { __stickerStats?: { resting: number; spawned: number; total: number; kinds: string[] } }).__stickerStats = {
        resting: items.length,
        spawned: alive,
        total: items.length + alive,
        kinds: bodies.current.map((b) => String(b.id)),
      };
    };
    publish();

    const size = () => {
      w = el.clientWidth;
      h = el.clientHeight;
      const s = scaleFor(w);
      items.forEach((it, i) => {
        const n = refs.current[i];
        if (n) n.style.width = `${it.size * s}px`;
      });
      bodies.current.forEach((b) => {
        const n = spawnRefs.current.get(b.id);
        if (n) n.style.width = `${b.size * s}px`;
      });
    };
    const placeRest = (i: number, rot: number, flip: number, grabbed: boolean) => {
      const n = refs.current[i];
      if (!n) return;
      n.style.transform = `translate3d(${st[i].x}px,${st[i].y}px,0) translate(-50%,-50%) rotate(${rot}deg) perspective(900px) rotateY(${flip}deg) scale(${grabbed ? 1.12 : 1})`;
      n.style.cursor = grabbed ? "grabbing" : "grab";
    };
    const snap = () => {
      items.forEach((it, i) => {
        st[i].x = (it.x / 100) * w;
        st[i].y = (homeY(it) / 100) * h;
        placeRest(i, (i % 2 ? 1 : -1) * 6, 0, false);
      });
    };

    size();
    const onResize = () => {
      size();
      if (reduced || !active) snap();
    };
    window.addEventListener("resize", onResize);

    if (reduced || !active) {
      snap();
      return () => window.removeEventListener("resize", onResize);
    }

    const pickDesign = () => {
      const choices = SPAWN_POOL.filter((d) => d.kind !== lastKind.current);
      const pick = choices[Math.floor(Math.random() * choices.length)] ?? SPAWN_POOL[0];
      lastKind.current = pick.kind;
      return pick;
    };

    const spawnAt = (x: number, y: number) => {
      const d = pickDesign();
      const id = seq.current++;
      const now = performance.now();
      const recent = now - ptr.t < 140;
      const speed = Math.hypot(ptr.vx, ptr.vy);
      let vx = recent && speed > 25 ? Math.max(-720, Math.min(720, ptr.vx * 0.55)) : 0;
      let vy = recent && speed > 25 ? Math.max(-720, Math.min(720, ptr.vy * 0.55)) : 0;
      if (Math.hypot(vx, vy) < 40) {
        const a = Math.random() * Math.PI * 2;
        const sp = 95 + Math.random() * 140;
        vx = Math.cos(a) * sp;
        vy = Math.sin(a) * sp;
      }
      bodies.current.push({
        id,
        x,
        y,
        vx,
        vy,
        rot: (Math.random() - 0.5) * 28,
        vr: (Math.random() - 0.5) * 150,
        size: d.size,
        drag: false,
        px: x,
        py: y,
        dissolve: -1,
      });
      // cap total stickers (resting + non-dissolving spawned) at 24 → oldest dissolves out
      const maxSpawned = Math.max(1, MAX_STICKERS - items.length);
      const alive = bodies.current.filter((b) => b.dissolve < 0);
      while (alive.length > maxSpawned) {
        const oldest = alive.shift()!;
        oldest.dissolve = 0.001;
      }
      setSpawned((prev) => [...prev, { id, kind: d.kind, size: d.size, node: d.render() }]);
      publish();
    };

    const clearAll = () => {
      let changed = false;
      bodies.current.forEach((b) => {
        if (b.dissolve < 0) {
          b.dissolve = 0.001;
          changed = true;
        }
      });
      if (changed) publish();
    };

    /* grab an existing sticker if the pointer is on one; otherwise spawn a new sticker if inside the hero */
    const onWindowDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      const target = e.target as HTMLElement | null;
      if (target?.closest?.("a, button, nav, input, textarea, [role='button'], [data-ui]")) return;

      const r = el.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
      // only while the hero is actually in view
      if (r.bottom < 80 || r.top > window.innerHeight - 80) return;

      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const s = scaleFor(w);

      // check spawned stickers first (topmost)
      for (let i = bodies.current.length - 1; i >= 0; i--) {
        const b = bodies.current[i];
        if (b.dissolve >= 0) continue;
        if (Math.hypot(b.x - x, b.y - y) < (b.size * s) * 0.46) {
          ptr.downKind = "spawn";
          ptr.downIdx = b.id;
          b.drag = true;
          b.px = x;
          b.py = y;
          return;
        }
      }
      // then resting stickers
      let best = -1;
      let bestD = Infinity;
      items.forEach((it, i) => {
        const d = Math.hypot(st[i].x - x, st[i].y - y);
        if (d < (it.size * s) * 0.48 && d < bestD) {
          bestD = d;
          best = i;
        }
      });
      if (best >= 0) {
        ptr.downKind = "rest";
        ptr.downIdx = best;
        st[best].drag = true;
        st[best].px = x;
        st[best].py = y;
        return;
      }

      // clicking the 3D name wobbles it (jelly) instead of spawning — reference behaviour
      const nr = (window as unknown as { __heroNameRect?: { x0: number; y0: number; x1: number; y1: number } }).__heroNameRect;
      if (nr && e.clientX >= nr.x0 && e.clientX <= nr.x1 && e.clientY >= nr.y0 && e.clientY <= nr.y1) return;

      if (spawnOnClick) spawnAt(x, y);
    };

    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const now = performance.now();
      const dt = Math.max(4, now - ptr.t) / 1000;
      ptr.vx = (x - ptr.x) / dt;
      ptr.vy = (y - ptr.y) / dt;
      ptr.x = x;
      ptr.y = y;
      ptr.t = now;

      if (ptr.downKind === "rest") {
        const p = st[ptr.downIdx];
        if (p?.drag) {
          p.vx = (x - p.px) * 14;
          p.vy = (y - p.py) * 14;
          p.x = x;
          p.y = y;
          p.px = x;
          p.py = y;
        }
      } else if (ptr.downKind === "spawn") {
        const b = bodies.current.find((k) => k.id === ptr.downIdx);
        if (b?.drag) {
          b.vx = (x - b.px) * 16;
          b.vy = (y - b.py) * 16;
          b.vr = (x - b.px) * 4;
          b.x = x;
          b.y = y;
          b.px = x;
          b.py = y;
        }
      }
    };
    const up = () => {
      if (ptr.downKind === "rest" && st[ptr.downIdx]) st[ptr.downIdx].drag = false;
      if (ptr.downKind === "spawn") {
        const b = bodies.current.find((k) => k.id === ptr.downIdx);
        if (b) b.drag = false;
      }
      ptr.downKind = "";
      ptr.downIdx = -1;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && bodies.current.some((b) => b.dissolve < 0)) clearAll();
    };
    const onDbl = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.("a, button, nav, [data-ui]")) return;
      const r = el.getBoundingClientRect();
      if (e.clientY >= r.top && e.clientY <= r.bottom) clearAll();
    };

    window.addEventListener("pointerdown", onWindowDown, { passive: true });
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("keydown", onKey);
    window.addEventListener("dblclick", onDbl);

    const loop = (_time: number, deltaMs: number) => {
      const dt = Math.min(deltaMs / 1000, 0.04);
      t += dt;
      const s = scaleFor(w);

      // 1) resting stickers: spring home + drift + pointer repulsion within 180px
      items.forEach((it, i) => {
        const p = st[i];
        const drift = (it.drift ?? 14) * s;
        if (p.drag) {
          placeRest(i, Math.sin(t * 2) * 8, 0, true);
          return;
        }
        const hx = (it.x / 100) * w + Math.sin(t * 0.5 + p.ph) * drift;
        const hy = (homeY(it) / 100) * h + Math.cos(t * 0.42 + p.ph * 1.3) * drift;
        let ax = (hx - p.x) * 13 - p.vx * 5;
        let ay = (hy - p.y) * 13 - p.vy * 5;
        const dx = p.x - ptr.x;
        const dy = p.y - ptr.y;
        const d = Math.hypot(dx, dy) || 1;
        const R = (it.repel ?? 180) * s;
        if (d < R) {
          const f = Math.pow(1 - d / R, 2) * 5600 * s;
          ax += (dx / d) * f;
          ay += (dy / d) * f;
        }
        p.vx += ax * dt;
        p.vy += ay * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const rot = Math.sin(t * 0.35 + p.ph) * (it.spin ?? 7) + p.vx * 0.03;
        const flip = Math.sin(t * 0.6 + p.ph) * (it.flip ?? 16);
        placeRest(i, rot, flip, false);
      });

      // 2) spawned stickers: zero-G float with damping, soft wall bounce, disc-disc collisions
      const list = bodies.current;
      const damp = Math.pow(0.28, dt); // gentle air drag
      const dead: number[] = [];

      for (let i = 0; i < list.length; i++) {
        const b = list[i];
        if (b.dissolve >= 0) {
          b.dissolve += dt / DISSOLVE_S;
          if (b.dissolve >= 1) {
            dead.push(b.id);
            continue;
          }
        }
        if (!b.drag) {
          // tiny idle drift + pointer repulsion within 160px
          const dxp = b.x - ptr.x;
          const dyp = b.y - ptr.y;
          const dp = Math.hypot(dxp, dyp) || 1;
          const Rp = 160 * s;
          if (dp < Rp) {
            const f = Math.pow(1 - dp / Rp, 2) * 2400 * s;
            b.vx += (dxp / dp) * f * dt;
            b.vy += (dyp / dp) * f * dt;
          }
          b.vx *= damp;
          b.vy *= damp;
          b.vr *= Math.pow(0.4, dt);
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          b.rot += b.vr * dt + Math.sin(t * 0.9 + b.id) * 0.12;

          const rad = (b.size * s) * 0.42;
          const pad = 16;
          if (b.x < rad + pad) {
            b.x = rad + pad;
            b.vx = Math.abs(b.vx) * 0.78;
            b.vr = -b.vr * 0.7;
          } else if (b.x > w - rad - pad) {
            b.x = w - rad - pad;
            b.vx = -Math.abs(b.vx) * 0.78;
            b.vr = -b.vr * 0.7;
          }
          if (b.y < rad + 64) {
            b.y = rad + 64;
            b.vy = Math.abs(b.vy) * 0.78;
          } else if (b.y > h - rad - 54) {
            b.y = h - rad - 54;
            b.vy = -Math.abs(b.vy) * 0.78;
          }
        }
      }

      // elastic collisions between spawned stickers + against resting stickers
      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        const ra = (a.size * s) * 0.4;
        for (let j = i + 1; j < list.length; j++) {
          const b = list[j];
          const rb = (b.size * s) * 0.4;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy) || 0.001;
          const minD = ra + rb;
          if (dist < minD) {
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = (minD - dist) * 0.52;
            if (!a.drag) {
              a.x -= nx * overlap;
              a.y -= ny * overlap;
            }
            if (!b.drag) {
              b.x += nx * overlap;
              b.y += ny * overlap;
            }
            const rvx = b.vx - a.vx;
            const rvy = b.vy - a.vy;
            const vn = rvx * nx + rvy * ny;
            if (vn < 0) {
              const imp = -vn * 0.82;
              if (!a.drag) {
                a.vx -= nx * imp;
                a.vy -= ny * imp;
              }
              if (!b.drag) {
                b.vx += nx * imp;
                b.vy += ny * imp;
              }
            }
          }
        }
        items.forEach((it, k) => {
          const rk = (it.size * s) * 0.38;
          const dx = a.x - st[k].x;
          const dy = a.y - st[k].y;
          const dist = Math.hypot(dx, dy) || 0.001;
          const minD = ra + rk;
          if (dist < minD && !a.drag) {
            const nx = dx / dist;
            const ny = dy / dist;
            a.x += nx * (minD - dist);
            a.y += ny * (minD - dist);
            const vn = (a.vx - st[k].vx) * nx + (a.vy - st[k].vy) * ny;
            if (vn < 0) {
              a.vx -= nx * vn * 1.5;
              a.vy -= ny * vn * 1.5;
              st[k].vx += nx * vn * 0.4;
              st[k].vy += ny * vn * 0.4;
            }
          }
        });
      }

      for (let i = 0; i < list.length; i++) {
        const b = list[i];
        const n = spawnRefs.current.get(b.id);
        if (!n) continue;
        n.style.width = `${b.size * s}px`;
        n.style.transform = `translate3d(${b.x}px,${b.y}px,0) translate(-50%,-50%) rotate(${b.rot.toFixed(2)}deg) scale(${b.drag ? 1.12 : 1})`;
        n.style.cursor = b.drag ? "grabbing" : "grab";
        if (b.dissolve >= 0) applyBayer(n, b.dissolve);
      }

      if (dead.length) {
        bodies.current = bodies.current.filter((b) => !dead.includes(b.id));
        dead.forEach((id) => spawnRefs.current.delete(id));
        setSpawned((prev) => prev.filter((sp) => !dead.includes(sp.id)));
        publish();
      }
    };
    gsap.ticker.add(loop);
    return () => {
      gsap.ticker.remove(loop);
      window.removeEventListener("pointerdown", onWindowDown);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("dblclick", onDbl);
      window.removeEventListener("resize", onResize);
    };
  }, [items, active, reduced, spawnOnClick]);

  return (
    <div ref={root} className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden="true">
      {items.map((it, i) => (
        <div
          key={it.id}
          ref={(n) => {
            refs.current[i] = n;
          }}
          className="pointer-events-auto absolute top-0 left-0 touch-none select-none will-change-transform"
          data-nofx
          style={{ width: it.size, filter: SHADOW }}
        >
          {it.node}
        </div>
      ))}
      {spawned.map((sp) => (
        <div
          key={sp.id}
          data-spawned={sp.kind}
          ref={(n) => {
            if (n) spawnRefs.current.set(sp.id, n);
            else spawnRefs.current.delete(sp.id);
          }}
          className="pointer-events-auto absolute top-0 left-0 touch-none select-none will-change-transform"
          data-nofx
          style={{ width: sp.size, filter: SHADOW }}
        >
          {sp.node}
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------------------- */

export type OrbitItem = {
  id: string;
  node: ReactNode;
  size: number;
  rx: number;
  ry: number;
  speed: number;
  phase: number;
  tilt: number;
};

/** Stickers orbiting a centre point; z-index swaps so they pass behind and in front of the centrepiece. */
export function OrbitStickers({
  items,
  active,
  reduced,
  cy = 46,
}: {
  items: OrbitItem[];
  active: boolean;
  reduced: boolean;
  cy?: number;
}) {
  const root = useRef<HTMLDivElement | null>(null);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
    let t = 0;

    const draw = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const s = scaleFor(w);
      const base = Math.min(w, h * 1.5);
      items.forEach((it, i) => {
        const n = refs.current[i];
        if (!n) return;
        const a = t * it.speed + it.phase;
        const ex = Math.cos(a) * it.rx * base;
        const ey = Math.sin(a) * it.ry * h;
        const c = Math.cos((it.tilt * Math.PI) / 180);
        const sn = Math.sin((it.tilt * Math.PI) / 180);
        const x = w / 2 + ex * c - ey * sn + ptr.x * 18;
        const y = (cy / 100) * h + ex * sn + ey * c + ptr.y * 12;
        const depth = Math.sin(a);
        n.style.width = `${it.size * s * (1 + depth * 0.18)}px`;
        n.style.zIndex = depth > 0 ? "3" : "1";
        n.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-50%) rotate(${Math.sin(a * 0.7) * 12}deg) perspective(900px) rotateY(${Math.cos(a) * 24}deg)`;
      });
    };

    draw();
    window.addEventListener("resize", draw);
    if (reduced || !active) return () => window.removeEventListener("resize", draw);

    const onMove = (e: PointerEvent) => {
      ptr.tx = (e.clientX / window.innerWidth) * 2 - 1;
      ptr.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    const loop = (_time: number, ms: number) => {
      const dt = Math.min(ms / 1000, 0.04);
      t += dt;
      ptr.x += (ptr.tx - ptr.x) * Math.min(1, dt * 3);
      ptr.y += (ptr.ty - ptr.y) * Math.min(1, dt * 3);
      draw();
    };
    gsap.ticker.add(loop);
    return () => {
      gsap.ticker.remove(loop);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", draw);
    };
  }, [items, active, reduced, cy]);

  return (
    <div ref={root} className="pointer-events-none absolute inset-0" aria-hidden="true">
      {items.map((it, i) => (
        <div
          key={it.id}
          ref={(n) => {
            refs.current[i] = n;
          }}
          className="absolute top-0 left-0 select-none will-change-transform"
          style={{ width: it.size, filter: SHADOW }}
        >
          {it.node}
        </div>
      ))}
    </div>
  );
}
