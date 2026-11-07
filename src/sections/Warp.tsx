import { lazy, Suspense, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { warpMantras, warpWords } from "@/data/site";
import { useApp } from "@/lib/app-context";
import { useOnScreen, usePointer, useScrollVelocity } from "@/hooks/useScroll";

gsap.registerPlugin(ScrollTrigger);
const WarpScene = lazy(() => import("@/scenes/WarpScene"));

const ANGLES = [148, 36, 214, 326];
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/* glossy cursor-arrow silhouette, centred in its own box, used as the portal mask */
const ARROW_MASK =
  'url("data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="3 2 23 29.6"><path d="M3 2 L26 16.5 L15.6 18.2 L20.4 29.4 L15.1 31.6 L10.6 20.4 L3 25.6 Z" fill="#fff"/></svg>`,
  ) +
  '")';
const ARROW_RATIO = 23 / 29.6;

const PORTAL_END = 0.19; // mask fully covers the viewport here
const WORDS_START = 0.23;
const WORDS_END = 0.86;
const EXIT_START = 0.87;

/** arrow-tip anchor: starts at the pointer's last position, drifts up-left so the body covers the screen */
const tipFrom = { x: 0, y: 0 };
function portalTip(eased: number) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const sx = tipFrom.x || w / 2;
  const sy = tipFrom.y || h / 2;
  const k = eased * eased;
  return { x: sx + (-0.12 * w - sx) * k, y: sy + (-0.08 * h - sy) * k };
}

