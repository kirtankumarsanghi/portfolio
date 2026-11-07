import { useEffect, useState } from "react";
import { profile } from "@/data/site";

const pad = (n: number, len = 4) => String(Math.max(0, Math.round(n))).padStart(len, "0");

/** Live HUD data: clock (Intl, IST), temperature (Open-Meteo w/ fallback), cursor coords. */
export function useHud() {
  const [clock, setClock] = useState("--:--");
  const [temp, setTemp] = useState<number | null>(null);
  const [coords, setCoords] = useState({ x: "0000", y: "0000" });

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: profile.timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const update = () => setClock(fmt.format(new Date()));
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let alive = true;
    // Hyderabad fallback coordinates; tries the visitor's own city first.
    const fetchTemp = async (lat: number, lon: number) => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=temperature_2m`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("weather unavailable");
      const json = (await res.json()) as { current?: { temperature_2m?: number } };
      const t = json.current?.temperature_2m;
      if (typeof t !== "number") throw new Error("no temperature");
      if (alive) setTemp(Math.round(t));
    };

    // No geolocation prompt: the HUD reads GMT+5:30 IN, so sample Hyderabad
    // (17.385, 78.4867) and fall back to a static value if the API is blocked.
    fetchTemp(17.385, 78.4867).catch(() => {
      if (alive) setTemp(24);
    });

    const refresh = window.setInterval(
      () => fetchTemp(17.385, 78.4867).catch(() => undefined),
      10 * 60 * 1000,
    );

    return () => {
      alive = false;
      window.clearInterval(refresh);
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setCoords({ x: pad(e.clientX), y: pad(e.clientY) });
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return {
    clock,
    tempLabel: `${temp ?? "--"}°C`,
    coords,
    meta: `${profile.tzLabel} ${clock} ${temp ?? "--"}°C`,
  };
}

/** Overall document scroll progress 0..1 (rAF-throttled). */
export function useScrollProgressValue() {
  const [p, setP] = useState(0);
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setP(max > 0 ? window.scrollY / max : 0);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return p;
}
