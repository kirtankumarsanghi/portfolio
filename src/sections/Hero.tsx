import { lazy, Suspense, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { heroHeadline, heroTop } from "@/data/site";
import { useApp } from "@/lib/app-context";
import { useOnScreen } from "@/hooks/useScroll";
import { ScrambleReveal } from "@/components/Scramble";

gsap.registerPlugin(ScrollTrigger);
const HeroScene = lazy(() => import("@/scenes/HeroScene"));

/**
 * Hero section matching curiositywen.design:
 * - Full-bleed WebGL canvas with 5-stage water/bokeh feedback shader, 3D falling & click-burst stickers,
 *   refractive chromatic glass 3D models (`hello.gltf` + `cursor.glb`), 6-ray starburst lens flare,
 *   Navier-Stokes cursor fluid displacement, and dot-matrix scroll transition.
 * - 12-column grid overlay with two-stage lime scramble decode (#c0fe04 -> #DFFF81 -> white).
 */
export default function Hero() {
  const { bootDone, reduced } = useApp();
  const outer = useRef<HTMLElement | null>(null);
  const dark = useRef<HTMLDivElement | null>(null);
  const head = useRef<HTMLDivElement | null>(null);
  const top = useRef<HTMLDivElement | null>(null);
  const progress = useRef(0);
  const dissolve = useRef(0);
  const { ref: visRef, visible } = useOnScreen<HTMLDivElement>("200px");

  useEffect(() => {
    if (!bootDone || reduced) return;
    const st = ScrollTrigger.create({
      trigger: outer.current,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.5,
      onUpdate: (self) => {
        const p = gsap.utils.clamp(0, 1, self.progress);
        progress.current = p;
        const vh = window.innerHeight;
        if (p <= 0.001) {
          dissolve.current = 0;
          gsap.set(head.current, { y: 0, opacity: 1 });
          gsap.set(top.current, { y: 0, opacity: 1 });
          gsap.set(dark.current, { opacity: 0 });
          return;
        }
        const d = gsap.utils.clamp(0, 1, p / 0.75);
        dissolve.current = d;
        gsap.set(head.current, { y: -0.3 * vh * p, opacity: Math.max(0, 1 - p * 1.6) });
        gsap.set(top.current, { y: -0.12 * vh * p, opacity: Math.max(0, 1 - p * 2.2) });
        gsap.set(dark.current, { opacity: gsap.utils.clamp(0, 1, (p - 0.35) / 0.55) });
      },
    });
    return () => st.kill();
  }, [bootDone, reduced]);

  return (
    <section
      ref={outer}
      id="top"
      data-tone="invert"
      className="relative z-10 h-[200svh] w-full"
      style={{ background: "#0F1111" }}
      aria-label="Introduction"
    >
      <div ref={visRef} className="pointer-events-none absolute inset-x-0 top-0 h-[100svh]" />

      <div className="sticky top-0 h-[100svh] w-full overflow-hidden" style={{ background: "#00344C" }}>
        {/* Fullscreen WebGL scene */}
        <div className="absolute inset-0 z-10">
          {bootDone && (
            <Suspense fallback={null}>
              <HeroScene scroll={progress} dissolve={dissolve} active={visible} reduced={reduced} />
            </Suspense>
          )}
        </div>

        {/* 12-column Hero overlay matching curiositywen.design */}
        <div className="pointer-events-none relative z-30 grid h-dvh w-full grid-cols-12 grid-rows-[auto_1fr] px-4 py-18 text-white lg:h-screen lg:px-14 lg:py-24">
          {/* Top metadata row */}
          <div
            ref={top}
            className="order-2 col-span-12 flex flex-col font-mono text-[15px] leading-[1.35] lg:order-1 lg:grid lg:grid-cols-12"
          >
            <span className="hidden p-2 font-sans text-[4svw] leading-tight font-medium sm:text-2xl lg:col-span-3 lg:col-start-1 lg:block lg:text-[28px] xl:col-span-2">
              <ScrambleReveal text={heroTop.left[0]} startDelayMs={300} letterDelayMs={10} active={bootDone} />
              <br />
              <ScrambleReveal text={heroTop.left[1]} startDelayMs={300} letterDelayMs={10} active={bootDone} />
            </span>

            <span className="hidden p-2 text-balance lg:col-span-3 lg:col-start-4 lg:block xl:col-span-2 xl:col-start-5">
              <ScrambleReveal
                text={`${heroTop.middle[0]} ${heroTop.middle[1]}`}
                startDelayMs={300}
                letterDelayMs={10}
                active={bootDone}
              />
            </span>

            <span className="col-span-12 mt-auto p-2 lg:col-span-6 lg:col-start-7 lg:mt-0 xl:col-span-4 xl:col-start-9">
              <ScrambleReveal text={heroTop.right} startDelayMs={300} letterDelayMs={10} active={bootDone} />
            </span>
          </div>

          {/* Bottom-left display headline with staggered 2-stage lime scramble */}
          <div
            ref={head}
            className="display order-1 col-span-12 flex flex-col self-end px-2 text-[7.2svw] leading-[0.94] font-bold uppercase will-change-transform lg:order-2 lg:text-[5.2svw] xl:text-[4.8svw] 2xl:text-[4.4svw]"
          >
            <h1 className="flex flex-col">
              <ScrambleReveal text={heroHeadline[0]} startDelayMs={300} letterDelayMs={80} active={bootDone} />
              <ScrambleReveal text={heroHeadline[1]} startDelayMs={500} letterDelayMs={80} active={bootDone} />
              <ScrambleReveal text={heroHeadline[2]} startDelayMs={700} letterDelayMs={80} active={bootDone} />
            </h1>
          </div>
        </div>

        {/* Scroll fade to #0F1111 */}
        <div
          ref={dark}
          className="pointer-events-none absolute inset-0 z-50"
          style={{ background: "#0F1111", opacity: 0 }}
        />
      </div>
    </section>
  );
}
