import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion } from "framer-motion";
import { aboutLead, aboutSecondary } from "@/data/site";
import { projects, type ProjectId } from "@/data/projects";
import { useApp } from "@/lib/app-context";
import DuotonePortrait from "@/components/DuotonePortrait";
import ProjectMedia from "@/components/ProjectMedia";

gsap.registerPlugin(ScrollTrigger);
const EASE = [0.16, 1, 0.3, 1] as const;

/* handwritten "Kirtan" — drawn with stroke-dashoffset when the section enters */
const SIGNATURE = [
  "M8 62 L8 14",
  "M8 40 L30 15",
  "M12 36 L32 62",
  "M44 30 L44 62",
  "M44 17 L44 19",
  "M56 62 L56 33 Q56 26 65 29",
  "M78 14 L78 57 Q78 64 87 61",
  "M69 31 L88 31",
  "M110 34 Q97 31 97 46 Q97 61 110 61 Q118 61 118 47 L118 62",
  "M130 62 L130 35 Q130 28 140 31 Q147 33 147 41 L147 62",
  "M6 74 Q70 84 156 68",
];

/** small lime pixel crawling the paper edge of the photo */
function PixelCrawl() {
  return (
    <motion.span
      className="pointer-events-none absolute h-[6px] w-[6px]"
      style={{ background: "#c6ff00", boxShadow: "0 0 10px rgba(198,255,0,0.8)" }}
      initial={{ top: "0%", left: "0%" }}
      animate={{
        top: ["0%", "0%", "100%", "100%", "0%"],
        left: ["0%", "100%", "100%", "0%", "0%"],
      }}
      transition={{ duration: 11, repeat: Infinity, ease: "linear", times: [0, 0.25, 0.5, 0.75, 1] }}
      aria-hidden="true"
    />
  );
}

/** Two rows of 28px cells forming a stepped top edge; a few lime cells flash with scroll velocity. */
function PixelStairEdge() {
  const cells = useRef<{ x: number; row: number; lime: boolean }[]>([]);
  if (!cells.current.length) {
    const cols = 80;
    for (let c = 0; c < cols; c++) {
      const r = Math.random();
      // row 0 = topmost step (sparse), row 1 = second step (dense) → a staircase, not a line
      if (r < 0.42) cells.current.push({ x: c, row: 0, lime: Math.random() < 0.09 });
      if (r < 0.88) cells.current.push({ x: c, row: 1, lime: false });
    }
  }
  return (
    <svg
      className="pointer-events-none absolute inset-x-0 -top-[56px] h-[56px] w-full"
      viewBox="0 0 2240 56"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      {cells.current.map((c, i) => (
        <rect key={i} x={c.x * 28} y={c.row * 28} width="28" height="28" fill={c.lime ? "#c6ff00" : "var(--bg)"}>
          {c.lime && <animate attributeName="opacity" values="1;0.15;1" dur={`${1.4 + (i % 5) * 0.3}s`} repeatCount="indefinite" />}
        </rect>
      ))}
    </svg>
  );
}

