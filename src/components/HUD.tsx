import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { nav, profile } from "@/data/site";
import { useApp } from "@/lib/app-context";
import { useHud, useScrollProgressValue } from "@/hooks/useHud";
import { scrollToId } from "@/hooks/useScroll";

const MERIDIAN_D = "M24 23C11.8497 23 2 18.0751 2 12C2 5.92487 11.8497 1 24 1";

/**
 * Exact 48x24 oval RotatingGlobe from curiositywen.design (module 54262).
 */
function RotatingGlobe() {
  return (
    <svg width="48" height="24" viewBox="0 0 48 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" cx="24" cy="12" rx="22" ry="11" />
      <path stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" d="M2 12H46" />
      {Array.from({ length: 6 }, (_, i) => (
        <g key={i} transform="translate(24 12)">
          <g>
            <animateTransform
              attributeName="transform"
              type="scale"
              dur="2600ms"
              repeatCount="indefinite"
              values="1 1;-1 1"
              keyTimes="0;1"
              calcMode="spline"
              keySplines="0.42 0 0.58 1"
              begin={`${(-2600 * i) / 6}ms`}
            />
            <path
              stroke="currentColor"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              d={MERIDIAN_D}
              transform="translate(-24 -12)"
            />
          </g>
        </g>
      ))}
    </svg>
  );
}

/**
 * Exact gapped 3x3 crosshair SVG grid from curiositywen.design (module 13717):
 * 24px gaps around each intersection with 12px crosshairs in mix-blend-difference.
 */
function GappedCrosshairGrid() {
  const [size, setSize] = useState({ width: typeof window !== "undefined" ? window.innerWidth : 1440, height: typeof window !== "undefined" ? window.innerHeight : 900 });

  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    onResize();
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const { width, height } = size;
  const pad = width < 1024 ? 16 : 56;

  const { verticalPath, horizontalPath, crossPath } = useMemo(() => {
    const innerW = Math.max(0, width - 2 * pad);
    const segH = Math.max(0, height / 3 - 12);
    const y2Start = segH + 24;
    const y2End = y2Start + segH;
    const cols = width < 1280 ? 2 : 3;
    const xCoords = Array.from({ length: cols + 1 }, (_, idx) => pad + (idx / cols) * innerW).map(
      (x) => Math.round(x) + 0.5,
    );
    const vSegments = [
      { startY: 0, endY: segH },
      { startY: y2Start, endY: y2End },
      { startY: y2End + 24, endY: height },
    ];
    const yCoords = [segH + 12, y2End + 12];

    const vPath = vSegments
      .map(({ startY, endY }) => xCoords.map((x) => `M${x} ${startY}V${endY}`).join(""))
      .join("");

    const hPath = yCoords
      .map((y) => {
        if (xCoords.length < 2) return "";
        const firstX = xCoords[0];
        const lastX = xCoords[xCoords.length - 1];
        const midSegs = xCoords.slice(0, -1).map((x, idx) => {
          const nextX = xCoords[idx + 1];
          return `M${x + 12} ${y}H${nextX - 12}`;
        });
        return [`M0 ${y}H${firstX - 12}`, ...midSegs, `M${lastX + 12} ${y}H${width}`].join("");
      })
      .join("");

    const cPath = xCoords
      .flatMap((x) => yCoords.flatMap((y) => [`M${x} ${y - 6}V${y + 6}`, `M${x - 6} ${y}H${x + 6}`]))
      .join("");

    return { verticalPath: vPath, horizontalPath: hPath, crossPath: cPath };
  }, [width, height, pad]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[20] h-full w-full mix-blend-difference" aria-hidden="true">
      <svg viewBox={`0 0 ${width} ${height}`} className="block h-full w-full" shapeRendering="crispEdges">
        <path d={verticalPath} stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" fill="none" />
        <path d={horizontalPath} stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" fill="none" />
        <path d={crossPath} stroke="#FFFFFF" strokeWidth="1" fill="none" opacity={0.4} />
      </svg>
    </div>
  );
}

