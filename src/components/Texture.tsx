const NOISE_URI =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='180' height='180' filter='url(#n)' opacity='0.55'/></svg>`,
  );

export function Noise({ opacity = 0.16, mix = "overlay" }: { opacity?: number; mix?: string }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{ backgroundImage: `url("${NOISE_URI}")`, opacity, mixBlendMode: mix as React.CSSProperties["mixBlendMode"] }}
    />
  );
}

export function Halftone({ size = 5, opacity = 0.22, color = "#ffffff" }: { size?: number; opacity?: number; color?: string }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: `radial-gradient(${color} 1px, transparent 1.2px)`,
        backgroundSize: `${size}px ${size}px`,
        opacity,
        maskImage: "radial-gradient(ellipse at 50% 45%, black 10%, transparent 72%)",
      }}
    />
  );
}

export function Scanlines({ opacity = 0.1 }: { opacity?: number }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: "repeating-linear-gradient(to bottom, rgba(255,255,255,0.5) 0 1px, transparent 1px 4px)",
        opacity,
      }}
    />
  );
}

/** Section heading furniture: index, rule, label */
export function SectionLabel({ index, label, align = "left" }: { index: string; label: string; align?: "left" | "right" }) {
  return (
    <div className={`flex items-center gap-3 ${align === "right" ? "justify-end" : ""}`}>
      <span className="mono" style={{ color: "var(--accent)" }}>
        {index}
      </span>
      <span className="h-[1px] w-10" style={{ background: "var(--fg-faint)" }} />
      <span className="mono opacity-70">{label}</span>
    </div>
  );
}
