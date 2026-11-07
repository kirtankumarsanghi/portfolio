/**
 * 8×8 Bayer ordered-dither masks for DOM elements (CSS mask-image), so DOM layers — stickers —
 * dissolve with exactly the same pixel language as the WebGL dither pass on the 3D name.
 * progress 0 → 1: cells die in Bayer order, cell size grows 3 → 10px. Cached per (size, level).
 */

const BAYER8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

const cache = new Map<string, string>();

export function bayerMask(progress: number): { image: string; size: string } | null {
  const p = Math.min(1, Math.max(0, progress));
  if (p <= 0.001) return null;
  const cell = Math.round(3 + 7 * p);
  const level = Math.round(p * 64); // 65 discrete steps
  const key = `${cell}:${level}`;
  let url = cache.get(key);
  if (!url) {
    const c = document.createElement("canvas");
    c.width = c.height = cell * 8;
    const g = c.getContext("2d")!;
    g.fillStyle = "#000";
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) if (BAYER8[y][x] >= level) g.fillRect(x * cell, y * cell, cell, cell);
    url = `url(${c.toDataURL()})`;
    cache.set(key, url);
  }
  return { image: url, size: `${cell * 8}px ${cell * 8}px` };
}

export function applyBayer(el: HTMLElement | null, progress: number) {
  if (!el) return;
  const m = bayerMask(progress);
  if (!m) {
    el.style.maskImage = "";
    el.style.webkitMaskImage = "";
    return;
  }
  el.style.maskImage = m.image;
  el.style.webkitMaskImage = m.image;
  el.style.maskSize = m.size;
  el.style.webkitMaskSize = m.size;
  el.style.maskRepeat = "repeat";
  el.style.webkitMaskRepeat = "repeat";
}
