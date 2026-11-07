import { useId, useMemo, type ReactNode } from "react";

/* Original die-cut sticker library (14 designs) — white 3px border, soft shadow, glossy highlight. */

const uid = (raw: string) => raw.replace(/[^a-zA-Z0-9]/g, "");

/* ---------- 1. pixelated, dithered red-pink heart ---------- */
const HEART = [
  "..###...###..",
  ".#####.#####.",
  "#############",
  "#############",
  "#############",
  ".###########.",
  "..#########..",
  "...#######...",
  "....#####....",
  ".....###.....",
  "......#......",
];
const BAYER = [
  [0, 2],
  [3, 1],
];
const TONES = ["#ff9ab3", "#ff4d79", "#d31f4e", "#8d0e32"];

export function HeartSticker({ className = "" }: { className?: string }) {
  const { cells, border } = useMemo(() => {
    const filled = (x: number, y: number) => HEART[y]?.[x] === "#";
    const cells: { x: number; y: number; c: string }[] = [];
    const border: { x: number; y: number }[] = [];
    for (let y = -1; y <= HEART.length; y++) {
      for (let x = -1; x <= HEART[0].length; x++) {
        if (filled(x, y)) {
          const base = (x / 12) * 0.34 + (y / 10) * 0.66;
          const v = Math.min(0.999, Math.max(0, base + (BAYER[((y % 2) + 2) % 2][((x % 2) + 2) % 2] / 4 - 0.375) * 0.36));
          const hi = (x === 2 && y === 1) || (x === 3 && y === 1) || (x === 1 && y === 2);
          cells.push({ x, y, c: hi ? "#ffffff" : TONES[Math.floor(v * 4)] });
        } else {
          let near = false;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (filled(x + dx, y + dy)) near = true;
          if (near) border.push({ x, y });
        }
      }
    }
    return { cells, border };
  }, []);
  return (
    <svg viewBox="-1 -1 15 13" className={className} shapeRendering="crispEdges" role="img" aria-label="Pixel heart sticker">
      {border.map((b) => (
        <rect key={`b${b.x}-${b.y}`} x={b.x} y={b.y} width="1.02" height="1.02" fill="#fff" />
      ))}
      {cells.map((c) => (
        <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width="1.02" height="1.02" fill={c.c} />
      ))}
    </svg>
  );
}

/* ---------- 2. smiley badge ---------- */
export function SmileySticker({ className = "" }: { className?: string }) {
  const id = uid(useId());
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Smiley badge sticker">
      <defs>
        <radialGradient id={`sm${id}`} cx="0.36" cy="0.3" r="0.85">
          <stop offset="0%" stopColor="#e6ff6a" />
          <stop offset="55%" stopColor="#c6ff00" />
          <stop offset="100%" stopColor="#8fba00" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="49" fill="#fff" />
      <circle cx="50" cy="50" r="44" fill={`url(#sm${id})`} stroke="#05060a" strokeWidth="2.2" />
      <ellipse cx="36" cy="42" rx="5.2" ry="8.4" fill="#05060a" />
      <ellipse cx="64" cy="42" rx="5.2" ry="8.4" fill="#05060a" />
      <path d="M27 58 Q50 82 73 58" fill="none" stroke="#05060a" strokeWidth="6" strokeLinecap="round" />
      <path d="M21 36 Q30 17 55 14" fill="none" stroke="#fff" strokeOpacity="0.75" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- 3. engraved coin / stamp with globe motif ---------- */
export function CoinSticker({ className = "" }: { className?: string }) {
  const id = uid(useId());
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label="Engraved globe coin sticker">
      <defs>
        <radialGradient id={`co${id}`} cx="0.32" cy="0.28" r="0.95">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="42%" stopColor="#d4dbff" />
          <stop offset="100%" stopColor="#7d90ea" />
        </radialGradient>
        <path id={`ring${id}`} d="M60 60 m-43 0 a43 43 0 1 1 86 0 a43 43 0 1 1 -86 0" />
      </defs>
      <circle cx="60" cy="60" r="59" fill="#fff" />
      <circle cx="60" cy="60" r="55" fill={`url(#co${id})`} stroke="#0b17a8" strokeWidth="1.4" />
      <circle cx="60" cy="60" r="51" fill="none" stroke="#0b17a8" strokeOpacity="0.55" strokeWidth="0.8" strokeDasharray="1.4 2.6" />
      <g className="spin-slow">
        <text fontFamily="JetBrains Mono, monospace" fontSize="8.2" fontWeight="700" fill="#fff" transform="translate(0.5 0.6)" textLength="268" lengthAdjust="spacing">
          <textPath href={`#ring${id}`}>KIRTAN KUMAR SANGHI · BACKEND · ML · </textPath>
        </text>
        <text fontFamily="JetBrains Mono, monospace" fontSize="8.2" fontWeight="700" fill="#0b17a8" textLength="268" lengthAdjust="spacing">
          <textPath href={`#ring${id}`}>KIRTAN KUMAR SANGHI · BACKEND · ML · </textPath>
        </text>
      </g>
      <circle cx="60" cy="60" r="29" fill="#e9edff" stroke="#0b17a8" strokeWidth="1.5" />
      <g fill="none" stroke="#0b17a8" strokeWidth="1.15">
        <circle cx="60" cy="60" r="22" />
        <ellipse cx="60" cy="60" rx="9" ry="22" />
        <ellipse cx="60" cy="60" rx="16" ry="22" />
        <path d="M38 60h44M60 38v44" />
        <ellipse cx="60" cy="60" rx="22" ry="8" />
        <path d="M42 48 Q60 53 78 48M42 72 Q60 67 78 72" opacity="0.7" />
      </g>
    </svg>
  );
}

