import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Paper-curl card (spec 4.1), built in CSS 3D.
 *
 * Why not a WebGL plane: the card media are live HTML UI mocks. Putting them on a GL plane means
 * rasterising DOM → texture (html2canvas-style) every time anything changes — expensive and blurry.
 * Instead the card is cut into 5 horizontal bands. The centre band stays flat; the two bands above and
 * the two below are NESTED chains (each band is the child of its neighbour), so their rotateX values
 * accumulate and the edges bend progressively like a real sheet of paper. Each band shows its slice of
 * the same media, and a shade overlay darkens bands by their bend angle.
 *
 * Driven entirely by CSS custom properties set on the root (no React re-render per frame):
 *   --bt  top-edge curl (deg)      --bb  bottom-edge curl (deg)
 *   --dim edge dimming 0..1        --hx/--hy hover tilt (deg)   --ly hover lift (px)
 */

const SPLIT = { outer: 0.15, inner: 0.15 }; // fraction of height per side band (×2 each side) → centre 40%

export default function CurlCard({ media, className = "" }: { media: () => ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement | null>(null);
  const [h, setH] = useState(0);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const fit = () => setH(el.clientHeight);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const o = SPLIT.outer * h;
  const i = SPLIT.inner * h;
  const c0 = o + i; // centre band top
  const c1 = h - o - i; // centre band bottom

  /** one slice of the media, offset so the band shows the right part of the full card */
  const face = (offset: number, shade: string) => (
    <div className="absolute inset-0 overflow-hidden" style={{ backfaceVisibility: "hidden" }}>
      <div className="absolute left-0 w-full" style={{ top: -offset, height: h }}>
        {media()}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: shade }} />
    </div>
  );

  const band = { position: "absolute" as const, left: 0, width: "100%", transformStyle: "preserve-3d" as const };

  return (
    <div className={className} style={{ perspective: 1100 }}>
      <div
        ref={root}
        className="relative w-full"
        style={{
          aspectRatio: "560 / 340",
          transformStyle: "preserve-3d",
          transform: "translateY(var(--ly, 0px)) rotateX(var(--hx, 0deg)) rotateY(var(--hy, 0deg))",
          transition: "transform .45s cubic-bezier(.16,1,.3,1)",
        }}
      >
        {h > 0 && (
          <>
            {/* centre — flat */}
            <div style={{ ...band, top: c0, height: c1 - c0 }}>{face(c0, "calc(var(--dim, 0) * 0.5)")}</div>

            {/* lower chain: bands hinge on their top edge, curl the bottom edge away */}
            <div style={{ ...band, top: c1, height: i, transformOrigin: "50% 0", transform: "rotateX(calc(var(--bb, 0deg) * -0.55))" }}>
              {face(c1, "calc(var(--dim, 0) * 0.5 + var(--bbn, 0) * 0.18)")}
              <div style={{ ...band, top: i, height: o, transformOrigin: "50% 0", transform: "rotateX(calc(var(--bb, 0deg) * -1))" }}>
                {face(c1 + i, "calc(var(--dim, 0) * 0.5 + var(--bbn, 0) * 0.36)")}
              </div>
            </div>

            {/* upper chain: bands hinge on their bottom edge, curl the top edge away */}
            <div style={{ ...band, top: o, height: i, transformOrigin: "50% 100%", transform: "rotateX(calc(var(--bt, 0deg) * 0.55))" }}>
              {face(o, "calc(var(--dim, 0) * 0.5 + var(--btn, 0) * 0.18)")}
              <div style={{ ...band, top: -o, height: o, transformOrigin: "50% 100%", transform: "rotateX(calc(var(--bt, 0deg) * 1))" }}>
                {face(0, "calc(var(--dim, 0) * 0.5 + var(--btn, 0) * 0.36)")}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Set curl variables for a card from its viewport position + scroll velocity. Returns the bend for QA. */
export function setCurl(el: HTMLElement, vh: number, velocity: number) {
  const r = el.getBoundingClientRect();
  // n: −1 top of viewport … 0 centre … +1 bottom
  const n = Math.max(-1.4, Math.min(1.4, (r.top + r.height / 2 - vh / 2) / (vh / 2)));
  const edge = Math.max(0, Math.abs(n) - 0.2) / 0.8; // flat in the centre band, curls toward the edges
  const v = Math.max(-1, Math.min(1, velocity));
  const amt = Math.min(78, edge * 64 + Math.abs(v) * 30 * Math.min(1, Math.abs(n) * 1.5));
  const bb = n > 0 ? amt : 0;
  const bt = n < 0 ? amt : 0;
  el.style.setProperty("--bb", `${bb.toFixed(2)}deg`);
  el.style.setProperty("--bt", `${bt.toFixed(2)}deg`);
  el.style.setProperty("--bbn", (bb / 78).toFixed(3));
  el.style.setProperty("--btn", (bt / 78).toFixed(3));
  el.style.setProperty("--dim", Math.min(1, edge * 0.9).toFixed(3));
  return Math.max(bb, bt);
}
