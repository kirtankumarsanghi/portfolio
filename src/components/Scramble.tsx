import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/lib/app-context";

/**
 * Scramble decode matching curiositywen.design (module 71358):
 * Two-stage lime scramble wave (#c0fe04 -> #DFFF81 -> finalColor) at 40ms cadence.
 */

export const SCRAMBLE_GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*+-=?/<>[]{}";

const STAGE_COLORS_DARK: [string, string] = ["#c0fe04", "#DFFF81"];

export type ScrambleHandle = { kill: () => void };

export function runScramble(
  chars: HTMLElement[],
  final: string[],
  opts: { dur?: number; finalColor?: string; scrambleColor?: string; stage2Color?: string } = {},
): ScrambleHandle {
  const {
    dur = 1.4,
    finalColor = "#ffffff",
    scrambleColor = STAGE_COLORS_DARK[0],
    stage2Color = STAGE_COLORS_DARK[1],
  } = opts;
  const t0 = performance.now();

  const paint = (p: number) => {
    const total = final.length;
    const head = p * (total + 4);
    chars.forEach((el, i) => {
      if (!el || final[i] === " ") return;
      const delta = head - i;
      if (delta <= 0) {
        el.textContent = SCRAMBLE_GLYPHS[(Math.random() * SCRAMBLE_GLYPHS.length) | 0];
        el.style.color = scrambleColor;
      } else if (delta < 2.2) {
        el.textContent = SCRAMBLE_GLYPHS[(Math.random() * SCRAMBLE_GLYPHS.length) | 0];
        el.style.color = scrambleColor;
      } else if (delta < 4.2) {
        el.textContent = SCRAMBLE_GLYPHS[(Math.random() * SCRAMBLE_GLYPHS.length) | 0];
        el.style.color = stage2Color;
      } else {
        el.textContent = final[i];
        el.style.color = finalColor;
      }
    });
  };

  paint(0);

  const timer = window.setInterval(() => {
    const p = Math.min(1, (performance.now() - t0) / (dur * 1000));
    if (p < 1) {
      paint(p);
    } else {
      window.clearInterval(timer);
      chars.forEach((el, i) => {
        if (!el) return;
        el.textContent = final[i] === " " ? "\u00A0" : final[i];
        el.style.color = finalColor;
      });
    }
  }, 40);

  return {
    kill() {
      window.clearInterval(timer);
    },
  };
}

/** Lock each character span's width to its final glyph width so scrambling never shifts layout. */
export function lockCharWidths(chars: HTMLElement[], final: string[]) {
  chars.forEach((el, i) => {
    if (!el) return;
    el.style.width = "";
    el.textContent = final[i] === " " ? "\u00A0" : final[i];
  });
  const widths = chars.map((el) => (el ? el.getBoundingClientRect().width : 0));
  chars.forEach((el, i) => {
    if (!el || final[i] === " ") return;
    if (widths[i] > 0) el.style.width = `${widths[i].toFixed(2)}px`;
  });
}

