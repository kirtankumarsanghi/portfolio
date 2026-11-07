import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { allProjects, domainCounts, getProject, projectsInDomain, projectCount, statusLabel, type Project } from "@/data/projects";
import { domains, type DomainId } from "@/data/domains";
import ProjectMedia from "@/components/ProjectMedia";
import ProjectDetailLayer, { setFlipOrigin } from "@/components/ProjectDetail";
import CurlCard, { setCurl } from "@/components/CurlCard";
import { useApp } from "@/lib/app-context";
import { useOnScreen, useScrollVelocity } from "@/hooks/useScroll";
import { EASE, TM } from "@/lib/transitions";

const E = [0.16, 1, 0.3, 1] as const;

/* ---------------------------------------------------------------- hash routing (T11) */

type Route = { domain: DomainId | null; project: string | null };

const parseHash = (): Route => {
  const parts = window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (parts[0] !== "work" || parts.length < 2) return { domain: null, project: null };
  const d = parts[1] as DomainId;
  if (!domains.some((x) => x.id === d)) return { domain: null, project: null };
  if (parts.length >= 3 && getProject(parts[2])) return { domain: d, project: parts[2] };
  return { domain: d, project: null };
};

const setHash = (next: string) => {
  if (window.location.hash !== next) window.location.hash = next;
};

/* ---------------------------------------------------------------- count-up (4.2) */

function useCountUp(value: number) {
  const [shown, setShown] = useState(value);
  const cur = useRef(value);
  useEffect(() => {
    const s = { v: cur.current };
    const tw = gsap.to(s, {
      v: value,
      duration: 0.7,
      ease: EASE.in,
      onUpdate: () => {
        cur.current = s.v;
        setShown(Math.round(s.v));
      },
    });
    return () => {
      tw.kill();
    };
  }, [value]);
  return shown;
}

const pad = (n: number) => String(n).padStart(2, "0");
const tagFor = (p: Project) =>
  p.domain === "ai-ml" ? "ML / NLP" : p.domain === "backend" ? "BACKEND" : p.domain === "civic" ? "CIVIC-TECH" : p.domain === "edtech" ? "EDTECH" : "FULL-STACK";

/* ---------------------------------------------------------------- card */

