import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useApp } from "@/lib/app-context";

gsap.registerPlugin(ScrollTrigger);

/** Lenis smooth scroll wired into GSAP ScrollTrigger. Duration ~1.2 feel. */
export function useSmoothScroll(enabled: boolean) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.92,
      touchMultiplier: 1.4,
    });
    lenisRef.current = lenis;

    lenis.on("scroll", (e: { scroll: number; velocity: number }) => {
      ScrollTrigger.update();
      const root = document.documentElement;
      root.style.setProperty("--scroll-velocity", String(Math.min(Math.abs(e.velocity) / 40, 1)));
    });

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    (window as unknown as { __lenis: Lenis }).__lenis = lenis;

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [enabled]);

  return lenisRef;
}

/** Scroll to a section id, respecting Lenis when available. */
export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const lenis = (window as unknown as { __lenis?: Lenis }).__lenis;
  if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.4 });
  else el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Tracks Lenis scroll velocity (normalised 0..1) for reactive scenes. */
/**
 * Normalised 0..1 scroll velocity. Polled with rAF so it keeps working even
 * though Lenis is mounted after the boot sequence (i.e. after consumers mount).
 */
export function useScrollVelocity() {
  const ref = useRef(0);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const lenis = (window as unknown as { __lenis?: Lenis }).__lenis;
      const v = lenis ? Math.abs(lenis.velocity) : 0;
      // decay smoothly so the value never snaps to zero between wheel events
      ref.current = gsap.utils.clamp(0, 1, Math.max(v / 45, ref.current * 0.92));
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, []);
  return ref;
}

/** Progress 0..1 through a given element, driven by ScrollTrigger scrub. */
export function useSectionProgress<T extends HTMLElement>(id: string) {
  const ref = useRef<T | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current ?? document.getElementById(id);
    if (!el) return;
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top bottom",
      end: "bottom top",
      onUpdate: (self) => setProgress(self.progress),
    });
    return () => {
      st.kill();
    };
  }, [id]);

  return { ref, progress };
}

/** True while the element is on screen — used to pause off-screen canvases. */
export function useOnScreen<T extends HTMLElement>(margin = "120px") {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);

  return { ref, visible };
}

/** Normalised pointer position (-1..1) shared by scenes and parallax. */
export function usePointer() {
  const p = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      p.current.tx = (e.clientX / window.innerWidth) * 2 - 1;
      p.current.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  return p;
}

export function useAppReady() {
  const { bootDone } = useApp();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (bootDone) {
      const t = window.setTimeout(() => setReady(true), 60);
      return () => window.clearTimeout(t);
    }
  }, [bootDone]);
  return ready;
}
