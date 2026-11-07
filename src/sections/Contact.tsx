import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { contactHeadline, profile } from "@/data/site";
import { useApp } from "@/lib/app-context";
import { useOnScreen } from "@/hooks/useScroll";
import { downloadResume } from "@/lib/resume";
import Magnetic from "@/components/Magnetic";
import { lockCharWidths, runScramble, ScrambleText, type ScrambleHandle } from "@/components/Scramble";

gsap.registerPlugin(ScrollTrigger);
const ClosingScene = lazy(() => import("@/scenes/ClosingScene"));

function ScrambleHeadline({ playKey }: { playKey: number }) {
  const { reduced } = useApp();
  const spans = useRef<HTMLSpanElement[]>([]);
  const tween = useRef<ScrambleHandle | null>(null);
  const finals = useRef<string[]>([]);

  finals.current = [];
  let idx = 0;

  useLayoutEffect(() => {
    const chars = spans.current;
    const f = [...finals.current];
    lockCharWidths(chars, f);
    const onResize = () => lockCharWidths(chars, f);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (playKey <= 0) return;
    tween.current?.kill();
    const chars = spans.current;
    const f = [...finals.current];
    if (reduced) {
      chars.forEach((el, i) => {
        if (!el) return;
        el.textContent = f[i] === " " ? "\u00A0" : f[i];
        el.style.color = "#ffffff";
      });
      return;
    }
    lockCharWidths(chars, f);
    tween.current = runScramble(chars, f, { dur: 1.4, finalColor: "#ffffff", scrambleColor: "#c0fe04" });
    return () => {
      tween.current?.kill();
    };
  }, [playKey, reduced]);

  return (
    <div
      aria-hidden="true"
      data-closing-head
      className="display d-contact pointer-events-none absolute inset-x-0 select-none px-4 text-white lg:px-14"
      style={{ top: "clamp(88px, 15svh, 196px)" }}
    >
      {contactHeadline.map((line, li) => (
        <div
          key={li}
          className="flex items-baseline whitespace-nowrap"
          style={{ gap: line.gap ?? "0.24em", paddingLeft: `${line.indent}vw`, justifyContent: line.justify }}
        >
          {line.words.map((w, wi) => (
            <span key={wi} data-wx className="inline-block">
              {[...w.t].map((ch, ci) => {
                const k = idx++;
                finals.current[k] = ch;
                return (
                  <span
                    key={ci}
                    ref={(el) => {
                      if (el) spans.current[k] = el;
                    }}
                    data-cl={k}
                    className="inline-block text-center align-top"
                    style={{ color: "#ffffff" }}
                  >
                    {ch === " " ? "\u00A0" : ch}
                  </span>
                );
              })}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function Contact() {
  const { tick, reduced, bootDone } = useApp();
  const section = useRef<HTMLElement | null>(null);
  const resolve = useRef(0);
  const { ref: visRef, visible } = useOnScreen<HTMLDivElement>("200px");
  const [decodeKey, setDecodeKey] = useState(0);

  const fireDecode = useCallback(() => setDecodeKey((k) => k + 1), []);

  useEffect(() => {
    if (reduced) {
      resolve.current = 0;
      return;
    }
    const st = ScrollTrigger.create({
      trigger: section.current,
      start: "top 92%",
      end: "top 8%",
      scrub: 0.4,
      onUpdate: (self) => {
        resolve.current = 1 - gsap.utils.clamp(0, 1, self.progress);
      },
    });
    return () => st.kill();
  }, [reduced]);

  useEffect(() => {
    const el = section.current;
    if (!el) return;
    let armed = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          armed = true;
          return;
        }
        if (armed && entry.intersectionRatio >= 0.32) {
          armed = false;
          fireDecode();
        }
      },
      { threshold: [0, 0.35] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [fireDecode]);

  return (
    <section
      ref={section}
      id="contact"
      data-tone="invert"
      className="relative isolate h-[100svh] min-h-[680px] w-full overflow-hidden"
      style={{ background: "#00344C" }}
      aria-labelledby="contact-h"
    >
      <div ref={visRef} className="pointer-events-none absolute inset-0" />
      <h2 id="contact-h" className="sr-only">
        Let&apos;s build something extraordinary
      </h2>

      {/* Fullscreen WebGL water + refractive glass "DESIGN & CODE" + lens flare + fluid push */}
      <div className="absolute inset-0 z-[1]">
        {visible && !reduced && (
          <Suspense fallback={null}>
            <ClosingScene resolve={resolve} active={visible && bootDone} reduced={reduced} />
          </Suspense>
        )}
      </div>

      {/* Front scramble headline */}
      <div className="pointer-events-none absolute inset-0 z-[4]">
        <ScrambleHeadline playKey={decodeKey} />
      </div>

      {/* Bottom: email + buttons left, links right */}
      <div className="absolute inset-x-0 bottom-0 z-[5] flex flex-col gap-6 px-4 pb-[56px] lg:flex-row lg:items-end lg:justify-between lg:px-14 lg:pb-[60px]">
        <div>
          <a
            href={`mailto:${profile.email}`}
            onMouseEnter={() => tick(1500)}
            className="nav-box link-line font-mono text-[13px] tracking-[0.02em] text-white transition-colors duration-250 hover:text-[#c0fe04] md:text-[15px]"
          >
            <ScrambleText text={profile.email} hover dur={0.75} />
          </a>
          <div className="mt-5 flex flex-wrap gap-3 md:mt-6 md:gap-4">
            <Magnetic href={`mailto:${profile.email}`} onDark className="text-white" ariaLabel={`Email ${profile.email}`}>
              EMAIL ME ↗
            </Magnetic>
            <Magnetic
              onClick={() => {
                tick(880);
                downloadResume();
              }}
              onDark
              className="text-white"
              ariaLabel="Download résumé (PDF)"
            >
              DOWNLOAD RÉSUMÉ ↓
            </Magnetic>
          </div>
          <p className="mono mt-5 text-white/65 md:mt-7">
            <ScrambleText text="KIRTAN KUMAR SANGHI (C) 2026" playKey={decodeKey} dur={1.1} finalColor="rgba(255,255,255,0.65)" />
          </p>
        </div>

        <div className="lg:text-right">
          <p className="mono mb-3 text-white/55 md:mb-4">
            <ScrambleText text="LINKEDIN / GITHUB / RÉSUMÉ" playKey={decodeKey} dur={1.0} finalColor="rgba(255,255,255,0.55)" />
          </p>
          <ul className="flex flex-col gap-[7px] font-mono text-[11px] leading-[1.45] tracking-[0.02em] text-white lg:items-end md:text-[12.5px]">
            <li>
              <a
                href={profile.linkedin.href}
                target="_blank"
                rel="noreferrer noopener"
                onMouseEnter={() => tick(1480)}
                className="nav-box link-line transition-colors duration-250 hover:text-[#c0fe04]"
              >
                <ScrambleText text={profile.linkedin.label} hover dur={0.75} />
              </a>
            </li>
            <li>
              <a
                href={profile.github.href}
                target="_blank"
                rel="noreferrer noopener"
                onMouseEnter={() => tick(1480)}
                className="nav-box link-line transition-colors duration-250 hover:text-[#c0fe04]"
              >
                <ScrambleText text={profile.github.label} hover dur={0.75} />
              </a>
            </li>
            <li>
              <a
                href={profile.phoneHref}
                onMouseEnter={() => tick(1480)}
                className="nav-box link-line transition-colors duration-250 hover:text-[#c0fe04]"
              >
                <ScrambleText text={profile.phone} hover dur={0.65} />
              </a>
            </li>
            <li className="text-white/75">
              <ScrambleText text={profile.location} hover dur={0.75} finalColor="rgba(255,255,255,0.75)" />
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
