import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { projectShot } from "@/lib/assets";
import type { Project } from "@/data/projects";

/**
 * Card media: realistic styled UI mock-ups, built in HTML at a fixed 560x340 design size and
 * scaled to fit. Drop real screenshots into /public/projects/<name>.png and they replace the mocks.
 */
const BW = 560;
const BH = 340;

const rnd = (n: number) => Math.abs((Math.sin(n * 12.9898 + 4.1) * 43758.5453) % 1);
const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: string, b: string, t: number) => {
  const A = hex(a);
  const B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`;
};
const heat = (v: number) => (v < 0.6 ? mix("#111634", "#2a3fd6", v / 0.6) : mix("#2a3fd6", "#c6ff00", (v - 0.6) / 0.4));

export function ScaledMock({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [k, setK] = useState(0.7);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => setK(el.clientWidth / BW);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="relative h-full w-full overflow-hidden bg-[#0a0c11]">
      <div className="absolute top-0 left-0 origin-top-left" style={{ width: BW, height: BH, transform: `scale(${k})` }}>
        {children}
      </div>
    </div>
  );
}

function Frame({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col bg-[#0a0c11] text-white" style={{ fontFamily: "var(--font-body)", fontWeight: 400 }}>
      <div className="flex h-[26px] shrink-0 items-center gap-[6px] border-b border-white/[0.08] bg-[#0e1118] px-[10px]">
        <i className="h-[7px] w-[7px] rounded-full bg-white/20" />
        <i className="h-[7px] w-[7px] rounded-full bg-white/20" />
        <i className="h-[7px] w-[7px] rounded-full bg-white/20" />
        <span className="ml-[10px] rounded-[3px] bg-white/[0.06] px-[8px] py-[2px] font-mono text-[8px] tracking-[0.06em] text-white/50">{title}</span>
        <span className="ml-auto font-mono text-[7.5px] tracking-[0.08em] text-white/40">{right}</span>
      </div>
      <div className="relative min-h-0 flex-1">{children}</div>
    </div>
  );
}

const Label = ({ children }: { children: ReactNode }) => (
  <p className="font-mono text-[7.5px] tracking-[0.1em] text-white/40 uppercase">{children}</p>
);

/* ------------------------------ Nirixon ------------------------------ */
function NirixonMock() {
  const domains: [string, number][] = [
    ["Speech & Language", 0.86],
    ["Social Communication", 0.71],
    ["Attention", 0.34],
    ["Sensory Processing", 0.29],
    ["Emotional Regulation", 0.25],
    ["Motor Skills", 0.21],
    ["Cognition", 0.18],
    ["Adaptive Behaviour", 0.14],
  ];
  return (
    <Frame title="nirixon / intake" right="EN · HI · HINGLISH">
      <div className="flex h-full">
        <div className="flex w-[312px] shrink-0 flex-col border-r border-white/[0.08]">
          <div className="border-b border-white/[0.06] px-[12px] py-[8px]">
            <Label>Parent narrative</Label>
          </div>
          <div className="flex flex-1 flex-col gap-[7px] px-[12px] py-[10px] text-[9.5px] leading-[1.4]">
            <div className="max-w-[80%] self-start rounded-[7px] bg-white/[0.06] px-[9px] py-[6px] text-white/75">
              Tell us what you&apos;ve noticed about your child&apos;s day-to-day.
            </div>
            <div className="max-w-[84%] self-end rounded-[7px] bg-[#1b2fe0] px-[9px] py-[6px] text-white">
              Mera beta 3 saal ka hai, naam lene par palat ke nahi dekhta aur bolta bhi bahut kam hai.
            </div>
            <div className="max-w-[80%] self-start rounded-[7px] bg-white/[0.06] px-[9px] py-[6px] text-white/75">
              Thanks. Does he point to things he wants?
            </div>
            <div className="max-w-[70%] self-end rounded-[7px] bg-[#1b2fe0] px-[9px] py-[6px] text-white">
              Nahi, bas haath pakad ke le jaata hai.
            </div>
            <div className="mt-auto flex h-[28px] items-center justify-between rounded-[6px] border border-white/10 px-[10px] text-[9px] text-white/35">
              Describe what you&apos;ve noticed…
              <span className="text-[#c6ff00]">↵</span>
            </div>
          </div>
        </div>
        <div className="flex-1 px-[14px] py-[10px]">
          <Label>Domain probability · 8 domains</Label>
          <div className="mt-[8px] space-y-[5px]">
            {domains.map(([n, v], i) => (
              <div key={n} className="flex items-center gap-[8px]">
                <span className="w-[92px] truncate text-[8.5px] text-white/65">{n}</span>
                <span className="relative h-[6px] flex-1 rounded-full bg-white/[0.07]">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ width: `${v * 100}%`, background: i < 2 ? "linear-gradient(90deg,#2a3fd6,#c6ff00)" : "#2a3fd6" }}
                  />
                </span>
                <span className="w-[24px] text-right font-mono text-[8px] text-white/60">{v.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="mt-[12px] flex gap-[6px]">
            <span className="rounded-[3px] border border-[#c6ff00]/50 px-[6px] py-[3px] font-mono text-[7.5px] tracking-[0.08em] text-[#c6ff00]">TRIAGE · REVIEW</span>
            <span className="rounded-[3px] border border-white/20 px-[6px] py-[3px] font-mono text-[7.5px] tracking-[0.08em] text-white/60">CRISIS SCAN · CLEAR</span>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ------------------------------ ResQSync ------------------------------ */
function ResQMock() {
  const pins: { x: number; y: number; c: string; ring?: boolean }[] = [
    { x: 60, y: 82, c: "#c6ff00" },
    { x: 118, y: 140, c: "#ffffff" },
    { x: 176, y: 70, c: "#c6ff00", ring: true },
    { x: 214, y: 168, c: "#7d93ff" },
    { x: 96, y: 214, c: "#ffffff" },
    { x: 258, y: 98, c: "#c6ff00" },
    { x: 150, y: 232, c: "#7d93ff" },
    { x: 236, y: 244, c: "#ffffff" },
  ];
  return (
    <Frame title="resqsync / incident map" right="14 INCIDENTS · 6 OPEN">
      <div className="flex h-full">
        <div className="relative flex-1 overflow-hidden border-r border-white/[0.08] bg-[#0b0e15]">
          <svg viewBox="0 0 360 314" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
            <defs>
              <pattern id="rq-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M24 0H0v24" fill="none" stroke="#fff" strokeOpacity="0.045" />
              </pattern>
            </defs>
            <rect width="360" height="314" fill="url(#rq-grid)" />
            <path d="M14 36 L158 18 L182 128 L58 160 Z" fill="#fff" fillOpacity="0.025" stroke="#fff" strokeOpacity="0.14" />
            <path d="M158 18 L330 40 L318 150 L182 128 Z" fill="#fff" fillOpacity="0.04" stroke="#fff" strokeOpacity="0.14" />
            <path d="M58 160 L182 128 L318 150 L300 290 L80 296 Z" fill="#fff" fillOpacity="0.02" stroke="#fff" strokeOpacity="0.14" />
            <path d="M-10 238 C70 206 130 268 220 226 S330 190 380 206" fill="none" stroke="#3d5bff" strokeOpacity="0.55" strokeWidth="6" strokeLinecap="round" />
            <path d="M40 0 L110 314 M0 120 L360 96 M200 0 L240 314" stroke="#fff" strokeOpacity="0.1" fill="none" />
            {pins.map((p, i) => (
              <g key={i}>
                {p.ring && <circle cx={p.x} cy={p.y} r="15" fill="none" stroke={p.c} strokeOpacity="0.45" />}
                <circle cx={p.x} cy={p.y} r="5.5" fill={p.c} stroke="#0a0c11" strokeWidth="2" />
              </g>
            ))}
            <rect x="184" y="44" width="92" height="19" rx="2" fill="#0a0c11" stroke="#c6ff00" strokeOpacity="0.6" />
            <text x="191" y="57" fill="#c6ff00" fontFamily="monospace" fontSize="8">INC-0412 · FLOOD · D3</text>
          </svg>
          <span className="absolute top-[10px] left-[10px] rounded-[3px] bg-[#0a0c11]/85 px-[7px] py-[3px] font-mono text-[7.5px] tracking-[0.08em] text-white/70">MULTI-DISTRICT VIEW</span>
        </div>
        <div className="w-[196px] shrink-0 px-[12px] py-[10px]">
          <Label>Workspace · role</Label>
          <div className="mt-[8px] space-y-[5px]">
            {["Incident Commander", "Coordinator", "Field Responder"].map((r, i) => (
              <div key={r} className={`flex items-center gap-[8px] rounded-[4px] border px-[8px] py-[6px] text-[9px] ${i === 1 ? "border-[#c6ff00]/50 bg-[#c6ff00]/[0.06] text-white" : "border-white/[0.08] text-white/55"}`}>
                <span className={`h-[7px] w-[7px] rounded-full border ${i === 1 ? "border-[#c6ff00] bg-[#c6ff00]" : "border-white/30"}`} />
                {r}
              </div>
            ))}
          </div>
          <div className="mt-[11px]">
            <Label>Allocation lock</Label>
            <div className="mt-[6px] rounded-[4px] border border-white/[0.1] bg-white/[0.03] p-[8px]">
              <p className="text-[9px] text-white/80">Water · District 3</p>
              <p className="mt-[3px] font-mono text-[7.5px] tracking-[0.06em] text-[#c6ff00]">ROW LOCKED · OUTBOX PENDING</p>
            </div>
          </div>
          <p className="mt-[10px] font-mono text-[7.5px] tracking-[0.06em] text-white/35">X-Request-ID 7f3a-91c2-04be</p>
          <p className="mt-[3px] font-mono text-[7.5px] tracking-[0.06em] text-white/35">AUDIT · TAMPER-RESISTANT</p>
        </div>
      </div>
    </Frame>
  );
}

/* ------------------------------ Cognivia ------------------------------ */
function CogniviaMock() {
  const pts = Array.from({ length: 24 }, (_, i) => 0.34 + 0.22 * Math.sin(i * 0.5) + 0.2 * rnd(i + 3));
  const line = pts.map((v, i) => `${(i / 23) * 196},${78 - v * 74}`).join(" ");
  return (
    <Frame title="cognivia / class 10-B" right="LIVE">
      <div className="flex h-full">
        <div className="w-[338px] shrink-0 px-[14px] py-[10px]">
          <Label>Confusion heatmap · students × concepts</Label>
          <div className="mt-[8px] grid grid-cols-10 gap-[3px]">
            {Array.from({ length: 80 }, (_, i) => (
              <span key={i} className="block h-[22px] rounded-[2px]" style={{ background: heat(rnd(i + 1) * (0.35 + (i % 10) * 0.07)) }} />
            ))}
          </div>
          <div className="mt-[10px] flex items-center gap-[8px]">
            <span className="font-mono text-[7.5px] text-white/40">CLEAR</span>
            <span className="h-[4px] flex-1 rounded-full" style={{ background: "linear-gradient(90deg,#111634,#2a3fd6,#c6ff00)" }} />
            <span className="font-mono text-[7.5px] text-white/40">CONFUSED</span>
          </div>
        </div>
        <div className="flex-1 border-l border-white/[0.08] px-[14px] py-[10px]">
          <Label>Confusion index · rolling window</Label>
          <div className="mt-[4px] flex items-baseline gap-[8px]">
            <span className="text-[30px] leading-none font-light text-white">0.42</span>
            <span className="font-mono text-[8px] text-[#c6ff00]">▲ 0.06</span>
          </div>
          <svg viewBox="0 0 196 80" className="mt-[6px] h-[78px] w-full">
            <defs>
              <linearGradient id="cg-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3d5bff" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#3d5bff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polyline points={`0,80 ${line} 196,80`} fill="url(#cg-area)" stroke="none" />
            <polyline points={line} fill="none" stroke="#c6ff00" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
          <div className="mt-[8px]">
            <Label>Revision queue</Label>
            <div className="mt-[5px] space-y-[4px]">
              {[
                ["Recursion", "6 students"],
                ["Joins & indexes", "4 students"],
                ["Big-O notation", "3 students"],
              ].map(([a, b]) => (
                <div key={a} className="flex items-center justify-between rounded-[3px] border border-white/[0.07] px-[7px] py-[4px] text-[8.5px] text-white/70">
                  {a}
                  <span className="font-mono text-[7.5px] text-white/40">{b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ----------------------------- Taalmel Sync ----------------------------- */
function TaalmelMock() {
  const rows: [string, string, string, string, string][] = [
    ["0412", "MedicationPrescribed", "PRESCRIBED", "Metformin 500mg", "MATCH"],
    ["0413", "MedicationObserved", "OBSERVED", "Metformin 500mg", "MATCH"],
    ["0414", "MedicationReported", "PATIENT", "Glucophage 500mg", "BRAND→GENERIC"],
    ["0415", "MedicationPrescribed", "PRESCRIBED", "Amlodipine 5mg", "MATCH"],
    ["0416", "MedicationObserved", "OBSERVED", "Amlodipine 10mg", "DOSE_MISMATCH"],
    ["0417", "MedicationReported", "PATIENT", "Herbal blend X", "NOT_COVERED"],
    ["0418", "ReconciliationRun", "SYSTEM", "7 categories", "RESOLVED"],
  ];
  const badge = (s: string) =>
    s === "MATCH" || s === "RESOLVED"
      ? "border-[#c6ff00]/55 text-[#c6ff00]"
      : s === "BRAND→GENERIC"
        ? "border-[#3d5bff] bg-[#3d5bff]/25 text-[#b4c0ff]"
        : s === "DOSE_MISMATCH"
          ? "border-white bg-white text-[#0a0c11]"
          : "border-dashed border-white/50 text-white/70";
  return (
    <Frame title="taalmel-sync / event store" right="APPEND-ONLY">
      <div className="px-[14px] py-[10px]">
        <div className="mb-[6px] flex items-center justify-between">
          <Label>Events · patient 0091</Label>
          <span className="font-mono text-[7.5px] tracking-[0.08em] text-white/40">AUDIT PROVENANCE ON</span>
        </div>
        <div className="grid grid-cols-[34px_130px_74px_96px_1fr] border-b border-white/[0.08] pb-[5px] font-mono text-[7px] tracking-[0.1em] text-white/35">
          <span>SEQ</span>
          <span>EVENT</span>
          <span>SOURCE</span>
          <span>DRUG</span>
          <span className="text-right">STATUS</span>
        </div>
        <div className="relative">
          <span className="absolute top-[6px] bottom-[6px] left-[14px] w-px bg-white/10" />
          {rows.map((r) => (
            <div key={r[0]} className="grid h-[31px] grid-cols-[34px_130px_74px_96px_1fr] items-center border-b border-white/[0.05] text-[8.5px] text-white/75">
              <span className="relative font-mono text-[8px] text-white/45">
                <i className="absolute top-1/2 left-[11px] h-[5px] w-[5px] -translate-y-1/2 rounded-full bg-[#3d5bff]" />
                <span className="pl-[0px] opacity-0">{r[0]}</span>
                <span className="absolute inset-y-0 left-0 hidden">{r[0]}</span>
              </span>
              <span className="truncate">{r[1]}</span>
              <span className="font-mono text-[7.5px] text-white/45">{r[2]}</span>
              <span className="truncate">{r[3]}</span>
              <span className="flex justify-end">
                <span className={`rounded-[3px] border px-[6px] py-[2px] font-mono text-[7px] tracking-[0.06em] ${badge(r[4])}`}>{r[4]}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

/* ------------------------------ EVision ------------------------------ */
function EvisionMock() {
  const cities: [string, number][] = [
    ["Delhi", 92],
    ["Bengaluru", 88],
    ["Pune", 81],
    ["Guwahati", 76],
    ["Surat", 72],
  ];
  const bubbles: [number, number, number][] = [
    [88, 72, 9],
    [96, 128, 6],
    [74, 150, 5],
    [130, 96, 4],
    [62, 104, 4],
    [110, 182, 3],
    [146, 138, 3],
  ];
  return (
    <Frame title="evision / hotspot ranking" right="51 CITIES · CDS">
      <div className="flex h-full">
        <div className="relative w-[292px] shrink-0 border-r border-white/[0.08]">
          <svg viewBox="0 0 292 314" className="absolute inset-0 h-full w-full">
            <defs>
              <pattern id="ev-grid" width="22" height="22" patternUnits="userSpaceOnUse">
                <path d="M22 0H0v22" fill="none" stroke="#fff" strokeOpacity="0.04" />
              </pattern>
            </defs>
            <rect width="292" height="314" fill="url(#ev-grid)" />
            <path d="M104 44 L156 58 L172 112 L142 168 L110 196 L74 158 L82 104 Z" fill="#fff" fillOpacity="0.05" stroke="#fff" strokeOpacity="0.16" />
            <path d="M172 112 L210 126 L198 176 L142 168 Z" fill="#c6ff00" fillOpacity="0.07" stroke="#c6ff00" strokeOpacity="0.35" />
            <path d="M110 196 L142 168 L198 176 L180 246 L120 258 L92 226 Z" fill="#fff" fillOpacity="0.03" stroke="#fff" strokeOpacity="0.12" />
            {bubbles.map(([x, y, r], i) => (
              <g key={i}>
                <circle cx={x} cy={y} r={r * 1.8} fill="#c6ff00" fillOpacity="0.08" />
                <circle cx={x} cy={y} r={r} fill={i === 0 ? "#c6ff00" : "#7fe3ff"} fillOpacity={i === 0 ? 0.9 : 0.65} />
              </g>
            ))}
          </svg>
          <span className="absolute top-[10px] left-[10px] rounded-[3px] bg-[#0a0c11]/85 px-[7px] py-[3px] font-mono text-[7.5px] tracking-[0.08em] text-white/70">COMPOSITE DEMAND SCORE</span>
          <span className="absolute bottom-[10px] left-[10px] rounded-[3px] bg-[#0a0c11]/85 px-[7px] py-[3px] font-mono text-[7.5px] tracking-[0.08em] text-white/45">3,519 CITY-MONTHS · 96.9% OBSERVED</span>
        </div>
        <div className="flex-1 px-[14px] py-[10px]">
          <Label>Priority cities</Label>
          <div className="mt-[9px] space-y-[9px]">
            {cities.map(([name, score], i) => (
              <div key={name}>
                <div className="flex items-baseline justify-between text-[9.5px]">
                  <span className={i < 2 ? "text-white" : "text-white/65"}>{name}</span>
                  <span className="font-mono text-[8px]" style={{ color: i < 2 ? "#c6ff00" : "rgba(255,255,255,0.55)" }}>{score}</span>
                </div>
                <span className="mt-[4px] block h-[5px] w-full rounded-full bg-white/[0.07]">
                  <span className="block h-full rounded-full" style={{ width: `${score}%`, background: i < 2 ? "linear-gradient(90deg,#2a3fd6,#c6ff00)" : "#2a3fd6" }} />
                </span>
              </div>
            ))}
          </div>
          <div className="mt-[13px] flex gap-[6px]">
            <span className="rounded-[3px] border border-[#c6ff00]/50 px-[6px] py-[3px] font-mono text-[7.5px] tracking-[0.08em] text-[#c6ff00]">3W + 4W DEMAND</span>
            <span className="rounded-[3px] border border-white/20 px-[6px] py-[3px] font-mono text-[7.5px] tracking-[0.08em] text-white/55">MONTE CARLO · 1K</span>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ------------------------------ SafePath ------------------------------ */
function SafePathMock() {
  const blocked = new Set(["2,2", "3,2", "4,2", "9,1", "9,2", "9,3", "14,4", "15,4", "16,4", "5,7", "6,7", "7,7", "11,8", "12,8", "13,8", "17,2"]);
  const path = "27.5,77.5 72.5,77.5 72.5,122.5 117.5,122.5 117.5,167.5 162.5,167.5 162.5,212.5 207.5,212.5 207.5,167.5 252.5,167.5 252.5,122.5 282.5,122.5";
  return (
    <Frame title="safepath / simulator" right="MANHATTAN · 60 NODES">
      <div className="flex h-full">
        <div className="relative flex-1 border-r border-white/[0.08] bg-[#080b12]">
          <svg viewBox="0 0 300 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
            {Array.from({ length: 180 }, (_, i) => {
              const c = i % 18;
              const r = Math.floor(i / 18);
              const x = 17.5 + c * 15;
              const y = 47.5 + r * 15;
              const key = `${c},${r}`;
              const wall = blocked.has(key);
              const onPath = path.includes(`${x},${y}`);
              return (
                <rect
                  key={key}
                  x={x - 6.4}
                  y={y - 6.4}
                  width="12.8"
                  height="12.8"
                  fill={wall ? "#ffffff" : onPath ? "#c6ff00" : "#7d93ff"}
                  fillOpacity={wall ? 0.72 : onPath ? 0.9 : 0.12}
                />
              );
            })}
            <polyline points={path} fill="none" stroke="#c6ff00" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx="27.5" cy="77.5" r="5" fill="#c6ff00" />
            <circle cx="282.5" cy="122.5" r="5" fill="#0a0c11" stroke="#c6ff00" strokeWidth="2" />
            <circle cx="162.5" cy="167.5" r="7" fill="#ff6b4a" fillOpacity="0.85" />
            <text x="22" y="70" fill="#05070a" fontFamily="monospace" fontSize="7" fontWeight="700">P1</text>
            <text x="270" y="114" fill="#c6ff00" fontFamily="monospace" fontSize="7" fontWeight="700">E1</text>
            <text x="169" y="196" fill="#ff9f86" fontFamily="monospace" fontSize="6.5">FIRE</text>
          </svg>
          <span className="absolute top-[10px] left-[10px] rounded-[3px] bg-[#0a0c11]/90 px-[7px] py-[3px] font-mono text-[7.5px] tracking-[0.08em] text-white/70">A* SEARCH · STEP 14 / 24</span>
        </div>
        <div className="w-[196px] shrink-0 px-[12px] py-[10px]">
          <Label>Node scores</Label>
          <div className="mt-[8px] grid grid-cols-3 gap-[4px] text-center">
            {[
              ["g", "6.0"],
              ["h", "4.0"],
              ["f", "10.0"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-[4px] border border-white/[0.08] bg-white/[0.03] px-[4px] py-[5px]">
                <p className="font-mono text-[7px] text-white/40">{k}</p>
                <p className="font-mono text-[9px] text-white">{v}</p>
              </div>
            ))}
          </div>
          <div className="mt-[11px]">
            <Label>Heuristic</Label>
            <div className="mt-[6px] space-y-[4px]">
              {["Manhattan", "Euclidean", "Chebyshev"].map((h, i) => (
                <div key={h} className={`flex items-center justify-between rounded-[3px] border px-[7px] py-[4px] text-[8.5px] ${i === 0 ? "border-[#c6ff00]/50 bg-[#c6ff00]/[0.06] text-white" : "border-white/[0.08] text-white/55"}`}>
                  {h}
                  {i === 0 && <span className="font-mono text-[7px] text-[#c6ff00]">MIN</span>}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-[11px] rounded-[4px] border border-white/[0.1] bg-white/[0.03] p-[8px]">
            <p className="text-[9px] text-white/80">Exit reached</p>
            <p className="mt-[3px] font-mono text-[7.5px] tracking-[0.06em] text-[#c6ff00]">COST 10.00 · 15 EXPLORED</p>
          </div>
          <p className="mt-[10px] font-mono text-[7.5px] tracking-[0.06em] text-white/35">WORKER THREAD · UI FREE</p>
        </div>
      </div>
    </Frame>
  );
}

/* --------------------------- Pricing the Game --------------------------- */
function PricingMock() {
  const cells = [
    ["80, 80", "25, 110"],
    ["110, 25", "40, 40"],
  ];
  return (
    <Frame title="pricing-the-game / chapter 1" right="ONE-SHOT GAME">
      <div className="flex h-full">
        <div className="flex-1 px-[14px] py-[10px]">
          <Label>Payoff matrix · ₹ lakh</Label>
          <div className="mt-[8px] grid grid-cols-[1.1fr_1fr_1fr] gap-[3px]">
            <span />
            <span className="py-[3px] text-center font-mono text-[7.5px] tracking-[0.06em] text-white/40">YUMMLY ₹49</span>
            <span className="py-[3px] text-center font-mono text-[7.5px] tracking-[0.06em] text-white/40">YUMMLY ₹19</span>
            <span className="flex items-center font-mono text-[7.5px] tracking-[0.06em] text-white/40">QB ₹49</span>
            {cells[0].map((v, j) => (
              <span key={j} className={`flex h-[62px] items-center justify-center rounded-[3px] border text-[14px] font-light ${j === 0 ? "border-white/[0.09] text-white/70" : "border-white/[0.09] text-white/55"}`}>
                {v}
              </span>
            ))}
            <span className="flex items-center font-mono text-[7.5px] tracking-[0.06em] text-white/40">QB ₹19</span>
            {cells[1].map((v, j) => (
              <span key={j} className={`flex h-[62px] items-center justify-center rounded-[3px] border text-[14px] font-light ${j === 1 ? "border-[#c6ff00] bg-[#c6ff00]/[0.08] text-[#c6ff00]" : "border-white/[0.09] text-white/55"}`}>
                {v}
              </span>
            ))}
          </div>
          <div className="mt-[9px] flex gap-[5px]">
            {["BEST RESPONSE", "DOMINANCE", "PARETO VS NASH"].map((t, i) => (
              <span key={t} className={`rounded-[3px] border px-[5px] py-[3px] font-mono text-[6.5px] tracking-[0.05em] ${i === 2 ? "border-[#c6ff00]/60 text-[#c6ff00]" : "border-white/15 text-white/55"}`}>
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="w-[168px] shrink-0 border-l border-white/[0.08] px-[12px] py-[10px]">
          <Label>Board confidence</Label>
          <div className="mt-[4px] flex items-baseline gap-[7px]">
            <span className="text-[28px] leading-none font-light text-white">100</span>
            <span className="font-mono text-[8px] text-[#c6ff00]">STABLE</span>
          </div>
          <div className="mt-[10px]">
            <Label>δ · patience</Label>
            <div className="mt-[5px] h-[5px] w-full rounded-full bg-white/[0.08]">
              <span className="block h-full w-[58%] rounded-full" style={{ background: "linear-gradient(90deg,#2a3fd6,#c6ff00)" }} />
            </div>
            <p className="mt-[4px] font-mono text-[7px] text-white/40">0.58 · THRESHOLD 0.429</p>
          </div>
          <div className="mt-[12px] rounded-[4px] border border-white/[0.1] bg-white/[0.03] p-[8px]">
            <p className="text-[8.5px] text-white/75">Nash equilibrium</p>
            <p className="mt-[3px] font-mono text-[7px] text-[#c6ff00]">BOTH DISCOUNT · 40, 40</p>
          </div>
          <p className="mt-[9px] font-mono text-[7px] leading-[1.7] text-white/35">COOPERATE 80, 80<br />PROFIT DESTROYED 50%</p>
        </div>
      </div>
    </Frame>
  );
}

/* ------------------------------ Cerevia ------------------------------ */
function CereviaMock() {
  const mood = [0.42, 0.55, 0.48, 0.62, 0.58, 0.71, 0.66, 0.78, 0.72, 0.83];
  const line = mood.map((v, i) => `${(i / 9) * 180},${72 - v * 58}`).join(" ");
  return (
    <Frame title="cerevia / dashboard" right="MOOD · JOURNAL · TASKS">
      <div className="flex h-full">
        <div className="w-[318px] shrink-0 border-r border-white/[0.08] px-[14px] py-[10px]">
          <Label>Mood · last 10 days</Label>
          <div className="mt-[5px] flex items-baseline gap-[8px]">
            <span className="text-[28px] leading-none font-light text-white">7.8</span>
            <span className="font-mono text-[8px] text-[#c6ff00]">▲ CALM</span>
          </div>
          <svg viewBox="0 0 180 80" preserveAspectRatio="none" className="mt-[4px] h-[70px] w-full">
            <defs>
              <linearGradient id="cv-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3d5bff" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#3d5bff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polyline points={`0,80 ${line} 180,80`} fill="url(#cv-area)" stroke="none" />
            <polyline points={line} fill="none" stroke="#c6ff00" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
          <div className="mt-[8px] grid grid-cols-4 gap-[4px]">
            {["MON", "TUE", "WED", "THU"].map((d, i) => (
              <div key={d} className="rounded-[3px] border border-white/[0.07] px-[4px] py-[4px] text-center">
                <p className="font-mono text-[6.5px] text-white/35">{d}</p>
                <p className="mt-[3px] text-[8.5px]" style={{ color: i === 3 ? "#c6ff00" : "rgba(255,255,255,0.6)" }}>{["6.1", "6.8", "7.0", "7.8"][i]}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 px-[14px] py-[10px]">
          <Label>Journal · today</Label>
          <div className="mt-[6px] rounded-[4px] border border-white/[0.09] bg-white/[0.03] p-[8px]">
            <p className="text-[9px] leading-[1.55] text-white/70">Slept better. The grounding routine before the stand-up actually helped.</p>
            <p className="mt-[5px] font-mono text-[6.5px] tracking-[0.06em] text-white/30">SAVED · 08:42</p>
          </div>
          <Label>Tasks</Label>
          <div className="mt-[6px] space-y-[4px]">
            {[
              ["Breathing · 4 min", true],
              ["Evening journal", true],
              ["Walk · 20 min", false],
            ].map(([t, done]) => (
              <div key={String(t)} className="flex items-center gap-[7px] rounded-[3px] border border-white/[0.07] px-[7px] py-[5px] text-[8.5px] text-white/70">
                <span className={`flex h-[9px] w-[9px] items-center justify-center rounded-[2px] border text-[6px] ${done ? "border-[#c6ff00] bg-[#c6ff00] text-[#05070a]" : "border-white/30"}`}>
                  {done ? "✓" : ""}
                </span>
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ------------------------------- Locus ------------------------------- */
function LocusMock() {
  const seats = Array.from({ length: 48 }, (_, i) => (i * 7 + 3) % 11);
  return (
    <Frame title="locus / floor 3" right="LIVE · 42/60 SEATS">
      <div className="flex h-full">
        <div className="flex-1 border-r border-white/[0.08] px-[14px] py-[10px]">
          <div className="flex items-center justify-between">
            <Label>Live floor map</Label>
            <span className="font-mono text-[7px] text-[#c6ff00]">SOCKET · 13 EVENTS</span>
          </div>
          <div className="mt-[8px] grid grid-cols-8 gap-[4px]">
            {seats.map((s, i) => (
              <span
                key={i}
                className="block h-[22px] rounded-[2px] border"
                style={{
                  borderColor: s < 2 ? "#c6ff00" : s < 4 ? "#7d93ff" : "rgba(255,255,255,0.12)",
                  background: s < 2 ? "rgba(198,255,0,0.18)" : s < 4 ? "rgba(125,147,255,0.16)" : "rgba(255,255,255,0.03)",
                }}
              />
            ))}
          </div>
          <div className="mt-[8px] flex gap-[10px] font-mono text-[6.5px] text-white/40">
            <span><i className="mr-[4px] inline-block h-[5px] w-[5px] bg-[#c6ff00]" />OCCUPIED</span>
            <span><i className="mr-[4px] inline-block h-[5px] w-[5px] bg-[#7d93ff]" />AWAY</span>
            <span><i className="mr-[4px] inline-block h-[5px] w-[5px] bg-white/20" />FREE</span>
          </div>
        </div>
        <div className="w-[180px] shrink-0 px-[12px] py-[10px]">
          <Label>Seat recommendation</Label>
          <div className="mt-[6px] rounded-[4px] border border-[#c6ff00]/40 bg-[#c6ff00]/[0.05] p-[8px]">
            <p className="text-[9px] text-white">Desk B-14 · Zone 2</p>
            <p className="mt-[3px] font-mono text-[7px] text-[#c6ff00]">SCORE 0.91 · QUIET</p>
          </div>
          <div className="mt-[10px] space-y-[5px]">
            {[
              ["Previous usage", "40%"],
              ["Preferred zone", "25%"],
              ["Availability", "15%"],
              ["Noise match", "10%"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-[7.5px] text-white/55">
                {k}
                <span className="font-mono text-white/35">{v}</span>
              </div>
            ))}
          </div>
          <div className="mt-[11px] rounded-[4px] border border-white/[0.1] bg-white/[0.03] p-[7px]">
            <p className="font-mono text-[6.5px] tracking-[0.06em] text-white/35">SESSION LIFECYCLE</p>
            <p className="mt-[4px] font-mono text-[7px] leading-[1.7] text-white/60">OCCUPIED → AWAY<br />→ ABANDONED → RESET</p>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ---------------------------- PolarSync Edge ---------------------------- */
function PolarsyncMock() {
  const bars = [46, 58, 34, 72, 64, 88, 76, 54, 62, 81, 70, 58];
  return (
    <Frame title="polarsync / station command" right="−28.4°C · OFFLINE">
      <div className="flex h-full">
        <div className="flex-1 border-r border-white/[0.08] px-[14px] py-[10px]">
          <div className="flex items-center justify-between">
            <Label>Microgrid · 24h</Label>
            <span className="font-mono text-[7px] text-[#c6ff00]">ONNX · &lt;20 MS</span>
          </div>
          <div className="mt-[8px] flex h-[104px] items-end gap-[5px] border-b border-white/[0.08] pb-[4px]">
            {bars.map((v, i) => (
              <span key={i} className="flex-1" style={{ height: `${v}%`, background: i > 7 ? "#c6ff00" : i > 4 ? "#7fe3ff" : "rgba(255,255,255,0.16)" }} />
            ))}
          </div>
          <div className="mt-[8px] grid grid-cols-3 gap-[5px]">
            {[
              ["SOLAR", "520 kWh/d"],
              ["DEMAND", "900 kWh/d"],
              ["BATTERY", "72%"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-[3px] border border-white/[0.07] px-[6px] py-[5px]">
                <p className="font-mono text-[6px] tracking-[0.07em] text-white/35">{k}</p>
                <p className="mt-[3px] font-mono text-[8px] text-white/75">{v}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="w-[190px] shrink-0 px-[12px] py-[10px]">
          <Label>Load criticality</Label>
          <div className="mt-[7px] space-y-[5px]">
            {[
              ["Tier 1 · Life safety", "LOCKED", true],
              ["Tier 2 · Science", "SHIFT", false],
              ["Tier 3 · Non-critical", "SHED", false],
            ].map(([t, s, locked]) => (
              <div key={String(t)} className="flex items-center justify-between rounded-[3px] border border-white/[0.08] px-[7px] py-[5px] text-[8px] text-white/65">
                {t}
                <span className="font-mono text-[6.5px]" style={{ color: locked ? "#c6ff00" : "rgba(255,255,255,0.4)" }}>{s}</span>
              </div>
            ))}
          </div>
          <div className="mt-[10px] rounded-[4px] border border-[#c6ff00]/40 bg-[#c6ff00]/[0.05] p-[8px]">
            <p className="text-[8.5px] text-white/85">Battery reserve ring-fence</p>
            <p className="mt-[3px] font-mono text-[7px] text-[#c6ff00]">30% · NEVER SHED</p>
          </div>
          <p className="mt-[9px] font-mono text-[6.5px] leading-[1.7] text-white/35">AUDIT LEDGER · IMMUTABLE<br />HUMAN INTERLOCK · ON</p>
        </div>
      </div>
    </Frame>
  );
}

/* --------------------------- Taalmel Health --------------------------- */
function TaalmelHealthMock() {
  const rows: [string, string, string, string][] = [
    ["lisinopril + spironolactone", "hyperkalemia risk", "MAJOR", "#c6ff00"],
    ["E11.9 / E11.65", "same category · diabetes", "DUPLICATE", "#7d93ff"],
    ["paracetamol + warfarin", "moderate interaction", "REVIEW", "#ffd27d"],
    ["\"Herbal blend X\"", "coverage unknown", "NOT_COVERED", "#ffffff"],
  ];
  return (
    <Frame title="taalmel / reconcile" right="3 PROVIDERS · 6 FLAGS">
      <div className="flex h-full">
        <div className="flex-1 border-r border-white/[0.08] px-[14px] py-[10px]">
          <Label>Reconciliation report · patient P001</Label>
          <div className="mt-[8px] space-y-[5px]">
            {rows.map(([a, b, tag, c]) => (
              <div key={a} className="rounded-[4px] border border-white/[0.08] bg-white/[0.02] px-[8px] py-[6px]">
                <div className="flex items-center justify-between gap-[8px]">
                  <p className="truncate text-[9px] text-white/80">{a}</p>
                  <span className="shrink-0 rounded-[3px] border px-[5px] py-[2px] font-mono text-[6px] tracking-[0.06em]" style={{ borderColor: `${c}66`, color: c }}>
                    {tag}
                  </span>
                </div>
                <p className="mt-[3px] font-mono text-[6.5px] text-white/35">{b}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="w-[184px] shrink-0 px-[12px] py-[10px]">
          <Label>Point of care</Label>
          <div className="mt-[6px] rounded-[4px] border border-[#c6ff00]/40 bg-[#c6ff00]/[0.05] p-[8px]">
            <p className="text-[9px] text-white">Safe to proceed</p>
            <p className="mt-[3px] font-mono text-[7px] text-[#c6ff00]">FALSE · UNKNOWN DRUG</p>
          </div>
          <div className="mt-[10px] space-y-[5px]">
            {[
              ["Free-text parse", "Dolo 650mg BD"],
              ["Brand → generic", "paracetamol"],
              ["Household mix-up", "DOSE RISK"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-[7.5px] text-white/55">
                {k}
                <span className="font-mono text-[6.5px] text-white/40">{v}</span>
              </div>
            ))}
          </div>
          <div className="mt-[10px] rounded-[4px] border border-white/[0.1] bg-white/[0.03] p-[7px]">
            <p className="font-mono text-[6.5px] tracking-[0.06em] text-white/35">MCP · 6 TOOLS</p>
            <p className="mt-[4px] font-mono text-[7px] leading-[1.7] text-white/60">NARRATE FROM<br />CITED OUTPUT ONLY</p>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ------------------------------- VestIQ ------------------------------- */
function VestiqMock() {
  const values = [0.22, 0.3, 0.27, 0.38, 0.42, 0.4, 0.52, 0.49, 0.61, 0.58, 0.68, 0.74];
  const line = values.map((v, i) => `${(i / 11) * 276},${88 - v * 76}`).join(" ");
  return (
    <Frame title="vestiq / portfolio" right="GOALS · INSIGHTS">
      <div className="flex h-full">
        <div className="flex-1 border-r border-white/[0.08] px-[14px] py-[10px]">
          <Label>Portfolio value</Label>
          <div className="mt-[4px] flex items-baseline gap-[8px]">
            <span className="text-[26px] leading-none font-light text-white">₹8.42L</span>
            <span className="font-mono text-[8px] text-[#c6ff00]">▲ 12.4%</span>
          </div>
          <svg viewBox="0 0 276 94" preserveAspectRatio="none" className="mt-[4px] h-[86px] w-full">
            <defs>
              <linearGradient id="vq-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c6ff00" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#c6ff00" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polyline points={`0,94 ${line} 276,94`} fill="url(#vq-area)" stroke="none" />
            <polyline points={line} fill="none" stroke="#c6ff00" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
          <div className="mt-[7px] grid grid-cols-3 gap-[5px]">
            {[
              ["EQUITY", "58%"],
              ["DEBT", "27%"],
              ["CASH", "15%"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-[3px] border border-white/[0.07] px-[6px] py-[5px]">
                <p className="font-mono text-[6px] tracking-[0.07em] text-white/35">{k}</p>
                <p className="mt-[3px] font-mono text-[8px] text-white/75">{v}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="w-[174px] shrink-0 px-[12px] py-[10px]">
          <Label>Goals</Label>
          <div className="mt-[7px] space-y-[5px]">
            {[
              ["Emergency fund", "82%"],
              ["House deposit", "46%"],
              ["Travel fund", "68%"],
            ].map(([g, p]) => (
              <div key={g} className="rounded-[3px] border border-white/[0.08] px-[7px] py-[5px]">
                <div className="flex items-center justify-between text-[7.5px] text-white/65">
                  {g}
                  <span className="font-mono text-[6.5px] text-white/35">{p}</span>
                </div>
                <span className="mt-[3px] block h-[3px] w-full rounded-full bg-white/[0.07]">
                  <span className="block h-full rounded-full bg-[#c6ff00]" style={{ width: p }} />
                </span>
              </div>
            ))}
          </div>
          <p className="mt-[10px] font-mono text-[6.5px] leading-[1.7] text-white/35">JWT SESSION · MONGOOSE<br />INSIGHTS FROM LIVE RECORDS</p>
        </div>
      </div>
    </Frame>
  );
}

/* ------------------------------- THRYVE ------------------------------- */
function ThryveMock() {
  const rows: [string, string, string][] = [
    ["Expand enterprise pipeline", "25%", "PENDING"],
    ["Cut onboarding time 20%", "20%", "APPROVED"],
    ["Ship Q3 analytics suite", "20%", "PENDING"],
    ["Reduce support backlog", "15%", "APPROVED"],
    ["Mentor two juniors", "20%", "IN REVIEW"],
  ];
  return (
    <Frame title="thryve / approvals" right="Q3 · 4 PENDING">
      <div className="flex h-full">
        <div className="flex-1 px-[14px] py-[10px]">
          <div className="flex items-center justify-between">
            <Label>Goal approval queue</Label>
            <span className="font-mono text-[7px] text-[#c6ff00]">WEIGHT CAP 100%</span>
          </div>
          <div className="mt-[7px] grid grid-cols-[1fr_50px_66px] border-b border-white/[0.08] pb-[4px] font-mono text-[6.5px] tracking-[0.08em] text-white/30">
            <span>GOAL</span>
            <span>WEIGHT</span>
            <span className="text-right">STATUS</span>
          </div>
          {rows.map(([g, w, s]) => (
            <div key={g} className="grid h-[30px] grid-cols-[1fr_50px_66px] items-center border-b border-white/[0.05] text-[8.5px] text-white/70">
              <span className="truncate">{g}</span>
              <span className="font-mono text-[7.5px] text-white/45">{w}</span>
              <span className="flex justify-end">
                <span className={`rounded-[3px] border px-[5px] py-[2px] font-mono text-[6px] tracking-[0.05em] ${s === "APPROVED" ? "border-[#c6ff00]/50 text-[#c6ff00]" : s === "PENDING" ? "border-white/20 text-white/60" : "border-[#7d93ff]/60 text-[#9ab4ff]"}`}>
                  {s}
                </span>
              </span>
            </div>
          ))}
        </div>
        <div className="w-[172px] shrink-0 border-l border-white/[0.08] px-[12px] py-[10px]">
          <Label>Org analytics</Label>
          <div className="mt-[4px] flex items-baseline gap-[7px]">
            <span className="text-[26px] leading-none font-light text-white">78%</span>
            <span className="font-mono text-[7px] text-[#c6ff00]">ON TRACK</span>
          </div>
          <div className="mt-[9px] space-y-[5px]">
            {[
              ["Engineering", "84%"],
              ["Product", "72%"],
              ["Operations", "66%"],
            ].map(([d, v]) => (
              <div key={d} className="flex items-center gap-[6px]">
                <span className="w-[58px] text-[7.5px] text-white/55">{d}</span>
                <span className="h-[4px] flex-1 rounded-full bg-white/[0.07]">
                  <span className="block h-full rounded-full bg-[#7d93ff]" style={{ width: v }} />
                </span>
              </div>
            ))}
          </div>
          <div className="mt-[10px] rounded-[4px] border border-white/[0.1] bg-white/[0.03] p-[7px]">
            <p className="font-mono text-[6.5px] tracking-[0.06em] text-white/35">AUDIT LOG</p>
            <p className="mt-[4px] font-mono text-[6.5px] leading-[1.7] text-white/55">CREATED · UPDATED<br />APPROVED · UNLOCKED</p>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ------------------------------ UNISPHERE ------------------------------ */
function UnisphereMock() {
  const colleges: [string, string, string, string][] = [
    ["IIT Delhi", "₹2.2L", "₹25.0L", "4.7"],
    ["NIT Trichy", "₹1.6L", "₹18.2L", "4.5"],
    ["IIIT Hyderabad", "₹3.1L", "₹32.0L", "4.8"],
  ];
  return (
    <Frame title="unisphere / compare" right="3 COLLEGES">
      <div className="px-[14px] py-[10px]">
        <div className="flex items-center justify-between">
          <Label>Side-by-side comparison</Label>
          <span className="font-mono text-[7px] text-[#c6ff00]">BEST VALUE HIGHLIGHTED</span>
        </div>
        <div className="mt-[8px] grid grid-cols-[1fr_1fr_1fr] gap-[6px]">
          {colleges.map(([name, fees, pkg, rating], i) => (
            <div key={name} className={`rounded-[4px] border p-[8px] ${i === 2 ? "border-[#c6ff00]/50 bg-[#c6ff00]/[0.05]" : "border-white/[0.09] bg-white/[0.02]"}`}>
              <p className="text-[9.5px] text-white">{name}</p>
              <p className="mt-[2px] font-mono text-[6.5px] text-white/35">{i === 0 ? "IIT · NEW DELHI" : i === 1 ? "NIT · TAMIL NADU" : "IIIT · TELANGANA"}</p>
              <div className="mt-[7px] space-y-[4px]">
                <div className="flex justify-between font-mono text-[7px] text-white/45"><span>FEES</span><span className="text-white/75">{fees}</span></div>
                <div className="flex justify-between font-mono text-[7px] text-white/45"><span>AVG PKG</span><span style={{ color: i === 2 ? "#c6ff00" : "rgba(255,255,255,0.75)" }}>{pkg}</span></div>
                <div className="flex justify-between font-mono text-[7px] text-white/45"><span>RATING</span><span style={{ color: i === 2 ? "#c6ff00" : "rgba(255,255,255,0.75)" }}>{rating}</span></div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-[10px] grid grid-cols-[1.2fr_1fr] gap-[8px]">
          <div className="rounded-[4px] border border-white/[0.08] bg-white/[0.02] p-[8px]">
            <p className="font-mono text-[6.5px] tracking-[0.07em] text-white/35">PREDICTOR · JEE ADVANCED</p>
            <p className="mt-[4px] text-[9px] text-white/75">Rank 1,240 → 6 matched courses</p>
            <p className="mt-[2px] font-mono text-[6.5px] text-[#c6ff00]">CLOSEST CLOSING RANK FIRST</p>
          </div>
          <div className="rounded-[4px] border border-white/[0.08] bg-white/[0.02] p-[8px]">
            <p className="font-mono text-[6.5px] tracking-[0.07em] text-white/35">DATASET</p>
            <p className="mt-[4px] font-mono text-[7px] leading-[1.7] text-white/60">177 COLLEGES<br />1,239 COURSES · 531 REVIEWS</p>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ----------------------------- Unbiased AI ----------------------------- */
function UnbiasedMock() {
  const metrics: [string, string][] = [
    ["DEMOGRAPHIC PARITY", "0.04"],
    ["EQUALIZED ODDS", "0.07"],
    ["DISPARATE IMPACT", "0.91"],
    ["CALIBRATION", "0.96"],
  ];
  return (
    <Frame title="unbiased-ai / fairness" right="AUDIT · LIVE">
      <div className="flex h-full">
        <div className="flex-1 border-r border-white/[0.08] px-[14px] py-[10px]">
          <Label>Fairness metrics</Label>
          <div className="mt-[7px] grid grid-cols-2 gap-[5px]">
            {metrics.map(([k, v]) => (
              <div key={k} className="rounded-[4px] border border-white/[0.08] bg-white/[0.02] px-[7px] py-[6px]">
                <p className="font-mono text-[6px] tracking-[0.06em] text-white/35">{k}</p>
                <p className="mt-[3px] font-mono text-[11px] text-[#c6ff00]">{v}</p>
              </div>
            ))}
          </div>
          <Label>Subgroup heatmap</Label>
          <div className="mt-[6px] grid grid-cols-12 gap-[2px]">
            {Array.from({ length: 48 }, (_, i) => (
              <span key={i} className="block h-[12px] rounded-[1px]" style={{ background: heat(rnd(i + 11)) }} />
            ))}
          </div>
        </div>
        <div className="w-[176px] shrink-0 px-[12px] py-[10px]">
          <Label>Model registry</Label>
          <div className="mt-[6px] space-y-[4px]">
            {[
              ["credit-v4", "FAIR"],
              ["hiring-v2", "REVIEW"],
              ["claims-v7", "FAIR"],
            ].map(([m, s]) => (
              <div key={m} className="flex items-center justify-between rounded-[3px] border border-white/[0.08] px-[7px] py-[4px] text-[8px] text-white/65">
                <span className="font-mono">{m}</span>
                <span className="font-mono text-[6.5px]" style={{ color: s === "FAIR" ? "#c6ff00" : "#ffd27d" }}>{s}</span>
              </div>
            ))}
          </div>
          <div className="mt-[10px] rounded-[4px] border border-[#c6ff00]/35 bg-[#c6ff00]/[0.05] p-[7px]">
            <p className="font-mono text-[6.5px] text-[#c6ff00]">POLICY THRESHOLD</p>
            <p className="mt-[3px] text-[8px] text-white/75">DP gap &lt; 0.05 · pass</p>
          </div>
          <p className="mt-[9px] font-mono text-[6.5px] leading-[1.7] text-white/35">SHAP · PROXY VARIABLES<br />EU AI ACT EXPORTS</p>
        </div>
      </div>
    </Frame>
  );
}

/* ------------------------------- Echona ------------------------------- */
function EchonaMock() {
  const wave = Array.from({ length: 34 }, (_, i) => 8 + Math.abs(Math.sin(i * 0.8)) * 30);
  return (
    <Frame title="echona / mood session" right="FACE + VOICE + TEXT">
      <div className="flex h-full">
        <div className="flex-1 border-r border-white/[0.08] px-[14px] py-[10px]">
          <Label>Voice signal · live</Label>
          <div className="mt-[8px] flex h-[58px] items-center gap-[2px]">
            {wave.map((h, i) => (
              <span key={i} className="flex-1 rounded-full" style={{ height: h, background: i % 5 === 0 ? "#c6ff00" : "#7d93ff", opacity: 0.85 }} />
            ))}
          </div>
          <Label>Fused emotion</Label>
          <div className="mt-[7px] space-y-[6px]">
            {[
              ["Calm", 0.72],
              ["Joy", 0.54],
              ["Stress", 0.21],
            ].map(([k, v], i) => (
              <div key={String(k)} className="flex items-center gap-[7px]">
                <span className="w-[44px] text-[8px] text-white/60">{k}</span>
                <span className="h-[5px] flex-1 rounded-full bg-white/[0.07]">
                  <span className="block h-full rounded-full" style={{ width: `${Number(v) * 100}%`, background: i === 0 ? "#c6ff00" : i === 1 ? "#7fe3ff" : "#ff9f86" }} />
                </span>
                <span className="w-[24px] text-right font-mono text-[7px] text-white/45">{Number(v).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="w-[190px] shrink-0 px-[12px] py-[10px]">
          <Label>Recommendation · calm</Label>
          <div className="mt-[6px] space-y-[4px]">
            {[
              ["Weightless", "Marconi Union"],
              ["Sunset Lover", "Petit Biscuit"],
              ["Bloom", "The Paper Kites"],
            ].map(([t, a], i) => (
              <div key={t} className="flex items-center gap-[6px] rounded-[3px] border border-white/[0.07] px-[6px] py-[5px]">
                <span className="flex h-[14px] w-[14px] items-center justify-center rounded-full border border-[#c6ff00]/50 font-mono text-[6px] text-[#c6ff00]">{i + 1}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[8px] text-white/75">{t}</span>
                  <span className="block truncate font-mono text-[6px] text-white/35">{a}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-[9px] rounded-[4px] border border-white/[0.1] bg-white/[0.03] p-[7px]">
            <p className="font-mono text-[6.5px] tracking-[0.06em] text-white/35">FUSION</p>
            <p className="mt-[4px] font-mono text-[6.5px] leading-[1.7] text-white/55">CONFIDENCE + SOURCE<br />FOR EVERY PREDICTION</p>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ------------------------------- Saarthi ------------------------------- */
function SaarthiMock() {
  const needs: [string, string, string][] = [
    ["Drinking water · Zone 4", "CRITICAL", "#c6ff00"],
    ["Medical kits · Zone 2", "HIGH", "#7fe3ff"],
    ["Shelter beds · Zone 1", "HIGH", "#7fe3ff"],
    ["Food packets · Zone 3", "MEDIUM", "#ffffff"],
  ];
  return (
    <Frame title="saarthi / control room" right="12 NEEDS · 8 VOLUNTEERS">
      <div className="flex h-full">
        <div className="flex-1 border-r border-white/[0.08] px-[14px] py-[10px]">
          <div className="flex items-center justify-between">
            <Label>Open needs</Label>
            <span className="font-mono text-[7px] text-[#c6ff00]">SOCKET LIVE</span>
          </div>
          <div className="mt-[7px] space-y-[5px]">
            {needs.map(([n, u, c]) => (
              <div key={n} className="flex items-center justify-between rounded-[3px] border border-white/[0.08] bg-white/[0.02] px-[7px] py-[5px] text-[8.5px] text-white/70">
                {n}
                <span className="font-mono text-[6px]" style={{ color: c }}>{u}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="w-[184px] shrink-0 px-[12px] py-[10px]">
          <Label>AI match · confidence</Label>
          <div className="mt-[6px] rounded-[4px] border border-[#c6ff00]/40 bg-[#c6ff00]/[0.05] p-[8px]">
            <p className="text-[9px] text-white">Priya · Zone 4</p>
            <p className="mt-[3px] font-mono text-[7px] text-[#c6ff00]">0.93 · WATER + LOGISTICS</p>
            <p className="mt-[5px] text-[7.5px] leading-[1.5] text-white/55">Closest available volunteer with prior distribution experience.</p>
          </div>
          <div className="mt-[10px]">
            <Label>Zone pressure</Label>
            <div className="mt-[6px] flex gap-[3px]">
              {[72, 54, 38, 88, 46, 61, 33, 58].map((v, i) => (
                <span key={i} className="flex-1 rounded-[1px]" style={{ height: 30, background: v > 70 ? "#c6ff00" : v > 50 ? "#7fe3ff" : "rgba(255,255,255,0.18)", opacity: 0.85 }} />
              ))}
            </div>
          </div>
          <p className="mt-[9px] font-mono text-[6.5px] leading-[1.7] text-white/35">CONFIRM / REJECT MATCH<br />ALERTS · REPORTS · ANALYTICS</p>
        </div>
      </div>
    </Frame>
  );
}

const MOCKS: Record<string, () => ReactNode> = {
  nirixon: () => <NirixonMock />,
  resqsync: () => <ResQMock />,
  cognivia: () => <CogniviaMock />,
  taalmel: () => <TaalmelMock />,
  evision: () => <EvisionMock />,
  safepath: () => <SafePathMock />,
  pricing: () => <PricingMock />,
  cerevia: () => <CereviaMock />,
  locus: () => <LocusMock />,
  polarsync: () => <PolarsyncMock />,
  "taalmel-health": () => <TaalmelHealthMock />,
  vestiq: () => <VestiqMock />,
  thryve: () => <ThryveMock />,
  unisphere: () => <UnisphereMock />,
  unbiased: () => <UnbiasedMock />,
  echona: () => <EchonaMock />,
  saarthi: () => <SaarthiMock />,
};

/* deterministic per-repo randomness so every generated mock is different but stable */
const hashStr = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const LANG_TINT: Record<string, string> = { Python: "#7fe3ff", TypeScript: "#9ab4ff", JavaScript: "#c6ff00", Java: "#ffb37f", "C++": "#ff8fb1", HTML: "#ff9f7f", CSS: "#b48cff" };

/**
 * Auto panel for repos with no screenshot (4.4). Layout variant, palette and content all derive from the
 * repo name + language + topics + domain accent, so no two cards look alike. Shows only real data.
 */
function GenericMock({ project }: { project: Project }) {
  const h = hashStr(project.repo);
  const rnd = seeded(h);
  const variant = h % 3; // 0 editor · 1 terminal · 2 dashboard
  const tint = LANG_TINT[project.language ?? ""] ?? "#c6ff00";
  const angle = 120 + (h % 80);
  const words = [project.repo, ...(project.topics ?? []), project.language ?? "", project.status].filter(Boolean);

  const chrome = (label: string) => (
    <div className="flex h-[26px] shrink-0 items-center gap-[6px] border-b border-white/[0.08] px-[10px]">
      <i className="h-[7px] w-[7px] rounded-full bg-white/20" />
      <i className="h-[7px] w-[7px] rounded-full bg-white/20" />
      <i className="h-[7px] w-[7px] rounded-full bg-white/20" />
      <span className="ml-[10px] font-mono text-[8px] tracking-[0.08em] text-white/45">{label}</span>
      <span className="ml-auto font-mono text-[7.5px] tracking-[0.1em]" style={{ color: tint }}>
        {project.language ?? "—"}
      </span>
    </div>
  );
  const footer = (
    <div className="flex items-center justify-between border-t border-white/[0.06] px-[12px] py-[7px]">
      <span className="font-mono text-[7.5px] tracking-[0.1em] text-white/35">GITHUB · {project.status.toUpperCase()}</span>
      <span className="font-mono text-[7.5px] tracking-[0.1em]" style={{ color: tint }}>
        {project.auto ? "DETAILS COMING SOON" : "CASE STUDY"}
      </span>
    </div>
  );

  return (
    <div className="absolute inset-0 flex flex-col text-white" style={{ background: `linear-gradient(${angle}deg, ${project.accent} 0%, #05070f 74%)` }}>
      {variant === 0 && (
        <>
          {chrome(`${project.repo}/src`)}
          <div className="flex min-h-0 flex-1">
            <div className="w-[110px] shrink-0 border-r border-white/[0.06] p-[10px]">
              {["src", "tests", "docs", ...(project.topics ?? []).slice(0, 3)].map((f, i) => (
                <p key={i} className="truncate font-mono text-[7.5px] leading-[2]" style={{ color: i === 0 ? tint : "rgba(255,255,255,0.45)" }}>
                  {i < 3 ? "▸ " : "· "}
                  {f}
                </p>
              ))}
            </div>
            <div className="flex-1 overflow-hidden p-[12px]">
              {Array.from({ length: 11 }).map((_, i) => (
                <div key={i} className="flex items-center gap-[8px]" style={{ height: 15 }}>
                  <span className="w-[12px] text-right font-mono text-[7.5px] text-white/25">{i + 1}</span>
                  <span className="h-[5px] rounded-full" style={{ width: `${18 + rnd() * 62}%`, marginLeft: `${(i % 4) * 4}%`, background: i % 5 === 0 ? tint : "rgba(255,255,255,0.18)", opacity: i % 5 === 0 ? 0.8 : 1 }} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      {variant === 1 && (
        <>
          {chrome("terminal")}
          <div className="flex-1 overflow-hidden p-[12px] font-mono text-[8.5px] leading-[1.95]">
            <p style={{ color: tint }}>$ git clone {project.url.replace("https://", "")}</p>
            <p className="text-white/50">Cloning into &apos;{project.repo}&apos;…</p>
            {project.language && <p className="text-white/70">language: {project.language}</p>}
            {(project.topics ?? []).slice(0, 4).map((t) => (
              <p key={t} className="text-white/55">topic: {t}</p>
            ))}
            {project.subtitle && <p className="truncate text-white/70">› {project.subtitle}</p>}
            <p className="text-white/40">
              status: <span style={{ color: tint }}>{project.status}</span>
            </p>
            <p style={{ color: tint }}>
              $ <span className="inline-block h-[9px] w-[5px] translate-y-[1px]" style={{ background: tint }} />
            </p>
          </div>
        </>
      )}
      {variant === 2 && (
        <>
          {chrome("overview")}
          <div className="grid flex-1 grid-cols-[1.4fr_1fr] gap-[10px] overflow-hidden p-[12px]">
            <div className="flex items-end gap-[5px] border border-white/[0.06] p-[10px]">
              {Array.from({ length: 12 }).map((_, i) => (
                <span key={i} className="flex-1" style={{ height: `${20 + rnd() * 75}%`, background: i % 4 === 0 ? tint : "rgba(255,255,255,0.16)" }} />
              ))}
            </div>
            <div className="flex flex-col gap-[6px] overflow-hidden">
              {words.slice(0, 5).map((w, i) => (
                <span key={i} className="truncate border border-white/[0.07] px-[7px] py-[4px] font-mono text-[7.5px]" style={{ color: i === 0 ? tint : "rgba(255,255,255,0.6)" }}>
                  {w}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
      {footer}
    </div>
  );
}

export default function ProjectMedia({ project }: { project: Project }) {
  const src = projectShot(project.id);
  if (src) return <img src={src} alt={`${project.title} screenshot`} className="h-full w-full object-cover" loading="lazy" />;
  const Mock = project.mock ? MOCKS[project.mock] : undefined;
  return <ScaledMock>{Mock ? Mock() : <GenericMock project={project} />}</ScaledMock>;
}
