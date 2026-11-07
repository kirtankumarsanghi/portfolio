import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { projects, statusLabel, type Project } from "@/data/projects";
import { domainById } from "@/data/domains";
import ProjectMedia from "@/components/ProjectMedia";
import { useApp } from "@/lib/app-context";

const EASE = [0.16, 1, 0.3, 1] as const;

/* T5 FLIP origin: the clicked card's rect, captured just before the route changes */
let flipOrigin: DOMRect | null = null;
export function setFlipOrigin(r: DOMRect | null) {
  flipOrigin = r;
}
const originClip = () => {
  const r = flipOrigin;
  flipOrigin = null;
  if (!r) return "inset(46% 46% 46% 46% round 8px)";
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return `inset(${Math.max(0, r.top)}px ${Math.max(0, vw - r.right)}px ${Math.max(0, vh - r.bottom)}px ${Math.max(0, r.left)}px round 4px)`;
};

/** title letters rise with a .02s stagger */
function RiseTitle({ text }: { text: string }) {
  return (
    <h2 className="display d-case text-white" aria-label={text}>
      {[...text].map((ch, i) => (
        <span key={i} className="inline-block overflow-hidden align-top" style={{ paddingBlock: "0.06em", marginBlock: "-0.06em" }} aria-hidden="true">
          <motion.span className="inline-block" initial={{ y: "110%" }} animate={{ y: "0%" }} transition={{ duration: 0.9, delay: 0.32 + i * 0.02, ease: EASE }}>
            {ch === " " ? "\u00A0" : ch}
          </motion.span>
        </span>
      ))}
    </h2>
  );
}