function Card({ project, slot, pair, register, onOpen }: { project: Project; slot: number; pair: number; register: (el: HTMLDivElement | null) => void; onOpen: (el: HTMLElement) => void }) {
  const wrap = useRef<HTMLDivElement | null>(null);
  const { tick, reduced } = useApp();
  const widths = [640, 440, 560, 400, 600, 460];

  const onMove = (e: React.PointerEvent) => {
    const el = wrap.current;
    if (!el || reduced) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--hy", `${(((e.clientX - r.left) / r.width - 0.5) * 6).toFixed(2)}deg`);
    el.style.setProperty("--hx", `${(-((e.clientY - r.top) / r.height - 0.5) * 6).toFixed(2)}deg`);
    el.style.setProperty("--ly", "-6px");
  };
  const reset = () => {
    const el = wrap.current;
    if (!el) return;
    el.style.setProperty("--hx", "0deg");
    el.style.setProperty("--hy", "0deg");
    el.style.setProperty("--ly", "0px");
  };

  return (
    <motion.div
      ref={(n) => {
        wrap.current = n;
        register(n);
      }}
      data-card
      style={{ maxWidth: widths[slot % widths.length], width: "100%" }}
      // T4: cards curl in from below in staggered pairs
      initial={{ opacity: 0, y: 90, rotateX: 18 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      exit={{ opacity: 0, y: 40, transition: { duration: 0.3, ease: E } }}
      transition={{ duration: 1.1, delay: 0.15 + pair * 0.09, ease: E }}
    >
      <button
        type="button"
        data-pill={project.auto ? "OPEN ↗" : "OPEN CASE STUDY ↗"}
        onPointerMove={onMove}
        onPointerLeave={reset}
        onMouseEnter={() => tick(1240)}
        onClick={() => {
          tick(700);
          if (wrap.current) onOpen(wrap.current);
        }}
        className="group block w-full text-left"
        aria-label={`Open ${project.title}`}
      >
        <span className="relative block">
          <CurlCard media={() => <ProjectMedia project={project} />} />
          <span className="mono absolute top-0 right-3 z-10 -translate-y-1/2 px-[7px] py-[3px] text-[9px]" style={{ background: "#c6ff00", color: "#05060a" }}>
            {project.mock ? tagFor(project) : statusLabel(project.status)}
          </span>
        </span>
        <span className="mono mt-3 flex items-center justify-between gap-3">
          <span className="truncate">{project.title}</span>
          <span className="shrink-0 opacity-70">{project.year}</span>
        </span>
      </button>
    </motion.div>
  );
}

/* ---------------------------------------------------------------- section */

export default function Work() {
  const { reduced, tick } = useApp();
  const section = useRef<HTMLElement | null>(null);
  const cardEls = useRef(new Set<HTMLDivElement>());
  const [route, setRoute] = useState<Route>({ domain: null, project: null });
  const [hover, setHover] = useState<DomainId | null>(null);
  const [fanX, setFanX] = useState(0);
  const counts = useMemo(() => domainCounts(), []);
  const vel = useScrollVelocity();
  const { ref: visRef, visible } = useOnScreen<HTMLDivElement>("200px");

  useEffect(() => {
    const sync = () => setRoute(parseHash());
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  const list = route.domain ? projectsInDomain(route.domain) : [];
  const detail = route.project ? getProject(route.project) ?? null : null;
  const count = useCountUp(route.domain ? list.length : projectCount);

  const openDomain = useCallback(
    (id: DomainId) => {
      tick(1320);
      setHash(`#work/${id}`);
    },
    [tick],
  );
  const back = useCallback(() => {
    tick(620);
    setHash("#work");
  }, [tick]);

  /* keep the section in view when the level changes */
  const lastDomain = useRef<DomainId | null>(null);
  useEffect(() => {
    if (route.domain === lastDomain.current) return;
    const wasNull = lastDomain.current === null && route.domain === null;
    lastDomain.current = route.domain;
    if (wasNull) return;
    const el = section.current;
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY;
    if (Math.abs(window.scrollY - y) < 40) return;
    const lenis = (window as unknown as { __lenis?: { scrollTo: (t: number, o?: unknown) => void } }).__lenis;
    if (lenis) lenis.scrollTo(y, { duration: 1 });
    else window.scrollTo({ top: y, behavior: "smooth" });
  }, [route.domain]);

  /* page-curl loop: runs on the ticker while the section is on screen (velocity keeps decaying even when
     scrolling stops, so a scroll-only callback would leave cards frozen mid-bend) */
  useEffect(() => {
    if (reduced || !visible || !route.domain) return;
    const loop = () => {
      const vh = window.innerHeight;
      let maxBend = 0;
      cardEls.current.forEach((el) => {
        maxBend = Math.max(maxBend, setCurl(el, vh, vel.current));
      });
      (window as unknown as { __maxCurl?: number }).__maxCurl = maxBend;
    };
    gsap.ticker.add(loop);
    return () => gsap.ticker.remove(loop);
  }, [reduced, visible, route.domain, vel]);

  /* T5 — open from the card's rect; NEXT/PREV swap through a pixel-grid wipe in the next accent */
  const openProject = useCallback(
    (id: string, from?: HTMLElement) => {
      if (from) setFlipOrigin(from.getBoundingClientRect());
      setHash(`#work/${route.domain ?? getProject(id)?.domain ?? "playground"}/${id}`);
    },
    [route.domain],
  );

  const step = useCallback(
    async (dir: 1 | -1) => {
      const pool = list.length ? list : allProjects;
      const i = pool.findIndex((p) => p.id === route.project);
      const next = pool[(i + dir + pool.length) % pool.length];
      if (!next) return;
      tick(900);
      setFlipOrigin(null);
      if (reduced) return setHash(`#work/${route.domain ?? next.domain}/${next.id}`);
      await TM.play("next", { from: 0, to: 1.04, duration: 0.5, ease: EASE.wipe, mode: "cover", dir: "radial", color: next.accent });
      setHash(`#work/${route.domain ?? next.domain}/${next.id}`);
      await new Promise((r) => setTimeout(r, 90));
      await TM.play("next", { from: 0, to: 1.04, duration: 0.65, ease: EASE.wipe, mode: "reveal", dir: "radial", color: next.accent, clearAtEnd: true });
    },
    [list, route.project, route.domain, tick, reduced],
  );

  const register = useCallback((el: HTMLDivElement | null) => {
    if (el) cardEls.current.add(el);
  }, []);
  useEffect(() => {
    // drop detached cards after every route change
    cardEls.current.forEach((el) => {
      if (!el.isConnected) cardEls.current.delete(el);
    });
  });

  const chip = (id: DomainId | null, label: string, n: number) => {
    const on = route.domain === id;
    return (
      <button
        key={id ?? "all"}
        onClick={() => (id ? openDomain(id) : back())}
        onMouseEnter={() => tick(1180)}
        className="mono shrink-0 border px-3 py-2 transition-colors duration-300"
        style={{ borderColor: on ? "#c6ff00" : "var(--line)", color: on ? "#c6ff00" : undefined }}
        aria-pressed={on}
      >
        {label} ({pad(n)})
      </button>
    );
  };

  const domainMeta = domains.find((d) => d.id === route.domain);
  const evens = list.filter((_, i) => i % 2 === 0);
  const odds = list.filter((_, i) => i % 2 === 1);

  return (
    <>
      <section ref={section} id="work" className="relative pt-[10vh] pb-[12vh]" style={{ background: "var(--bg)" }} aria-labelledby="work-h">
        <div ref={visRef} className="pointer-events-none absolute inset-0" />
        <LayoutGroup>
          <div className="px-4 md:px-9">
            {/* sticky header: count + breadcrumb + (L2) the chosen domain title, FLIPped from its row */}
            <div className="sticky top-[58px] z-20 -mx-4 px-4 pt-3 pb-4 md:-mx-9 md:px-9" style={{ background: "linear-gradient(var(--bg) 78%, transparent)" }}>
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <h2 id="work-h" className="mono opacity-60">
                  SELECTED WORK ({pad(count)})
                </h2>
                <AnimatePresence>
                  {route.domain && (
                    <motion.button
                      key="crumb"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      transition={{ duration: 0.5, ease: E }}
                      onClick={back}
                      className="mono nav-box"
                      aria-label="Back to all domains"
                    >
                      ← WORK / {domainMeta?.chip}
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
              {route.domain && domainMeta && (
                <motion.h3 layoutId={`dom-title-${route.domain}`} transition={{ duration: 0.9, ease: E }} className="display d-h2 mt-4" style={{ color: "var(--accent)" }}>
                  {domainMeta.name}
                </motion.h3>
              )}
              <div className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0" role="tablist" aria-label="Filter by domain">
                {chip(null, "ALL", projectCount)}
                {domains.map((d) => chip(d.id as DomainId, d.chip, counts[d.id] ?? 0))}
              </div>
            </div>

            <AnimatePresence initial={false}>
              {/* ---------- LEVEL 1 ---------- */}
              {!route.domain && (
                <motion.div key="l1" className="mt-6 md:mt-8" exit={{ opacity: 1, transition: { duration: 0.6 } }}>
                  {domains.map((d, i) => {
                    const id = d.id as DomainId;
                    const items = projectsInDomain(id);
                    const on = hover === id;
                    return (
                      <motion.button
                        key={d.id}
                        // T3: rows rise in line by line as Work enters
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "0px 0px -6% 0px" }}
                        // T4: the other rows collapse upward, staggered
                        exit={{ opacity: 0, y: -46, transition: { duration: 0.5, delay: i * 0.04, ease: E } }}
                        transition={{ duration: 0.9, delay: i * 0.05, ease: E }}
                        onMouseEnter={() => {
                          setHover(id);
                          tick(1240);
                        }}
                        onMouseMove={(e) => setFanX(e.clientX - (e.currentTarget.getBoundingClientRect().left || 0))}
                        onMouseLeave={() => setHover(null)}
                        onFocus={() => setHover(id)}
                        onBlur={() => setHover(null)}
                        onClick={() => openDomain(id)}
                        className="group relative block w-full border-t py-5 text-left md:py-6"
                        style={{ borderColor: "var(--line)" }}
                        data-pill="OPEN ↗"
                        aria-label={`Open ${d.name}: ${items.length} projects`}
                      >
                        <span
                          className="absolute top-1/2 left-0 block h-[7px] w-[7px] transition-all duration-500"
                          style={{ background: "#c6ff00", opacity: on ? 1 : 0, transform: `translate(${on ? "-14px" : "-4px"},-50%)`, boxShadow: "0 0 12px rgba(198,255,0,0.7)" }}
                          aria-hidden="true"
                        />
                        <span className="flex items-baseline justify-between gap-6">
                          {/* Spec 4.5 — line-mask reveal on enter; hover changes colour/outline only, never position */}
                          <motion.span
                            layoutId={`dom-title-${d.id}`}
                            transition={{ duration: 0.9, ease: E }}
                            className="display d-h2 mask-line transition-colors duration-300"
                            style={{
                              color: on ? "var(--accent)" : "var(--fg)",
                              WebkitTextStroke: on ? "1px #c6ff00" : undefined,
                            }}
                          >
                            <span>{d.name}</span>
                          </motion.span>
                          <span className="mono shrink-0 opacity-60">({pad(items.length)})</span>
                        </span>
                        <span className="mono mt-3 block max-w-[60ch] opacity-0 transition-opacity duration-300 group-hover:opacity-70 group-focus-visible:opacity-70" style={{ minHeight: 14 }}>
                          {d.description}
                        </span>
                        {/* mini-thumbnail fan near the pointer */}
                        <span className="pointer-events-none absolute bottom-5 hidden md:block" style={{ left: Math.max(0, fanX - 120), width: 240, height: 60 }} aria-hidden="true">
                          {items.slice(0, 3).map((p, k) => (
                            <span
                              key={p.id}
                              className="absolute block h-[46px] w-[74px] overflow-hidden border"
                              style={{
                                left: 40 + k * 52,
                                bottom: 0,
                                borderColor: "rgba(198,255,0,0.5)",
                                transform: `translateY(${on ? -k * 4 : 18}px) rotate(${(k - 1) * 9}deg) scale(${on ? 1 : 0.8})`,
                                opacity: on ? 1 : 0,
                                transition: `transform .55s cubic-bezier(.16,1,.3,1) ${k * 0.05}s, opacity .4s ${k * 0.05}s`,
                              }}
                            >
                              <ProjectMedia project={p} />
                            </span>
                          ))}
                        </span>
                      </motion.button>
                    );
                  })}
                  <div className="border-t" style={{ borderColor: "var(--line)" }} aria-hidden="true" />
                </motion.div>
              )}

              {/* ---------- LEVEL 2 ---------- */}
              {route.domain && (
                <motion.div key={`l2-${route.domain}`} className="mt-8 md:mt-10" initial={{ opacity: 1 }} exit={{ opacity: 0, y: 30, transition: { duration: 0.4, ease: E } }}>
                  {list.length === 0 ? (
                    <p className="mono py-16 opacity-50">NOTHING HERE YET</p>
                  ) : (
                    <div className="flex flex-col gap-14 md:flex-row md:gap-16">
                      <div className="flex flex-1 flex-col gap-14 md:gap-16">
                        {evens.map((p, i) => (
                          <Card key={p.id} project={p} slot={i * 2} pair={i} register={register} onOpen={(el) => openProject(p.id, el)} />
                        ))}
                      </div>
                      <div className="flex flex-1 flex-col gap-14 md:mt-[15vh] md:gap-16">
                        {odds.map((p, i) => (
                          <Card key={p.id} project={p} slot={i * 2 + 1} pair={i} register={register} onOpen={(el) => openProject(p.id, el)} />
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </LayoutGroup>
      </section>

      {/* ---------- LEVEL 3 ---------- */}
      <ProjectDetailLayer project={detail} onClose={() => setHash(`#work${route.domain ? `/${route.domain}` : ""}`)} onNext={() => step(1)} onPrev={() => step(-1)} />
    </>
  );
}