export default function About() {
  const { reduced, tick } = useApp();
  const section = useRef<HTMLElement | null>(null);
  const lead = useRef<HTMLParagraphElement | null>(null);
  const words = useRef<HTMLSpanElement[]>([]);
  const [tip, setTip] = useState<ProjectId | null>(null);
  const [tipPos, setTipPos] = useState({ x: 0, y: 0 });

  /* word-by-word reveal, opacity .25 → 1 */
  useEffect(() => {
    if (reduced) {
      words.current.forEach((w) => (w.style.opacity = "1"));
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(
        words.current,
        { opacity: 0.25 },
        { opacity: 1, stagger: 0.08, ease: "none", scrollTrigger: { trigger: lead.current, start: "top 84%", end: "bottom 50%", scrub: 0.4 } },
      );
    }, section);
    return () => ctx.revert();
  }, [reduced]);

  /* T3 — About → Work: the copy masks out upward while the domain rows rise in behind it */
  useEffect(() => {
    if (reduced) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-about-out]",
        { yPercent: 0, opacity: 1, clipPath: "inset(0% 0% 0% 0%)" },
        {
          yPercent: -18,
          opacity: 0,
          clipPath: "inset(0% 0% 100% 0%)",
          ease: "none",
          stagger: 0.12,
          scrollTrigger: { trigger: section.current, start: "bottom 70%", end: "bottom 15%", scrub: 0.5 },
        },
      );
    }, section);
    return () => ctx.revert();
  }, [reduced]);

  const leadWords = aboutLead.split(" ");
  const tipProject = projects.find((p) => p.id === tip);

  return (
    <section
      ref={section}
      id="about"
      data-cursor-px="6"
      className="relative z-20"
      style={{ background: "var(--bg)", marginTop: "calc(-100svh + 56px)" }}
      aria-labelledby="about-h"
    >
      {/* T2 curtain edge: a pixel-stair, never a straight line. Lime cells flash as it rises. */}
      <PixelStairEdge />
      <h2 id="about-h" className="sr-only">
        About Kirtan Kumar Sanghi
      </h2>

      <div data-about-body className="relative grid w-full grid-cols-12 gap-y-10 pt-[12vh] pb-[8vh] md:pt-[14vh] md:pb-[10vh]">
        {/* portrait rises from below with a slight rotation settling to 0 */}
        <div className="col-span-5 pl-4 sm:col-span-4 md:col-span-2 md:pr-[14px] md:pl-9">
          <motion.div
            initial={reduced ? false : { y: 120, rotate: -5, opacity: 0 }}
            whileInView={{ y: 0, rotate: 0, opacity: 1 }}
            viewport={{ once: true, margin: "0px 0px -12% 0px" }}
            transition={{ duration: 1.25, ease: EASE }}
            className="relative"
          >
            <DuotonePortrait caption="KS / 2026" />
            {!reduced && <PixelCrawl />}
          </motion.div>

          {/* signature */}
          <svg viewBox="0 0 164 88" className="mt-5 w-full max-w-[210px]" role="img" aria-label="Signature: Kirtan">
            {SIGNATURE.map((d, i) => (
              <motion.path
                key={i}
                d={d}
                fill="none"
                stroke="#c6ff00"
                strokeWidth={i === SIGNATURE.length - 1 ? 2 : 3.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={reduced ? { pathLength: 1 } : { pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true, margin: "0px 0px -10% 0px" }}
                transition={{ duration: 0.5, delay: reduced ? 0 : 0.25 + i * 0.09, ease: "easeInOut" }}
                opacity={i === SIGNATURE.length - 1 ? 0.55 : 0.95}
              />
            ))}
          </svg>
        </div>

        <div className="col-span-12 px-4 md:col-span-9 md:col-start-4 md:pr-9 md:pl-[14px]">
          <p ref={lead} data-about-out className="font-body text-[clamp(32px,3.6vw,56px)] leading-[1.1] font-light tracking-[-0.015em] text-[color:var(--fg)]">
            {leadWords.map((w, i) => (
              <span key={`${w}-${i}`} className="inline-block">
                <span
                  ref={(el) => {
                    if (el) words.current[i] = el;
                  }}
                  className="inline-block"
                  style={{ opacity: reduced ? 1 : 0.25 }}
                >
                  {w}
                </span>
                {i < leadWords.length - 1 ? "\u00A0" : ""}
              </span>
            ))}
          </p>

          <motion.p
            initial={reduced ? false : { y: 26, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: "0px 0px -8% 0px" }}
            transition={{ duration: 1, delay: 0.15, ease: EASE }}
            data-about-out
            className="font-body mt-[clamp(28px,4vw,64px)] max-w-[34ch] text-[clamp(26px,2.9vw,46px)] leading-[1.14] font-light tracking-[-0.01em] md:max-w-none"
            style={{ color: "var(--fg-grey)" }}
          >
            {aboutSecondary.map((s, i) => {
              if (!s.kind) return <span key={i}>{s.t}</span>;
              if (s.kind === "kw") {
                return (
                  <span key={i} className="kw" tabIndex={0} onMouseEnter={() => tick(1500)}>
                    {s.t}
                  </span>
                );
              }
              return (
                <span
                  key={i}
                  className="kw"
                  tabIndex={0}
                  onMouseEnter={(e) => {
                    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setTipPos({ x: r.left, y: r.bottom + 18 });
                    setTip(s.id as ProjectId);
                    tick(1500);
                  }}
                  onMouseMove={(e) => setTipPos({ x: e.clientX + 22, y: e.clientY + 22 })}
                  onMouseLeave={() => setTip(null)}
                  onFocus={(e) => {
                    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setTipPos({ x: r.left, y: r.bottom + 18 });
                    setTip(s.id as ProjectId);
                  }}
                  onBlur={() => setTip(null)}
                >
                  {s.t}
                </span>
              );
            })}
          </motion.p>
        </div>
      </div>

      {/* project preview follows the cursor */}
      {tipProject && (
        <motion.div
          key="tip"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24, ease: EASE }}
          style={{ left: tipPos.x, top: tipPos.y, width: 260, height: 158, border: "1px solid rgba(255,255,255,0.14)" }}
          className="pointer-events-none fixed z-[95] hidden overflow-hidden md:block"
          aria-hidden="true"
        >
          <ProjectMedia project={tipProject} />
        </motion.div>
      )}
    </section>
  );
}