/** language bar — real byte split when the sync script captured it, otherwise the primary language */
function LanguageBar({ project }: { project: Project }) {
  const langs = project.languages && Object.keys(project.languages).length ? project.languages : project.language ? { [project.language]: 1 } : null;
  if (!langs) return null;
  const total = Object.values(langs).reduce((a, b) => a + b, 0) || 1;
  const tones = ["#c6ff00", "#7fe3ff", "#9a8cff", "#ffffff", "#5f7bff"];
  const entries = Object.entries(langs).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return (
    <div className="mt-8">
      <p className="mono text-white/50">LANGUAGES{project.languages ? "" : " · PRIMARY"}</p>
      <div className="mt-3 flex h-[6px] w-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
        {entries.map(([k, v], i) => (
          <motion.span key={k} className="block h-full" style={{ background: tones[i % tones.length] }} initial={{ width: 0 }} animate={{ width: `${(100 * v) / total}%` }} transition={{ duration: 1, delay: 0.5 + i * 0.06, ease: EASE }} />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
        {entries.map(([k, v], i) => (
          <span key={k} className="mono flex items-center gap-2 text-white/75">
            <i className="inline-block h-[7px] w-[7px]" style={{ background: tones[i % tones.length] }} />
            {k} {project.languages ? `${((100 * v) / total).toFixed(1)}%` : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

function Detail({ project, closing, onClose, onNext, onPrev }: { project: Project; closing: boolean; onClose: () => void; onNext: () => void; onPrev: () => void }) {
  const clipFrom = useRef(originClip()).current;
  const { tick } = useApp();
  const domain = domainById(project.domain);

  useEffect(() => {
    const lenis = (window as unknown as { __lenis?: { stop: () => void; start: () => void } }).__lenis;
    lenis?.stop();
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      lenis?.start();
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const meta = [
    ["Year", project.year],
    ["Role", project.role || "—"],
    ["Domain", domain?.name ?? "—"],
    ["Status", statusLabel(project.status)],
  ];

  return (
    <motion.div
      className="fixed inset-0 z-[75] overflow-y-auto overscroll-contain"
      data-lenis-prevent
      role="dialog"
      aria-modal="true"
      aria-label={`${project.title} detail`}
      initial={{ clipPath: clipFrom }}
      animate={{ clipPath: "inset(0px 0px 0px 0px round 0px)", opacity: closing ? 0 : 1, scale: closing ? 0.985 : 1 }}
      transition={{ clipPath: { duration: 0.85, ease: EASE }, opacity: { duration: 0.45, ease: EASE }, scale: { duration: 0.45, ease: EASE } }}
    >
      {/* solid accent page */}
      <motion.div
        className="fixed inset-0"
        style={{ background: project.accent }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.55, ease: EASE }}
      />

      {/* lime pixel path draws across before the content arrives */}
      <svg className="pointer-events-none fixed inset-x-0 top-0 h-[3px] w-full" viewBox="0 0 1200 3" preserveAspectRatio="none" aria-hidden="true">
        <motion.line
          x1="0"
          y1="1.5"
          x2="1200"
          y2="1.5"
          stroke="#c6ff00"
          strokeWidth="3"
          initial={{ pathLength: 0, opacity: 0.95 }}
          animate={{ pathLength: 1, opacity: 0.25 }}
          transition={{ pathLength: { duration: 0.9, ease: EASE }, opacity: { duration: 1.4, delay: 0.5, ease: EASE } }}
        />
      </svg>

      <div className="relative mx-auto w-full max-w-[1400px] px-4 pt-[84px] pb-[110px] md:px-9 md:pt-[96px]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.6, ease: EASE }}
          className="flex items-center justify-between gap-4"
        >
          <p className="mono opacity-70">WORK / {domain?.name.toUpperCase()}</p>
          <button
            onClick={() => {
              tick(620);
              onClose();
            }}
            onMouseEnter={() => tick(1400)}
            autoFocus
            className="nav-box mono py-1"
            aria-label="Close project detail"
          >
            CLOSE[×]
          </button>
        </motion.div>

        {/* FLIP media */}
        <div className="mt-6 grid grid-cols-1 gap-8 md:mt-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <motion.div
              initial={{ clipPath: "inset(38% 34% 38% 34% round 6px)", opacity: 0.4 }}
              animate={{ clipPath: "inset(0% 0% 0% 0% round 0px)", opacity: 1 }}
              transition={{ duration: 0.75, ease: EASE }}
              className="relative aspect-[560/340] w-full overflow-hidden"
              style={{ border: "1px solid rgba(255,255,255,0.12)" }}
            >
              <ProjectMedia project={project} />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.7, ease: EASE }}
            className="lg:col-span-5"
          >
            <RiseTitle text={project.title} />
            <p className="mt-4 max-w-[42ch] text-[17px] leading-snug font-light text-white/80 md:text-[20px]">{project.tagline || project.subtitle}</p>

            <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5">
              {meta.map(([k, v]) => (
                <div key={k} className="border-t pt-3" style={{ borderColor: "rgba(255,255,255,0.16)" }}>
                  <dt className="mono text-white/50">{k}</dt>
                  <dd className="mono mt-2 text-white">{v}</dd>
                </div>
              ))}
            </dl>

            {project.stack.length > 0 && (
              <div className="mt-8">
                <p className="mono text-white/50">STACK</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {project.stack.map((s) => (
                    <span key={s} className="mono border px-2.5 py-1.5 text-white" style={{ borderColor: "rgba(255,255,255,0.18)" }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <LanguageBar project={project} />
            {project.topics.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {project.topics.slice(0, 8).map((t) => (
                  <span key={t} className="mono px-2 py-1 text-white/70" style={{ background: "rgba(255,255,255,0.07)" }}>
                    #{t}
                  </span>
                ))}
              </div>
            )}
            {project.auto && <p className="mono mt-10 text-white/60">DETAILS COMING SOON</p>}

            <div className="mt-10 flex flex-wrap gap-5">
              <a
                href={project.url}
                target="_blank"
                rel="noreferrer noopener"
                onMouseEnter={() => tick(1500)}
                className="nav-box link-line mono py-2"
                style={{ color: "#c6ff00" }}
              >
                VIEW ON GITHUB ↗
              </a>
              {project.liveUrl && (
                <a href={project.liveUrl} target="_blank" rel="noreferrer noopener" onMouseEnter={() => tick(1500)} className="nav-box link-line mono py-2 text-white">
                  LIVE DEMO ↗
                </a>
              )}
            </div>
          </motion.div>
        </div>

        {/* résumé-sourced content */}
        {!project.auto && (project.problem || project.approach.length > 0 || project.impact.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.36, duration: 0.8, ease: EASE }}
            className="mt-16 grid grid-cols-1 gap-12 lg:grid-cols-12"
          >
            <div className="lg:col-span-7">
              {project.problem && (
                <>
                  <h3 className="mono text-white/55">PROBLEM</h3>
                  <p className="mt-4 max-w-[62ch] text-[19px] leading-[1.5] font-light text-white md:text-[23px]">{project.problem}</p>
                </>
              )}
              {project.approach.length > 0 && (
                <>
                  <h3 className="mono mt-14 text-white/55">APPROACH</h3>
                  <ul className="mt-4">
                    {project.approach.map((a, i) => (
                      <li key={i} className="flex gap-4 border-t py-5 text-[16px] leading-relaxed font-light text-white/90 md:text-[18px]" style={{ borderColor: "rgba(255,255,255,0.14)" }}>
                        <span className="mono mt-1 shrink-0" style={{ color: "#c6ff00" }}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="lg:col-span-5">
              {project.metrics.length > 0 && (
                <>
                  <h3 className="mono text-white/55">IMPACT</h3>
                  <div className="mt-4 grid grid-cols-2 gap-px" style={{ background: "rgba(255,255,255,0.14)" }}>
                    {project.metrics.map((m) => (
                      <div key={m.label} className="p-5" style={{ background: project.accent }}>
                        <div className="display text-[26px] md:text-[32px]" style={{ color: "#c6ff00" }}>
                          {m.value}
                        </div>
                        <div className="mono mt-2 text-white/60">{m.label}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {project.impact.length > 0 && (
                <ul className="mt-8 space-y-3">
                  {project.impact.map((im, i) => (
                    <li key={i} className="flex gap-3 text-[15px] leading-relaxed font-light text-white/75">
                      <span className="mt-[7px] h-[6px] w-[6px] shrink-0" style={{ background: "#c6ff00" }} />
                      {im}
                    </li>
                  ))}
                </ul>
              )}
              {project.language && (
                <p className="mono mt-10 text-white/50">
                  PRIMARY LANGUAGE — <span className="text-white">{project.language}</span>
                  {project.stars > 0 ? ` · ${project.stars}★` : ""}
                </p>
              )}
            </div>
          </motion.div>
        )}

        <div className="mt-20 grid grid-cols-2 border-t pt-6" style={{ borderColor: "rgba(255,255,255,0.16)" }}>
          <button onClick={onPrev} onMouseEnter={() => tick(1400)} className="mono flex items-center gap-4 text-left text-white/70 transition-colors hover:text-white" aria-label="Previous project">
            <span className="display text-[22px] text-white md:text-[30px]">←</span>
            PREV PROJECT
          </button>
          <button onClick={onNext} onMouseEnter={() => tick(1400)} className="mono flex items-center justify-end gap-4 text-right text-white/70 transition-colors hover:text-white" aria-label="Next project">
            NEXT PROJECT
            <span className="display text-[22px] text-white md:text-[30px]">→</span>
          </button>
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 h-[84px]" style={{ background: `linear-gradient(to top, ${project.accent} 38%, transparent)` }} aria-hidden="true" />
    </motion.div>
  );
}

/**
 * The overlay is driven by the hash, so it must unmount reliably when the route changes
 * (including the browser back button). AnimatePresence alone can hang when a shared-layout
 * child cannot measure its return target, so the exit is bounded by a hard timeout.
 */
export default function ProjectDetailLayer({
  project,
  onClose,
  onNext,
  onPrev,
}: {
  project: Project | null;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  const [shown, setShown] = useState<Project | null>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (project) {
      setShown(project);
      setClosing(false);
      return;
    }
    // no AnimatePresence: its exit can hang when a portaled shared-layout child cannot
    // measure its return target, which would leave the overlay in the DOM forever
    setShown((cur) => {
      if (cur) setClosing(true);
      return cur;
    });
    const t = window.setTimeout(() => {
      setShown(null);
      setClosing(false);
    }, 520);
    return () => window.clearTimeout(t);
  }, [project]);

  if (!shown) return null;
  return createPortal(
    <Detail key={shown.id} project={shown} closing={closing} onClose={onClose} onNext={onNext} onPrev={onPrev} />,
    document.body,
  );
}

/** next featured project in list order, wrapping */
export const nextFeatured = (id: string) => {
  const i = projects.findIndex((p) => p.id === id);
  return projects[(i + 1) % Math.max(projects.length, 1)]?.id ?? id;
};
