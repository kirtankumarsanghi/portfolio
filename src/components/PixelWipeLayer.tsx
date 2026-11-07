import { useEffect, useRef } from "react";
import { TM } from "@/lib/transitions";

/** The single fixed canvas the TransitionManager draws every pixel-grid wipe into. */
export default function PixelWipeLayer() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    TM.attach(c);
    const onResize = () => TM.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      TM.detach();
    };
  }, []);
  // above page content and overlays (detail page is z-75), below the HUD (z-80) and the boot screen
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-[78] h-full w-full" aria-hidden="true" />;
}
