import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { useApp } from "@/lib/app-context";
import { EASE, TM } from "@/lib/transitions";

const BOOT_LINES = ["INIT RENDERER", "COMPILE SHADERS", "MOUNT HUD LAYER", "SYNC SCROLL ENGINE"];

/**
 * T1 — black boot screen, mono counter 000 → 100, then a RADIAL pixel-grid wipe from the centre reveals
 * the blue hero. Hand-off: the wipe canvas is drawn fully black ("reveal" at p=0) the instant the boot
 * panel is removed, so there is never a visible seam; then the cells are eaten away from the centre out.
 */
export default function Preloader() {
  const { setBootDone, reduced, tick } = useApp();
  const root = useRef<HTMLDivElement | null>(null);
  const num = useRef<HTMLSpanElement | null>(null);
  const bar = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setBootDone(true);
    };
    const counter = { v: 0 };
    const tl = gsap.timeline();
    tl.to(counter, {
      v: 100,
      duration: reduced ? 0.4 : 1.9,
      ease: "power2.inOut",
      onUpdate: () => {
        if (num.current) num.current.textContent = String(Math.round(counter.v)).padStart(3, "0");
      },
    })
      .to(bar.current, { scaleX: 1, duration: reduced ? 0.4 : 1.9, ease: "power2.inOut" }, 0)
      .to("[data-boot-line]", { opacity: 1, y: 0, stagger: 0.12, duration: 0.5, ease: EASE.in }, 0.1)
      .add(() => {
        if (reduced) {
          gsap.set(root.current, { display: "none" });
          finish();
          return;
        }
        // seamless hand-off: wipe canvas fully black → remove the panel → eat away from the centre
        TM.draw("intro", 0, { mode: "reveal", dir: "radial", color: "#05060a" });
        gsap.set(root.current, { display: "none" });
        tick(420);
        TM.play("intro", { from: 0, to: 1.04, duration: 1.15, ease: EASE.wipe, mode: "reveal", dir: "radial", color: "#05060a", clearAtEnd: true }).then(() => {});
        // mount the hero as the wipe opens, so the name pops in while the cells clear
        window.setTimeout(finish, 380);
      });

    // failsafe: never leave the site behind the boot screen if the main thread is starved
    const guard = window.setTimeout(() => {
      gsap.set(root.current, { display: "none" });
      TM.clear("intro");
      finish();
    }, reduced ? 900 : 4200);

    return () => {
      window.clearTimeout(guard);
      tl.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={root} className="fixed inset-0 z-[200]" style={{ background: "#05060a" }} aria-hidden="true">
      <div data-boot-content className="absolute inset-0 flex flex-col justify-between p-6 md:p-10">
        <div className="flex items-start justify-between">
          <span className="mono text-white/50">KIRTAN.DEV</span>
          <span className="mono text-white/50">PORTFOLIO / BUILD 2026.5</span>
        </div>
        <div className="flex items-end justify-between gap-6">
          <div className="flex flex-col gap-1.5">
            {BOOT_LINES.map((l, i) => (
              <span key={l} data-boot-line className="mono text-white/35" style={{ opacity: 0, transform: "translateY(8px)" }}>
                {String(i + 1).padStart(2, "0")} — {l}
              </span>
            ))}
          </div>
          <span ref={num} className="display text-[18vw] leading-[0.8] text-white md:text-[9vw]" style={{ fontVariantNumeric: "tabular-nums" }}>
            000
          </span>
        </div>
        <div className="h-[2px] w-full" style={{ background: "rgba(255,255,255,0.12)" }}>
          <div ref={bar} className="h-full origin-left scale-x-0" style={{ background: "#c6ff00" }} />
        </div>
      </div>
    </div>
  );
}
