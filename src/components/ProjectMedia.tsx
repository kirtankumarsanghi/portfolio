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

const MOCKS: Record<string, () => ReactNode> = {
  nirixon: () => <NirixonMock />,
  resqsync: () => <ResQMock />,
  cognivia: () => <CogniviaMock />,
  taalmel: () => <TaalmelMock />,
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
