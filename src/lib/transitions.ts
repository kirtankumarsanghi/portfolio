import { gsap } from "gsap";

/**
 * TransitionManager — one shared pixel-grid wipe canvas and one easing vocabulary for every transition.
 *
 *   EASE.in   expo.out      (things arriving)
 *   EASE.wipe power3.inOut  (wipes / covers)
 *   durations 0.9–1.4s
 *
 * Pixel-grid wipe: cells (28px desktop / 20px mobile) each carry a threshold = position bias + noise.
 * At progress p:  cover  → cells with t < p are filled with the colour
 *                 reveal → cells with t > p stay filled (the screen is "eaten" away)
 *                 edge   → only the moving lime band is drawn (no fill)
 * Cells within 0.03 of p flash lime #c6ff00 — the 1-cell edge flash shared by every transition.
 *
 * Scroll-scrubbed transitions call draw() directly; one-shot transitions use play().
 * Ownership: whoever drew last owns the canvas; clear(owner) only clears if you still own it.
 */

export const EASE = { in: "expo.out", wipe: "power3.inOut", out: "power3.in" } as const;
export const LIME = "#c6ff00";

export type WipeDir = "up" | "down" | "radial" | "radial-bottom";
export type WipeMode = "cover" | "reveal" | "edge";

type Cell = { x: number; y: number; t: number };

class PixelWipe {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private cell = 28;
  private w = 0;
  private h = 0;
  private cache = new Map<WipeDir, Cell[]>();
  private noise: number[] = [];
  owner: string | null = null;

  attach(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.resize();
  }

  detach() {
    this.canvas = null;
    this.ctx = null;
  }

  resize() {
    const c = this.canvas;
    if (!c) return;
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.cell = this.w < 768 ? 20 : 28;
    c.width = this.w;
    c.height = this.h;
    this.cache.clear();
    const n = Math.ceil(this.w / this.cell) * Math.ceil(this.h / this.cell);
    this.noise = Array.from({ length: n }, () => Math.random());
  }

  private cells(dir: WipeDir): Cell[] {
    const hit = this.cache.get(dir);
    if (hit) return hit;
    const out: Cell[] = [];
    const cols = Math.ceil(this.w / this.cell);
    const rows = Math.ceil(this.h / this.cell);
    const maxR = Math.hypot(this.w / 2, this.h);
    let k = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * this.cell;
        const y = r * this.cell;
        const cx = x + this.cell / 2;
        const cy = y + this.cell / 2;
        let bias: number;
        if (dir === "up") bias = 1 - cy / this.h;
        else if (dir === "down") bias = cy / this.h;
        else if (dir === "radial") bias = Math.hypot(cx - this.w / 2, cy - this.h / 2) / Math.hypot(this.w / 2, this.h / 2);
        else bias = Math.hypot(cx - this.w / 2, cy - this.h) / maxR;
        // mostly positional, partly random → a stepped, organic edge rather than a straight line
        out.push({ x, y, t: Math.min(1, Math.max(0, bias * 0.82 + this.noise[k++] * 0.18)) });
      }
    }
    this.cache.set(dir, out);
    return out;
  }

  draw(owner: string, p: number, opts: { color?: string; dir?: WipeDir; mode?: WipeMode; alpha?: number } = {}) {
    const ctx = this.ctx;
    if (!ctx) return;
    this.owner = owner;
    const { color = "#0b0c0d", dir = "up", mode = "cover", alpha = 1 } = opts;
    const cell = this.cell;
    const band = 0.03;
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.globalAlpha = alpha;
    const cells = this.cells(dir);
    // fill pass
    if (mode !== "edge") {
      ctx.fillStyle = color;
      for (let i = 0; i < cells.length; i++) {
        const d = cells[i].t - p;
        if (mode === "cover" ? d < 0 : d > band) ctx.fillRect(cells[i].x, cells[i].y, cell, cell);
      }
    }
    // lime edge-flash pass
    ctx.fillStyle = LIME;
    for (let i = 0; i < cells.length; i++) {
      const d = cells[i].t - p;
      const flash = mode === "cover" ? d >= 0 && d < band : mode === "reveal" ? d > 0 && d <= band : Math.abs(d) < band;
      if (flash) ctx.fillRect(cells[i].x, cells[i].y, cell, cell);
    }
    ctx.globalAlpha = 1;
  }

  clear(owner?: string) {
    if (owner && this.owner !== owner) return;
    this.ctx?.clearRect(0, 0, this.w, this.h);
    this.owner = null;
  }

  /** one-shot timeline, resolves on completion */
  play(owner: string, opts: { from?: number; to?: number; duration?: number; ease?: string; color?: string; dir?: WipeDir; mode?: WipeMode; clearAtEnd?: boolean } = {}) {
    const { from = 0, to = 1, duration = 1, ease = EASE.wipe, clearAtEnd = false, ...draw } = opts;
    const state = { p: from };
    return new Promise<void>((resolve) => {
      if (!this.ctx) return resolve();
      gsap.to(state, {
        p: to,
        duration,
        ease,
        onUpdate: () => this.draw(owner, state.p, draw),
        onComplete: () => {
          if (clearAtEnd) this.clear(owner);
          resolve();
        },
      });
    });
  }
}

export const TM = new PixelWipe();
