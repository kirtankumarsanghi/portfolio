import { motion } from "framer-motion";
import { skillGroups } from "@/data/site";
import { useApp } from "@/lib/app-context";

const EASE = [0.16, 1, 0.3, 1] as const;
const total = skillGroups.reduce((n, g) => n + g.items.length, 0);

/** Rule 0: chip text never moves on hover — only the lime fill + text colour change. */
function Chip({ label, delay }: { label: string; delay: number }) {
  const { tick } = useApp();
  return (
    <motion.li
      onPointerEnter={() => tick(1700)}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -4% 0px" }}
      transition={{ duration: 0.6, delay, ease: EASE }}
      className="mono group relative cursor-default select-none border px-[10px] py-[6px]"
      data-chip
    >
      <span
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{ background: "#c6ff00" }}
      />
      <span className="relative z-10 transition-colors duration-200 group-hover:text-[#05060a]">{label}</span>
    </motion.li>
  );
}

export default function Skills() {
  const { reduced } = useApp();
  return (
    <section
      id="skills"
      className="relative py-[10vh]"
      style={{ background: "var(--bg)" }}
      aria-labelledby="skills-h"
    >
      <div className="w-full px-4 md:px-9">
        <div className="mb-6 flex items-end justify-between gap-6 md:mb-8">
          {/* Spec 4.5 — line-mask reveal on enter only, static afterwards */}
          <h2 id="skills-h" className="display d-h2">
            <span className="mask-line">
              <motion.span
                initial={reduced ? false : { y: "110%" }}
                whileInView={{ y: "0%" }}
                viewport={{ once: true, margin: "0px 0px -8% 0px" }}
                transition={{ duration: 0.9, ease: EASE }}
                className="block"
              >
                Skills
              </motion.span>
            </span>
          </h2>
          <span className="mono pb-1 opacity-50">{total} TECHNOLOGIES · 07 GROUPS</span>
        </div>

        <div>
          {skillGroups.map((g, gi) => (
            <motion.div
              key={g.group}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px 0px -6% 0px" }}
              transition={{ duration: 0.9, delay: gi * 0.05, ease: EASE }}
              className="grid grid-cols-1 gap-3 border-t py-4 md:grid-cols-12 md:gap-8 md:py-[13px]"
              style={{ borderColor: "var(--line)" }}
            >
              <h3 className="display d-row md:col-span-3">{g.group}</h3>
              <ul className="flex flex-wrap content-start gap-[6px] md:col-span-9" style={{ borderColor: "var(--line)" }}>
                {g.items.map((item, i) => (
                  <Chip key={item} label={item} delay={0.15 + gi * 0.05 + i * 0.02} />
                ))}
              </ul>
            </motion.div>
          ))}
          <div className="border-t" style={{ borderColor: "var(--line)" }} aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
