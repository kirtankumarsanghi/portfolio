import { useEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AppProvider, useApp } from "@/lib/app-context";
import { useSmoothScroll } from "@/hooks/useScroll";
import HUD from "@/components/HUD";
import Cursor from "@/components/Cursor";
import ClickFX from "@/components/ClickFX";
import PixelWipeLayer from "@/components/PixelWipeLayer";
import Preloader from "@/components/Preloader";
import Hero from "@/sections/Hero";
import About from "@/sections/About";
import Work from "@/sections/Work";
import Warp from "@/sections/Warp";
import Skills from "@/sections/Skills";
import Education from "@/sections/Education";
import Contact from "@/sections/Contact";

function Site() {
  const { bootDone, reduced } = useApp();
  useSmoothScroll(bootDone && !reduced);

  /* lock the page while the boot counter runs */
  useEffect(() => {
    document.body.style.overflow = bootDone ? "" : "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [bootDone]);

  /* recompute pins once Lenis + webfonts have settled */
  useEffect(() => {
    if (!bootDone) return;
    const refresh = () => ScrollTrigger.refresh();
    const timers = [150, 700, 1800, 3500].map((ms) => window.setTimeout(refresh, ms));
    document.fonts?.ready.then(refresh).catch(() => undefined);
    window.addEventListener("load", refresh);
    return () => {
      timers.forEach(window.clearTimeout);
      window.removeEventListener("load", refresh);
    };
  }, [bootDone]);

  return (
    <>
      <a
        href="#work"
        className="mono sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[300] focus:bg-[#c6ff00] focus:px-3 focus:py-2 focus:text-[#05060a]"
      >
        SKIP TO WORK
      </a>

      <PixelWipeLayer />
      <Preloader />
      <HUD />
      <Cursor />
      <ClickFX />

      <main>
        <Hero />
        <About />
        <Work />
        <Warp />
        <Skills />
        <Education />
        <Contact />
      </main>
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Site />
    </AppProvider>
  );
}