export function ScrambleText({
  text,
  playKey = 0,
  hover = false,
  dur = 1.1,
  finalColor = "#ffffff",
  className = "",
}: {
  text: string;
  playKey?: number;
  hover?: boolean;
  dur?: number;
  finalColor?: string;
  className?: string;
}) {
  const { reduced } = useApp();
  const spans = useRef<HTMLSpanElement[]>([]);
  const handle = useRef<ScrambleHandle | null>(null);
  const final = [...text];

  useLayoutEffect(() => {
    lockCharWidths(spans.current, final);
    const onResize = () => lockCharWidths(spans.current, final);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const trigger = useCallback(() => {
    handle.current?.kill();
    if (reduced) {
      spans.current.forEach((el, i) => {
        if (!el) return;
        el.textContent = final[i] === " " ? "\u00A0" : final[i];
        el.style.color = finalColor;
      });
      return;
    }
    lockCharWidths(spans.current, final);
    handle.current = runScramble(spans.current, final, { dur, finalColor });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, dur, finalColor, reduced]);

  useEffect(() => {
    if (playKey > 0) trigger();
  }, [playKey, trigger]);

  useEffect(
    () => () => {
      handle.current?.kill();
    },
    [],
  );

  return (
    <span className={`select-none ${className}`} onPointerEnter={hover ? trigger : undefined} aria-label={text}>
      {final.map((ch, i) => (
        <span
          key={i}
          ref={(el) => {
            if (el) spans.current[i] = el;
          }}
          data-sc
          className="inline-block text-center"
          style={{ color: finalColor }}
          aria-hidden="true"
        >
          {ch === " " ? "\u00A0" : ch}
        </span>
      ))}
    </span>
  );
}

/**
 * Exact replica of curiositywen.design's `ScrambleReveal` (module 71358):
 * Progressive character-by-character reveal with 2-stage lime scramble (#c0fe04 -> #DFFF81 -> settled).
 */
const activeSubscribers = new Set<(now: number) => void>();
let sharedInterval: number | null = null;

function randomGlyph() {
  return SCRAMBLE_GLYPHS[(Math.random() * SCRAMBLE_GLYPHS.length) | 0];
}

export function ScrambleReveal({
  text,
  className = "",
  style,
  startDelayMs = 300,
  letterDelayMs = 80,
  active = true,
}: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  startDelayMs?: number;
  letterDelayMs?: number;
  active?: boolean;
}) {
  const { reduced } = useApp();
  const [now, setNow] = useState(0);
  const [settled, setSettled] = useState(false);
  const startTimeRef = useRef(0);
  const startedRef = useRef(false);

  const chars = useMemo(() => text.split(""), [text]);
  const totalChars = chars.length;
  const stageDuration = 2 * letterDelayMs;
  const scrambleWindow = 2 * stageDuration;
  const totalDuration = startDelayMs + (totalChars > 0 ? (totalChars - 1) * letterDelayMs : 0) + scrambleWindow;

  useEffect(() => {
    if (reduced) {
      setSettled(true);
      return;
    }
    if (settled || !active || startedRef.current) return;
    startedRef.current = true;
    startTimeRef.current = performance.now();
    setNow(startTimeRef.current);

    const tick = (t: number) => {
      setNow(t);
      if (t - startTimeRef.current >= totalDuration) {
        setSettled(true);
        activeSubscribers.delete(tick);
        if (activeSubscribers.size === 0 && sharedInterval !== null) {
          window.clearInterval(sharedInterval);
          sharedInterval = null;
        }
      }
    };

    activeSubscribers.add(tick);
    if (sharedInterval === null) {
      sharedInterval = window.setInterval(() => {
        const t = performance.now();
        for (const fn of activeSubscribers) fn(t);
      }, 40);
    }

    return () => {
      activeSubscribers.delete(tick);
      if (activeSubscribers.size === 0 && sharedInterval !== null) {
        window.clearInterval(sharedInterval);
        sharedInterval = null;
      }
    };
  }, [active, reduced, settled, totalDuration]);

  if (settled || reduced) {
    return (
      <span className={className} style={style}>
        {text}
      </span>
    );
  }

  const elapsed = Math.max(0, now - (startTimeRef.current + startDelayMs));
  const hasStarted = active && now >= startTimeRef.current + startDelayMs;

  if (!hasStarted) {
    return (
      <span className={className} style={{ ...style, opacity: 0 }}>
        {text}
      </span>
    );
  }

  return (
    <span className={className} style={style}>
      {chars.map((ch, idx) => {
        if (ch === "\n") return <br key={idx} />;
        if (ch === " ") return <span key={idx}> </span>;
        const charStart = idx * letterDelayMs;
        const charEnd = charStart + scrambleWindow;
        if (elapsed < charStart) {
          return (
            <span key={idx} style={{ opacity: 0 }}>
              {ch}
            </span>
          );
        }
        if (elapsed < charEnd) {
          const stage = Math.min(1, Math.floor((elapsed - charStart) / stageDuration));
          const col = STAGE_COLORS_DARK[stage];
          return (
            <span key={idx} style={{ color: col }}>
              {randomGlyph()}
            </span>
          );
        }
        return <span key={idx}>{ch}</span>;
      })}
    </span>
  );
}
