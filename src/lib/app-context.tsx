import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Howl } from "howler";

type Theme = "dark" | "light";

type AppCtx = {
  theme: Theme;
  toggleTheme: () => void;
  sound: boolean;
  toggleSound: () => void;
  /** tiny UI tick — silent while SOUND is off. freq ≈ pitch (Hz-ish) */
  tick: (freq?: number) => void;
  bootDone: boolean;
  setBootDone: (v: boolean) => void;
  reduced: boolean;
};

const Ctx = createContext<AppCtx | null>(null);

function prefersReduced() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* ---- procedurally generated audio (no sample files shipped) ---- */
function wavUrl(samples: Float32Array, rate: number): string {
  const n = samples.length;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const w = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF");
  v.setUint32(4, 36 + n * 2, true);
  w(8, "WAVE");
  w(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, "data");
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 32767, true);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}

function buildClick(): string {
  const rate = 44100;
  const n = Math.floor(rate * 0.075);
  const s = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const f = 1500 - 9200 * t;
    ph += (2 * Math.PI * Math.max(260, f)) / rate;
    const sq = Math.sign(Math.sin(ph)) * 0.35 + Math.sin(ph) * 0.65;
    s[i] = sq * Math.exp(-t * 58) * 0.9;
  }
  return wavUrl(s, rate);
}

function buildHum(): string {
  // 2s seamless loop: every partial completes an integer number of cycles
  const rate = 22050;
  const n = rate * 2;
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    s[i] =
      0.5 * Math.sin(2 * Math.PI * 55 * t) +
      0.32 * Math.sin(2 * Math.PI * 82.5 * t) +
      0.18 * Math.sin(2 * Math.PI * 110 * t + 0.6);
  }
  return wavUrl(s, rate);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [sound, setSound] = useState(false);
  const [bootDone, setBootDone] = useState(false);
  const [reduced] = useState(prefersReduced);

  const soundOn = useRef(false);
  const click = useRef<Howl | null>(null);
  const hum = useRef<Howl | null>(null);
  const last = useRef(0);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const ensure = useCallback(() => {
    if (!click.current) click.current = new Howl({ src: [buildClick()], format: ["wav"], volume: 0.26 });
    if (!hum.current) hum.current = new Howl({ src: [buildHum()], format: ["wav"], loop: true, volume: 0 });
  }, []);

  const tick = useCallback((freq = 1180) => {
    if (!soundOn.current || !click.current) return;
    const now = performance.now();
    if (now - last.current < 36) return;
    last.current = now;
    click.current.rate(Math.min(2, Math.max(0.5, freq / 1180)));
    click.current.play();
  }, []);

  const toggleSound = useCallback(() => {
    const next = !soundOn.current;
    soundOn.current = next;
    setSound(next);
    ensure();
    const h = hum.current;
    if (!h) return;
    if (next) {
      if (!h.playing()) h.play();
      h.fade(h.volume() as number, 0.1, 1400);
      click.current?.play();
    } else {
      h.fade(h.volume() as number, 0, 500);
      window.setTimeout(() => {
        if (!soundOn.current) h.pause();
      }, 560);
    }
  }, [ensure]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
    tick(760);
  }, [tick]);

  useEffect(
    () => () => {
      click.current?.unload();
      hum.current?.unload();
    },
    [],
  );

  const value = useMemo(
    () => ({ theme, toggleTheme, sound, toggleSound, tick, bootDone, setBootDone, reduced }),
    [theme, toggleTheme, sound, toggleSound, tick, bootDone, reduced],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside <AppProvider>");
  return v;
}
