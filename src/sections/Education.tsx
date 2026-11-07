import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion } from "framer-motion";
import { certifications, education } from "@/data/site";
import { useApp } from "@/lib/app-context";
import { TM } from "@/lib/transitions";

gsap.registerPlugin(ScrollTrigger);
const EASE = [0.16, 1, 0.3, 1] as const;

export default function Education() {
  const { reduced, tick } = useApp();
  const section = useRef<HTMLElement | null>(null);
  const line = useRef<HTMLDivElement | null>(null);

  /* thin lime progress line draws as you scroll */
  useEffect(() => {
    if (reduced) {
      if (line.current) line.current.style.transform = "scaleY(1)";
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(
        line.current,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: { trigger: "[data-edu-list]", start: "top 72%", end: "bottom 58%", scrub: 0.5 },
        },
      );
    }, section);
    return () => ctx.revert();
  }, [reduced]);

  /* T9 — Skills → Education: a pixel-grid wipe 'down' in #0b0c0d with the lime edge flash */
  useEffect(() => {
    if (reduced) return;
    const st = ScrollTrigger.create({
      trigger: section.current,
      start: "top 95%",
      end: "top 25%",
      scrub: 0.3,
      onUpdate: (self) => {
        const p = self.progress;
        if (p <= 0.001 || p >= 0.999) TM.clear("t9");
        else TM.draw("t9", p * 1.08 - 0.04, { mode: "edge", dir: "down" });
      },
      onLeave: () => TM.clear("t9"),
      onLeaveBack: () => TM.clear("t9"),
    });
    return () => {
      st.kill();
      TM.clear("t9");
    };
  }, [reduced]);

  return (
    <section
      ref={section}
      id="education"
      className="relative py-[10vh]"
      style={{ background: "var(--bg)" }}
      aria-labelledby="edu-h"
    >
      <div className="w-full px-4 md:px-9">
        {/* Spec 4.5 — line-mask reveal on enter only, static afterwards */}
        <h2 id="edu-h" className="display d-h2">
          {["Education", "& Certifications"].map((line, i) => (
            <span key={line} className="mask-line">
              <motion.span
                initial={reduced ? false : { y: "110%" }}
                whileInView={{ y: "0%" }}
                viewport={{ once: true, margin: "0px 0px -8% 0px" }}
                transition={{ duration: 0.9, delay: i * 0.08, ease: EASE }}
                className="block"
              >
                {line}
              </motion.span>
            </span>
          ))}
        </h2>

        <div className="mt-10 grid grid-cols-1 gap-12 md:mt-12 lg:grid-cols-12 lg:gap-10">
          {/* timeline */}
          <div className="lg:col-span-5">
            <div data-edu-list className="relative pl-9">
              <div className="absolute top-[6px] bottom-[6px] left-[6px] w-px" style={{ background: "var(--line)" }}>
                <div ref={line} className="h-full w-full origin-top" style={{ background: "#c6ff00", transform: "scaleY(0)" }} />
              </div>
              {education.map((e, i) => (
                <motion.article
                  key={e.school}
                  initial={{ opacity: 0, x: -64 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "0px 0px -8% 0px" }}
                  transition={{ duration: 0.85, delay: i * 0.06, ease: EASE }}
                  className="relative pb-9 last:pb-0"
                >
                  <span
                    className="absolute top-[5px] -left-9 h-[13px] w-[13px] border"
                    style={{ borderColor: "#c6ff00", background: i === 0 ? "#c6ff00" : "var(--bg)" }}
                  />
                  <h3 className="display d-row">{e.school}</h3>
                  <p className="mono mt-3 opacity-70">
                    {e.degree} · {e.period}
                  </p>
                  <p className="mono mt-1.5" style={{ color: "var(--accent)" }}>
                    {e.score}
                  </p>
                </motion.article>
              ))}
            </div>
          </div>

          {/* certifications — two columns */}
          <div className="lg:col-span-7 lg:pl-10">
            <h3 className="mono opacity-55">CERTIFICATIONS · {String(certifications.length).padStart(2, "0")}</h3>
            <ul className="mt-5 gap-x-10 sm:columns-2">
              {certifications.map((c, i) => (
                <motion.li
                  key={c.name}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "0px 0px -6% 0px" }}
                  transition={{ duration: 0.6, delay: i * 0.05, ease: EASE }}
                  onMouseEnter={() => tick(1180)}
                  className="group break-inside-avoid border-t py-4"
                  style={{ borderColor: "var(--line)" }}
                >
                  <p className="text-[16px] leading-snug font-normal transition-colors duration-300 group-hover:text-[color:var(--accent)] md:text-[17px]">
                    {c.name}
                  </p>
                  <p className="mono mt-2 opacity-50">
                    {c.issuer}
                    {c.year ? ` · ${c.year}` : ""}
                  </p>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </div>

    </section>
  );
}