/* ---------- 4. glossy blue 3D cursor arrow with soft glow ---------- */
export function ArrowSticker({ className = "" }: { className?: string }) {
  const id = uid(useId());
  return (
    <svg viewBox="0 0 110 126" className={className} role="img" aria-label="Glossy blue cursor arrow sticker">
      <defs>
        <linearGradient id={`ab${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a3b4ff" />
          <stop offset="34%" stopColor="#2038f0" />
          <stop offset="100%" stopColor="#050a55" />
        </linearGradient>
        <linearGradient id={`ag${id}`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="75%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g style={{ filter: "drop-shadow(0 0 16px rgba(90,120,255,0.9))" }}>
        <path
          d="M12 6 L96 61 L56 68 L74 110 L54 119 L36 76 L12 96 Z"
          fill={`url(#ab${id})`}
          stroke="#fff"
          strokeWidth="4.2"
          strokeLinejoin="round"
        />
        <path d="M20 22 L78 60 L50 65 Z" fill={`url(#ag${id})`} opacity="0.9" />
        <path d="M17 12 L17 84" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/* ---------- 5. lightning bolt ---------- */
export function BoltSticker({ className = "" }: { className?: string }) {
  const id = uid(useId());
  return (
    <svg viewBox="0 0 68 84" className={className} role="img" aria-label="Lightning bolt sticker">
      <defs>
        <linearGradient id={`bo${id}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#f2ffb0" />
          <stop offset="45%" stopColor="#c6ff00" />
          <stop offset="100%" stopColor="#7ea300" />
        </linearGradient>
      </defs>
      <path d="M42 4 L10 46 H28 L22 80 L58 34 H36 Z" fill="none" stroke="#fff" strokeWidth="7" strokeLinejoin="round" />
      <path d="M42 4 L10 46 H28 L22 80 L58 34 H36 Z" fill={`url(#bo${id})`} stroke="#05060a" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M38 10 L18 38 H29 Z" fill="#ffffff" opacity="0.6" />
    </svg>
  );
}

/* ---------- 6. yellow star ---------- */
export function StarSticker({ className = "" }: { className?: string }) {
  const id = uid(useId());
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Yellow star sticker">
      <defs>
        <linearGradient id={`st${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff4a8" />
          <stop offset="50%" stopColor="#ffd426" />
          <stop offset="100%" stopColor="#e08b00" />
        </linearGradient>
      </defs>
      <path
        d="M50 6 L62 34 L93 37 L70 57 L77 88 L50 72 L23 88 L30 57 L7 37 L38 34 Z"
        fill="none"
        stroke="#fff"
        strokeWidth="7"
        strokeLinejoin="round"
      />
      <path
        d="M50 6 L62 34 L93 37 L70 57 L77 88 L50 72 L23 88 L30 57 L7 37 L38 34 Z"
        fill={`url(#st${id})`}
        stroke="#05060a"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M49 14 L39 35 L18 37 Q34 27 49 14 Z" fill="#fff" opacity="0.65" />
    </svg>
  );
}

/* ---------- 7. 8-ball ---------- */
export function EightBallSticker({ className = "" }: { className?: string }) {
  const id = uid(useId());
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="8-ball sticker">
      <defs>
        <radialGradient id={`eb${id}`} cx="0.34" cy="0.28" r="0.75">
          <stop offset="0%" stopColor="#464b5e" />
          <stop offset="40%" stopColor="#14161e" />
          <stop offset="100%" stopColor="#040507" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="#fff" />
      <circle cx="50" cy="50" r="44" fill={`url(#eb${id})`} />
      <circle cx="54" cy="48" r="19" fill="#f7f7f2" stroke="#05060a" strokeWidth="1.6" />
      <text x="54" y="56" textAnchor="middle" fontFamily="Familjen Grotesk, Arial, sans-serif" fontWeight="700" fontSize="24" fill="#05060a">
        8
      </text>
      <ellipse cx="32" cy="24" rx="14" ry="7" transform="rotate(-28 32 24)" fill="#fff" opacity="0.55" />
    </svg>
  );
}

/* ---------- 8. green graffiti scribble ---------- */
export function GraffitiSticker({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 86" className={className} role="img" aria-label="Green graffiti scribble sticker">
      <path
        d="M12 62 C22 14, 48 14, 38 60 C30 82, 62 16, 68 54 C72 76, 92 18, 98 48 C102 68, 108 38, 110 26"
        fill="none"
        stroke="#fff"
        strokeWidth="19"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 62 C22 14, 48 14, 38 60 C30 82, 62 16, 68 54 C72 76, 92 18, 98 48 C102 68, 108 38, 110 26"
        fill="none"
        stroke="#05060a"
        strokeWidth="13"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 62 C22 14, 48 14, 38 60 C30 82, 62 16, 68 54 C72 76, 92 18, 98 48 C102 68, 108 38, 110 26"
        fill="none"
        stroke="#4dff6b"
        strokeWidth="8.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="108" cy="68" r="5" fill="#4dff6b" stroke="#fff" strokeWidth="2.5" />
    </svg>
  );
}

/* ---------- 9. pink outlined "2026" tag ---------- */
export function Tag2026Sticker({ className = "" }: { className?: string }) {
  const id = uid(useId());
  return (
    <svg viewBox="0 0 128 64" className={className} role="img" aria-label="2026 tag sticker">
      <defs>
        <linearGradient id={`tg${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff9bd9" />
          <stop offset="55%" stopColor="#ff2fb3" />
          <stop offset="100%" stopColor="#a8006b" />
        </linearGradient>
      </defs>
      <rect x="3" y="5" width="122" height="54" rx="27" fill="#fff" />
      <rect x="7" y="9" width="114" height="46" rx="23" fill={`url(#tg${id})`} stroke="#05060a" strokeWidth="2.4" />
      <path d="M22 16 H96" stroke="#fff" strokeOpacity="0.55" strokeWidth="3.5" strokeLinecap="round" />
      <text
        x="64"
        y="41"
        textAnchor="middle"
        fontFamily="Unbounded Variable, Familjen Grotesk, sans-serif"
        fontWeight="800"
        fontSize="24"
        fill="#fff"
        stroke="#05060a"
        strokeWidth="1.6"
      >
        2026
      </text>
    </svg>
  );
}

/* ---------- 10. pen nib ---------- */
export function PenNibSticker({ className = "" }: { className?: string }) {
  const id = uid(useId());
  return (
    <svg viewBox="0 0 92 108" className={className} role="img" aria-label="Pen nib sticker">
      <defs>
        <linearGradient id={`pn${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="48%" stopColor="#b8c7ff" />
          <stop offset="100%" stopColor="#3552d4" />
        </linearGradient>
      </defs>
      <path d="M46 6 L82 54 L66 86 H26 L10 54 Z" fill="none" stroke="#fff" strokeWidth="7" strokeLinejoin="round" />
      <path d="M46 6 L82 54 L66 86 H26 L10 54 Z" fill={`url(#pn${id})`} stroke="#05060a" strokeWidth="2.4" strokeLinejoin="round" />
      <line x1="46" y1="7" x2="46" y2="48" stroke="#05060a" strokeWidth="2.6" />
      <circle cx="46" cy="52" r="6.5" fill="#05060a" />
      <rect x="24" y="86" width="44" height="14" rx="3" fill="#0b17a8" stroke="#fff" strokeWidth="3" />
    </svg>
  );
}

/* ---------- 11. cassette ---------- */
export function CassetteSticker({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 124 84" className={className} role="img" aria-label="Cassette tape sticker">
      <rect x="2" y="2" width="120" height="80" rx="11" fill="#fff" />
      <rect x="6" y="6" width="112" height="72" rx="8" fill="#182038" stroke="#05060a" strokeWidth="2.2" />
      <rect x="14" y="14" width="96" height="40" rx="4" fill="#ff5ea8" stroke="#05060a" strokeWidth="1.8" />
      <rect x="24" y="24" width="76" height="22" rx="11" fill="#0e1322" />
      <circle cx="42" cy="35" r="7" fill="#fff" />
      <circle cx="42" cy="35" r="3" fill="#0e1322" />
      <circle cx="82" cy="35" r="7" fill="#fff" />
      <circle cx="82" cy="35" r="3" fill="#0e1322" />
      <rect x="53" y="29" width="18" height="12" fill="#c6ff00" />
      <path d="M24 76 L32 60 H92 L100 76 Z" fill="#2c3658" stroke="#05060a" strokeWidth="1.8" />
    </svg>
  );
}

/* ---------- 12. flower ---------- */
export function FlowerSticker({ className = "" }: { className?: string }) {
  const petals = [0, 60, 120, 180, 240, 300];
  return (
    <svg viewBox="0 0 104 104" className={className} role="img" aria-label="Flower sticker">
      <g transform="translate(52 52)">
        {petals.map((a) => (
          <ellipse key={`b${a}`} transform={`rotate(${a}) translate(0 -24)`} rx="17" ry="21" fill="#fff" />
        ))}
        {petals.map((a) => (
          <ellipse key={a} transform={`rotate(${a}) translate(0 -24)`} rx="13.5" ry="17.5" fill="#ff7ad9" stroke="#05060a" strokeWidth="2" />
        ))}
        <circle r="16" fill="#ffd426" stroke="#05060a" strokeWidth="2.2" />
        <circle cx="-5" cy="-3" r="2.2" fill="#05060a" />
        <circle cx="5" cy="-3" r="2.2" fill="#05060a" />
        <path d="M-6 4 Q0 10 6 4" fill="none" stroke="#05060a" strokeWidth="2.2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/* ---------- 13. dice ---------- */
export function DiceSticker({ className = "" }: { className?: string }) {
  const pips: [number, number][] = [
    [28, 28],
    [50, 50],
    [72, 72],
    [72, 28],
    [28, 72],
  ];
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Dice sticker">
      <rect x="6" y="6" width="88" height="88" rx="20" fill="#fff" />
      <rect x="10" y="10" width="80" height="80" rx="16" fill="#f6f7ff" stroke="#05060a" strokeWidth="2.6" />
      <path d="M22 16 H74" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      {pips.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="7.2" fill={i === 1 ? "#ff2f7b" : "#0b17a8"} />
      ))}
    </svg>
  );
}

/* ---------- 14. "OK" hand ---------- */
export function OkHandSticker({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 104 112" className={className} role="img" aria-label="OK hand sticker">
      <g stroke="#fff" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" fill="none">
        <path d="M54 46 V16 A7 7 0 0 1 68 16 V46" />
        <path d="M68 46 V20 A7 7 0 0 1 82 20 V52" />
        <path d="M82 50 V28 A6.5 6.5 0 0 1 95 28 V66 C95 88 78 102 54 102 C30 102 16 86 16 66 C16 46 32 38 46 46 Z" />
      </g>
      <path
        d="M54 46 V16 A7 7 0 0 1 68 16 V46 M68 46 V20 A7 7 0 0 1 82 20 V52 M82 50 V28 A6.5 6.5 0 0 1 95 28 V66 C95 88 78 102 54 102 C30 102 16 86 16 66 C16 46 32 38 46 46 Z"
        fill="#ffd86b"
        stroke="#05060a"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <circle cx="38" cy="58" r="10" fill="#0b17a8" stroke="#05060a" strokeWidth="2.4" />
    </svg>
  );
}

/* ---------- dithered halftone blobs (background accent) ---------- */
export function HalftoneBlob({ variant = "a", className = "" }: { variant?: "a" | "b"; className?: string }) {
  const dots = useMemo(() => {
    const blobs: [number, number, number][] =
      variant === "a"
        ? [
            [62, 72, 44],
            [100, 92, 34],
            [86, 54, 24],
          ]
        : [
            [74, 80, 40],
            [104, 62, 28],
            [58, 100, 22],
          ];
    const out: { x: number; y: number; r: number }[] = [];
    for (let j = 0; j < 20; j++) {
      for (let i = 0; i < 20; i++) {
        const x = i * 8 + (j % 2) * 4 + 4;
        const y = j * 8 + 4;
        let f = 0;
        for (const [cx, cy, r] of blobs) {
          const d = Math.hypot(x - cx, y - cy) / r;
          f += Math.exp(-d * d * 1.5);
        }
        const rr = Math.min(4.4, Math.max(0, (f - 0.2) * 7.2));
        if (rr > 0.5) out.push({ x, y, r: rr });
      }
    }
    return out;
  }, [variant]);
  const fill = variant === "a" ? "#ffffff" : "#9db0ff";
  return (
    <svg viewBox="0 0 160 160" className={className} aria-hidden="true">
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={fill} />
      ))}
    </svg>
  );
}

/* ---------- tiny lime pixel square ---------- */
export function PixelSquare({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 10 10" className={className} shapeRendering="crispEdges" aria-hidden="true">
      <rect width="10" height="10" fill="#c6ff00" />
      <rect width="4" height="2" fill="#efff9a" />
      <rect y="8" width="10" height="2" fill="#8fba00" />
      <rect x="8" width="2" height="10" fill="#a5d400" />
    </svg>
  );
}

/** Pool of 14 die-cut stickers used when clicking in the hero. */
export const SPAWN_POOL: { kind: string; size: number; render: () => ReactNode }[] = [
  { kind: "star", size: 96, render: () => <StarSticker className="w-full" /> },
  { kind: "8ball", size: 94, render: () => <EightBallSticker className="w-full" /> },
  { kind: "graffiti", size: 112, render: () => <GraffitiSticker className="w-full" /> },
  { kind: "tag2026", size: 118, render: () => <Tag2026Sticker className="w-full" /> },
  { kind: "pennib", size: 88, render: () => <PenNibSticker className="w-full" /> },
  { kind: "smiley", size: 92, render: () => <SmileySticker className="w-full" /> },
  { kind: "heart", size: 94, render: () => <HeartSticker className="w-full" /> },
  { kind: "bolt", size: 82, render: () => <BoltSticker className="w-full" /> },
  { kind: "coin", size: 108, render: () => <CoinSticker className="w-full" /> },
  { kind: "arrow", size: 92, render: () => <ArrowSticker className="w-full" /> },
  { kind: "cassette", size: 112, render: () => <CassetteSticker className="w-full" /> },
  { kind: "flower", size: 96, render: () => <FlowerSticker className="w-full" /> },
  { kind: "dice", size: 90, render: () => <DiceSticker className="w-full" /> },
  { kind: "okhand", size: 94, render: () => <OkHandSticker className="w-full" /> },
];