export default function Warp() {
  const { reduced, bootDone } = useApp();
  const section = useRef<HTMLElement | null>(null);
  const portal = useRef<HTMLDivElement | null>(null);
  const glow = useRef<HTMLDivElement | null>(null);
  const exitWipe = useRef<SVGSVGElement | null>(null);
  const exitHole = useRef<SVGGElement | null>(null);
  const tint = useRef<HTMLDivElement | null>(null);
  const sparks = useRef<HTMLDivElement | null>(null);
  const lastPtr = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const exitP = useRef(0);
  const rings = useRef<HTMLDivElement | null>(null);
  const blocks = useRef<(HTMLDivElement | null)[]>([]);
  const mantras = useRef<(HTMLDivElement | null)[]>([]);
  const speed = useRef(0);
  const vel = useScrollVelocity();
  const ptr = usePointer();
  const { ref: visRef, visible } = useOnScreen<HTMLDivElement>("250px");

  /* ---- scroll choreography: portal → words → exit wipe, all clamped ---- */
  useEffect(() => {
    const apply = (p: number) => {
      const s = gsap.utils.clamp(0, 1, p);

      // reduced motion: no scroll choreography at all — show the first phrase, pure white, and stop
      if (reduced) {
        blocks.current.forEach((el, i) => {
          if (!el) return;
          el.style.visibility = i === 0 ? "visible" : "hidden";
          el.querySelectorAll<HTMLElement>("[data-wl]").forEach((ln) => {
            ln.style.transform = "none";
            ln.style.filter = "none";
          });
          el.querySelectorAll<HTMLElement>("[data-ch]").forEach((ch) => {
            ch.style.color = "#ffffff";
            ch.style.opacity = "1";
          });
        });
        if (tint.current) tint.current.style.opacity = "0";
        return;
      }

      // 1) arrow portal (never masked in reduced motion — the static fallback must stay visible)
      const portalP = clamp01(s / PORTAL_END);
      const eased = 1 - Math.pow(1 - portalP, 3);
      if (portal.current && !reduced) {
        if (s < PORTAL_END + 0.02) {
          const unit = portalP < 1 ? "vmin" : "vmax";
          const v = portalP < 1 ? 8 + eased * 90 : 300 + (s - PORTAL_END) * 400;
          portal.current.style.maskImage = ARROW_MASK;
          portal.current.style.webkitMaskImage = ARROW_MASK;
          portal.current.style.maskRepeat = "no-repeat";
          portal.current.style.webkitMaskRepeat = "no-repeat";
          const tip = portalTip(eased);
          portal.current.style.maskPosition = `${tip.x.toFixed(1)}px ${tip.y.toFixed(1)}px`;
          portal.current.style.webkitMaskPosition = `${tip.x.toFixed(1)}px ${tip.y.toFixed(1)}px`;
          portal.current.style.maskSize = `${(v * ARROW_RATIO).toFixed(2)}${unit} ${v.toFixed(2)}${unit}`;
          portal.current.style.webkitMaskSize = `${(v * ARROW_RATIO).toFixed(2)}${unit} ${v.toFixed(2)}${unit}`;
        } else {
          portal.current.style.maskImage = "none";
          portal.current.style.webkitMaskImage = "none";
        }
      }
      if (glow.current) {
        const gs = 8 + eased * 90;
        const tip = portalTip(eased);
        glow.current.style.left = `${tip.x}px`;
        glow.current.style.top = `${tip.y}px`;
        glow.current.style.width = `${(gs * ARROW_RATIO).toFixed(2)}vmin`;
        glow.current.style.height = `${gs.toFixed(2)}vmin`;
        glow.current.style.opacity = String(clamp01(1 - portalP * 1.25) * (0.35 + 0.65 * portalP));
      }
      if (sparks.current) {
        const tip = portalTip(eased);
        sparks.current.style.transform = `translate(${tip.x}px, ${tip.y}px) scale(${(1 + eased * 3).toFixed(3)})`;
        sparks.current.style.opacity = String(clamp01(1 - portalP * 1.6));
      }

      // 2) Spec 4.2 — character wave: letters appear ONE BY ONE in reading order across all lines of
      //    the phrase, fading from grey #7d7d7d + opacity 0 → white #fff + opacity 1. No blur, no ghost
      //    copies, no vertical offset. Exit runs the wave in reverse order to opacity 0.
      const wp = (s - WORDS_START) / (WORDS_END - WORDS_START);
      const active = s > WORDS_START - 0.02 && s < WORDS_END + 0.03;
      let tintPeak = 0;
      warpWords.forEach((_, i) => {
        const el = blocks.current[i];
        if (!el) return;
        if (!active) {
          el.style.visibility = "hidden";
          return;
        }
        const local = wp * warpWords.length - i;
        el.style.visibility = local < -0.02 || local > 1.02 ? "hidden" : "visible";
        const enter = clamp01(local / 0.32);
        const exit = clamp01((local - 0.72) / 0.28);
        el.querySelectorAll<HTMLElement>("[data-wl]").forEach((ln) => {
          ln.style.transform = "none";
          ln.style.filter = "none";
        });
        const chars = el.querySelectorAll<HTMLElement>("[data-ch]");
        const N = Math.max(1, chars.length);
        const span = 0.36; // each character's fade window inside the wave
        chars.forEach((ch, j) => {
          const eStart = (j / N) * (1 - span);
          const ep = clamp01((enter - eStart) / span);
          const eEased = 1 - (1 - ep) * (1 - ep); // power1.out
          // reverse order on exit: last letter leaves first
          const rev = N - 1 - j;
          const xStart = (rev / N) * (1 - span);
          const xp = clamp01((exit - xStart) / span);
          const op = eEased * (1 - xp);
          const g = Math.round(125 + (255 - 125) * eEased); // #7d7d7d (125) → #ffffff (255)
          ch.style.color = `rgb(${g},${g},${g})`;
          ch.style.opacity = op.toFixed(3);
        });
        tintPeak = Math.max(tintPeak, Math.sin(clamp01(local) * Math.PI));
      });
      if (tint.current) tint.current.style.opacity = String((0.3 * (1 - tintPeak) * (active ? 1 : 0)).toFixed(3));

      // 3) exit: a black cover wipes in diagonally, its leading edge an arrow-shaped hole that slides
      //    off-screen → the warp is wiped to black and hands over to Skills (also black). No seam.
      const ex = clamp01((s - EXIT_START) / (1 - EXIT_START));
      const w = window.innerWidth;
      const h = window.innerHeight;
      const diag = Math.hypot(w, h);
      const k = (diag * 1.4) / 29.6;
      if (exitHole.current) {
        exitHole.current.setAttribute(
          "transform",
          `translate(${(w / 2 + ex * w * 1.15).toFixed(1)} ${(h / 2 - ex * h * 1.15).toFixed(1)}) scale(${k.toFixed(2)})`,
        );
      }
      if (exitWipe.current) exitWipe.current.style.opacity = String(clamp01(ex * 9).toFixed(3));
      exitP.current = ex;
    };

    apply(0);
    if (reduced) return;
    let ctx: gsap.Context | undefined;
    const build = () => {
      ctx?.revert();
      ctx = gsap.context(() => {
        ScrollTrigger.create({
          trigger: section.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.4,
          onUpdate: (self) => apply(gsap.utils.clamp(0, 1, self.progress)),
        });
      }, section);
    };
    if (bootDone) build();
    return () => ctx?.revert();
  }, [bootDone, reduced]);

  /* remember where the pointer was last seen, so the portal opens from there */
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      lastPtr.current = { x: e.clientX, y: e.clientY };
      const r = section.current?.getBoundingClientRect();
      // freeze the anchor once the section starts scrolling into its pinned phase
      if (!r || r.top > 0) {
        tipFrom.x = e.clientX;
        tipFrom.y = e.clientY;
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  /* ---- rings follow the vanishing point; mantras drift outward; shader speed ---- */
  useEffect(() => {
    if (reduced || !visible) return;
    let drift = 0;
    const sm = { x: 0, y: 0 };
    const loop = (_t: number, ms: number) => {
      const dt = Math.min(ms / 1000, 0.05);
      const v = vel.current;
      // T8: during the exit the streaks stretch into speed lines as the arrow slides away
      speed.current = Math.min(1, v * 1.3 + 0.06 + exitP.current * 0.9);
      drift += dt * (0.03 + v * 0.42);
      const w = window.innerWidth;
      const h = window.innerHeight;
      const diag = Math.hypot(w, h);
      mantras.current.forEach((n, j) => {
        if (!n) return;
        const u = (drift + j / warpMantras.length) % 1;
        const r = diag * (0.16 + 0.52 * Math.pow(u, 1.7));
        const a = (ANGLES[j] * Math.PI) / 180;
        const s = 0.6 + 0.85 * Math.pow(u, 1.3);
        n.style.transform = `translate3d(${Math.cos(a) * r}px,${-Math.sin(a) * r * 0.8}px,0) translate(-50%,-50%) scale(${s})`;
        const fade = clamp01(u / 0.14) * (1 - clamp01((u - 0.62) / 0.24));
        n.style.opacity = String(fade * 0.95);
      });
      sm.x += (ptr.current.tx - sm.x) * Math.min(1, dt * 3);
      sm.y += (ptr.current.ty - sm.y) * Math.min(1, dt * 3);
      if (rings.current) rings.current.style.transform = `translate3d(${sm.x * 0.085 * w}px,${-sm.y * 0.085 * h}px,0)`;
    };
    gsap.ticker.add(loop);
    return () => {
      gsap.ticker.remove(loop);
    };
  }, [visible, reduced, vel, ptr]);

  return (
    <section
      ref={section}
      id="process"
      data-tone="invert"
      className="relative"
      style={{ height: reduced ? "auto" : "500vh", background: "#000" }}
      aria-labelledby="warp-h"
    >
      <div ref={visRef} className="pointer-events-none absolute inset-0" />
      <h2 id="warp-h" className="sr-only">
        {warpWords.map((w) => w.join(" ")).join(". ")}
      </h2>

      <div
        className={
          reduced
            ? "relative flex min-h-[100svh] w-full flex-col items-center justify-center gap-10 overflow-hidden py-24"
            : "sticky top-0 h-[100svh] w-full overflow-hidden bg-black"
        }
      >
        {/* streaks (masked by the arrow during the portal phase) */}
        <div ref={portal} className="absolute inset-0">
          {reduced ? (
            <div
              className="absolute inset-0"
              style={{
                background:
                  "repeating-conic-gradient(from 0deg at 50% 50%, rgba(25,230,255,0.5) 0deg 0.5deg, rgba(0,0,0,0) 0.5deg 5deg), radial-gradient(ellipse at 50% 50%, rgba(25,230,255,0.4) 0%, rgba(138,77,255,0.28) 24%, rgba(255,43,214,0.18) 42%, #000 70%)",
              }}
            />
          ) : (
            <Suspense fallback={null}>
              <WarpScene speed={speed} active={visible && bootDone} />
            </Suspense>
          )}
        </div>

        {/* glowing arrow edge while the portal is small */}
        {!reduced && (
          <div
            ref={glow}
            className="pointer-events-none absolute opacity-0"
            style={{ filter: "drop-shadow(0 0 26px rgba(90,130,255,0.95)) drop-shadow(0 0 60px rgba(27,47,224,0.7))" }}
            aria-hidden="true"
          >
            <svg viewBox="3 2 23 29.6" className="h-full w-full">
              <path d="M3 2 L26 16.5 L15.6 18.2 L20.4 29.4 L15.1 31.6 L10.6 20.4 L3 25.6 Z" fill="none" stroke="#7d9bff" strokeWidth="0.7" />
            </svg>
          </div>
        )}

        {/* lime pixels + "+" sparkles around the small arrow */}
        {!reduced && (
          <div ref={sparks} className="pointer-events-none absolute top-0 left-0 opacity-0" style={{ transformOrigin: "0 0" }} aria-hidden="true">
            {[
              [-34, -18, 0], [52, -26, 1], [74, 30, 0], [-22, 58, 1], [36, 84, 0], [92, 70, 1], [-46, 22, 0], [18, -44, 1],
            ].map(([x, y, plus], i) => (
              <span key={i} className="absolute block" style={{ left: x, top: y }}>
                {plus ? (
                  <span className="relative block h-[9px] w-[9px]">
                    <i className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2" style={{ background: "#c6ff00" }} />
                    <i className="absolute top-0 left-1/2 h-full w-px -translate-x-1/2" style={{ background: "#c6ff00" }} />
                  </span>
                ) : (
                  <span className="block h-[5px] w-[5px]" style={{ background: "#c6ff00", boxShadow: "0 0 8px rgba(198,255,0,.8)" }} />
                )}
              </span>
            ))}
          </div>
        )}

        {/* teal-blue tint that settles to black as each word peaks */}
        <div
          ref={tint}
          className="pointer-events-none absolute inset-0 opacity-0"
          style={{ background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(11,80,120,0.55) 0%, rgba(6,20,60,0.35) 45%, transparent 78%)" }}
          aria-hidden="true"
        />

        {/* lime rings + the vanishing-point pixel (no black disc) */}
        <div ref={rings} className="pointer-events-none absolute inset-0 will-change-transform" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className="warp-ring" style={{ animationDelay: `${-i * 2.17}s`, aspectRatio: `${3.4 + i * 0.35} / 1` }} />
          ))}
          <span
            className="absolute top-1/2 left-1/2 block h-[13px] w-[2px] -translate-x-1/2 -translate-y-1/2"
            style={{ background: "#c6ff00", boxShadow: "0 0 16px 3px rgba(198,255,0,0.85)" }}
          />
        </div>

        {/* drifting one-liners */}
        {!reduced &&
          warpMantras.map((m, j) => (
            <div
              key={m.join("")}
              ref={(n) => {
                mantras.current[j] = n;
              }}
              className="pointer-events-none absolute top-1/2 left-1/2 hidden text-center text-[15px] leading-[1.35] font-normal text-white opacity-0 md:block md:text-[17px]"
              style={{ textShadow: "0 0 12px rgba(0,0,0,0.6)" }}
              aria-hidden="true"
            >
              {m.map((l) => (
                <span key={l} className="block whitespace-nowrap">
                  {l}
                </span>
              ))}
            </div>
          ))}

        {/* centre words */}
        <div className={reduced ? "relative z-10 flex flex-col items-center gap-10 px-4" : "pointer-events-none absolute inset-0 z-10"}>
          {warpWords.map((w, i) => (
            <div
              key={w.join("")}
              ref={(n) => {
                blocks.current[i] = n;
              }}
              className={reduced ? "" : "absolute inset-0 flex items-center justify-center px-4"}
              aria-hidden="true"
              style={reduced || i === 0 ? undefined : { visibility: "hidden" }}
            >
              <div className="display d-warp text-center">
                {w.map((line) => (
                  <span key={line} className="mask-line">
                    <span data-wl className="block whitespace-nowrap">
                      {[...line].map((ch, j) => (
                        <span key={j} data-ch className="inline-block" style={{ color: reduced ? "#fff" : "#8a8a8a" }}>
                          {ch === " " ? "\u00A0" : ch}
                        </span>
                      ))}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* exit wipe: black cover with an arrow-shaped hole that slides diagonally off-screen */}
        {!reduced && (
          <svg ref={exitWipe} className="pointer-events-none absolute inset-0 z-20 h-full w-full opacity-0" aria-hidden="true">
            <defs>
              <mask id="warp-exit-mask">
                <rect width="100%" height="100%" fill="#fff" />
                <g ref={exitHole}>
                  <path
                    d="M-11.5 -14.8 L11.5 -0.3 L1.1 1.4 L5.9 12.6 L0.6 14.8 L-3.9 3.6 L-11.5 8.8 Z"
                    fill="#000"
                  />
                </g>
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="#000" mask="url(#warp-exit-mask)" />
          </svg>
        )}

      </div>
    </section>
  );
}