export default function HUD() {
  const { theme, toggleTheme, sound, toggleSound, tick, bootDone, reduced } = useApp();
  const { meta, coords } = useHud();
  const progress = useScrollProgressValue();
  const [active, setActive] = useState("");
  const [shown, setShown] = useState(false);
  const [spinIdx, setSpinIdx] = useState(0);
  const [soundHover, setSoundHover] = useState(false);
  const SPIN = ["-", "\\", "|", "/"] as const;

  useEffect(() => {
    if (reduced || soundHover) return;
    const id = window.setInterval(() => setSpinIdx((i) => (i + 1) % 4), 150);
    return () => window.clearInterval(id);
  }, [reduced, soundHover]);

  useEffect(() => {
    if (!bootDone) return;
    const t = window.setTimeout(() => setShown(true), 200);
    return () => window.clearTimeout(t);
  }, [bootDone]);

  useEffect(() => {
    if (!bootDone) return;
    const sections = Array.from(document.querySelectorAll<HTMLElement>("main > section"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          document.documentElement.dataset.tone = el.dataset.tone ?? "normal";
          setActive(nav.some((n) => n.id === el.id) ? el.id : "");
        });
      },
      { rootMargin: "-45% 0px -54% 0px" },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [bootDone]);

  const go = (id: string) => {
    tick(1320);
    scrollToId(id);
  };

  return (
    <>
      <GappedCrosshairGrid />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: shown ? 1 : 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="pointer-events-none fixed inset-0 z-[80] transition-colors duration-700"
        style={{ color: "var(--hud-fg)" }}
      >
        {/* Top bar */}
        <header className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 px-4 py-4 lg:px-14 lg:py-7">
          <button
            onClick={() => go("top")}
            onMouseEnter={() => tick(1400)}
            className="nav-box pointer-events-auto flex items-center gap-2 p-2 text-left font-sans text-sm font-bold tracking-wider uppercase"
            aria-label={`${profile.brand} — back to top`}
          >
            {profile.brand}
          </button>

          <nav className="pointer-events-auto flex items-center gap-3 sm:gap-5 md:gap-8" aria-label="Primary">
            {nav.map((n) => (
              <button
                key={n.id}
                onClick={() => go(n.id)}
                onMouseEnter={() => tick(1560)}
                className="nav-box mono p-2 transition-colors duration-300"
                style={{ color: active === n.id ? "#c0fe04" : undefined }}
                aria-label={`Jump to ${n.label.toLowerCase()}`}
              >
                {n.label}
              </button>
            ))}
            <button
              onClick={toggleTheme}
              onMouseEnter={() => tick(980)}
              className="nav-box mono p-2"
              aria-pressed={theme === "light"}
              aria-label="Toggle colour theme"
            >
              THEME[{theme === "dark" ? "D" : "L"}]
            </button>
            <button
              onClick={toggleSound}
              onMouseEnter={() => {
                setSoundHover(true);
                tick(880);
              }}
              onMouseLeave={() => setSoundHover(false)}
              onFocus={() => setSoundHover(true)}
              onBlur={() => setSoundHover(false)}
              className="nav-box mono p-2"
              aria-pressed={sound}
              aria-label="Toggle interface sound"
            >
              SOUND[
              <span className="inline-block w-[1ch] text-center">
                {soundHover || reduced ? (sound ? "+" : "-") : SPIN[spinIdx]}
              </span>
              ]
            </button>
          </nav>
        </header>

        {/* Bottom bar */}
        <footer className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 px-4 py-4 lg:px-14 lg:py-7">
          <div className="mono flex items-center gap-2 p-2 whitespace-nowrap opacity-90">
            <span>{meta}</span>
          </div>
          <button
            onClick={() => go("top")}
            className="nav-box mono pointer-events-auto hidden p-2 whitespace-nowrap opacity-85 lg:inline-block"
            aria-label="Scroll to top"
          >
            {coords.x} X {coords.y} Y
          </button>
          <div className="flex items-center p-2 opacity-90" aria-hidden="true">
            <RotatingGlobe />
          </div>
        </footer>

        {/* Right-edge scroll rail */}
        <div
          className="absolute top-1/2 right-[7px] hidden h-[188px] w-[4px] -translate-y-1/2 rounded-full sm:block md:right-[14px]"
          style={{ background: "var(--hud-line)" }}
          aria-hidden="true"
        >
          <motion.div
            className="absolute top-0 left-0 h-full w-full origin-top rounded-full"
            style={{ background: "currentColor", scaleY: progress }}
          />
        </div>
      </motion.div>
    </>
  );
}
