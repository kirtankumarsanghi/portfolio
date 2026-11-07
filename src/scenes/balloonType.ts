import * as THREE from "three";
import { MarchingCubes } from "three/examples/jsm/objects/MarchingCubes.js";

/**
 * Inflated balloon lettering.
 *
 * Every glyph is a set of very fat rounded strokes → 2D signed-distance field → inflated into 3D
 * (pillow profile: thickness follows a circular curve of the distance to the outline) → polygonised with
 * marching cubes, so normals come from the field gradient and the shading is smooth like gel.
 * Each letter becomes its own mesh, which is what the jelly wobble needs.
 * Geometry is cached per character and built once.
 */

type P = [number, number];
type Stroke = { pts: P[]; w?: number };

const W = 0.46; // stroke half-width → stroke 0.92 = 31% of the 3.0 letter height (spec: ≥ 22%)
const THIN = 0.2; // crossbars

const arcPts = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 34): P[] => {
  const out: P[] = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return out;
};

/* ------------------------------------------------------------------ */
/* lowercase (x-height 2.0, ascender 3.0)                              */
/* ------------------------------------------------------------------ */
const LOWER: Record<string, Stroke[]> = {
  k: [
    { pts: [[0, 0], [0, 3]] },
    { pts: [[0, 1.42], [0.5, 1.92], [0.92, 2.4]] },
    { pts: [[0.16, 1.56], [0.95, 0]] },
  ],
  i: [{ pts: [[0, 0], [0, 1.95]] }, { pts: [[0, 2.66]] }],
  r: [{ pts: [[0, 0], [0, 2]] }, { pts: arcPts(0.52, 1.44, 0.56, 0.56, 178, 42, 26) }],
  t: [
    { pts: [[0.28, 0.3], [0.28, 2.8]] },
    { pts: [[-0.34, 1.96], [1.0, 1.96]], w: THIN },
    { pts: [[0.28, 0.3], [0.62, 0.08], [1.0, 0.24]] },
  ],
  a: [{ pts: arcPts(0.78, 0.98, 0.74, 0.86, 0, 360, 54) }, { pts: [[1.5, 0.05], [1.5, 1.95]] }],
  n: [
    { pts: [[0, 0], [0, 2]] },
    { pts: arcPts(0.78, 1.3, 0.78, 0.7, 180, 0, 30) },
    { pts: [[1.56, 1.3], [1.56, 0]] },
  ],
  u: [
    { pts: [[0, 2], [0, 0.72]] },
    { pts: arcPts(0.76, 0.72, 0.76, 0.72, 180, 0, 30) },
    { pts: [[1.52, 0.72], [1.52, 2]] },
    { pts: [[1.52, 0.5], [1.86, 0.12]] },
  ],
  m: [
    { pts: [[0, 0], [0, 2]] },
    { pts: arcPts(0.62, 1.36, 0.62, 0.64, 180, 0, 26) },
    { pts: [[1.24, 1.36], [1.24, 0]] },
    { pts: arcPts(1.86, 1.36, 0.62, 0.64, 180, 0, 26) },
    { pts: [[2.48, 1.36], [2.48, 0]] },
  ],
  s: [
    { pts: arcPts(0.72, 1.46, 0.56, 0.54, 300, 120, 34) },
    { pts: arcPts(0.72, 0.56, 0.56, 0.54, 120, -60, 34) },
  ],
  g: [
    { pts: arcPts(0.78, 1.0, 0.74, 0.84, 0, 360, 50) },
    { pts: [[1.5, 1.0], [1.5, -0.42]] },
    { pts: arcPts(0.9, -0.46, 0.62, 0.5, 0, -168, 30) },
  ],
  h: [
    { pts: [[0, 0], [0, 3]] },
    { pts: arcPts(0.78, 1.32, 0.78, 0.68, 180, 0, 30) },
    { pts: [[1.56, 1.32], [1.56, 0]] },
  ],
  c: [{ pts: arcPts(0.82, 1.0, 0.8, 0.96, 46, 314, 46) }],
  o: [{ pts: arcPts(0.86, 1.0, 0.82, 0.96, 0, 360, 54) }],
  d: [{ pts: arcPts(0.8, 1.0, 0.76, 0.9, 0, 360, 50) }, { pts: [[1.56, 0], [1.56, 3]] }],
  e: [
    { pts: arcPts(0.82, 1.02, 0.8, 0.94, 4, 296, 56) },
    { pts: [[0.06, 1.04], [1.62, 1.04]], w: THIN },
  ],
  l: [{ pts: [[0, 0], [0, 3]] }],
  p: [{ pts: [[0, -1], [0, 2]] }, { pts: arcPts(0.8, 1.0, 0.78, 0.9, 0, 360, 50) }],
  y: [{ pts: [[0, 2], [0.8, 0.2]] }, { pts: [[1.56, 2], [0.34, -1]] }],
  v: [{ pts: [[0, 2], [0.78, 0]] }, { pts: [[1.56, 2], [0.78, 0]] }],
  w: [
    { pts: [[0, 2], [0.5, 0]] },
    { pts: [[0.5, 0], [1.0, 1.5]] },
    { pts: [[1.0, 1.5], [1.5, 0]] },
    { pts: [[1.5, 0], [2.0, 2]] },
  ],
  f: [
    { pts: arcPts(0.62, 2.3, 0.62, 0.7, 180, 0, 26) },
    { pts: [[1.24, 2.3], [1.24, 0]] },
    { pts: [[0.6, 2.0], [1.9, 2.0]], w: THIN },
  ],
  b: [{ pts: [[0, 0], [0, 3]] }, { pts: arcPts(0.82, 1.0, 0.8, 0.92, 0, 360, 50) }],
  j: [{ pts: arcPts(0.4, -0.5, 0.62, 0.5, -10, -170, 30) }, { pts: [[0.4, -0.5], [0.4, 2]] }, { pts: [[0.4, 2.66]] }],
  x: [{ pts: [[0, 2], [1.4, 0]] }, { pts: [[1.4, 2], [0, 0]] }],
  z: [{ pts: [[0, 2], [1.35, 2]] }, { pts: [[1.35, 2], [0, 0]] }, { pts: [[0, 0], [1.35, 0]] }],
  "&": [
    { pts: arcPts(0.62, 2.16, 0.5, 0.52, 96, -186, 34) },
    { pts: arcPts(0.92, 0.86, 0.9, 0.86, 178, 44, 40) },
    { pts: [[1.42, 1.4], [2.34, 2.42]] },
  ],
  " ": [],
};

/* ------------------------------------------------------------------ */
/* uppercase (cap height 3.0)                                          */
/* ------------------------------------------------------------------ */
const UPPER: Record<string, Stroke[]> = {
  C: [{ pts: arcPts(1.2, 1.5, 1.14, 1.44, 48, 312, 54) }],
  O: [{ pts: arcPts(1.24, 1.5, 1.2, 1.44, 0, 360, 60) }],
  D: [{ pts: [[0, 0], [0, 3]] }, { pts: arcPts(0.0, 1.5, 1.5, 1.5, -90, 90, 48) }],
  E: [
    { pts: [[0, 0], [0, 3]] },
    { pts: [[0, 3], [1.5, 3]], w: 0.34 },
    { pts: [[0, 1.5], [1.24, 1.5]], w: 0.32 },
    { pts: [[0, 0], [1.5, 0]], w: 0.34 },
  ],
  A: [{ pts: [[0, 0], [1.0, 3]] }, { pts: [[1.0, 3], [2.0, 0]] }, { pts: [[0.36, 1.06], [1.64, 1.06]], w: 0.3 }],
  R: [
    { pts: [[0, 0], [0, 3]] },
    { pts: arcPts(0.0, 2.16, 1.06, 0.84, -90, 90, 40) },
    { pts: [[0.7, 1.5], [1.72, 0]] },
  ],
  K: [{ pts: [[0, 0], [0, 3]] }, { pts: [[0, 1.5], [1.5, 3]] }, { pts: [[0.42, 1.92], [1.62, 0]] }],
  S: [
    { pts: arcPts(1.06, 2.18, 0.92, 0.82, 320, 110, 40) },
    { pts: arcPts(1.06, 0.82, 0.92, 0.82, 140, -70, 40) },
  ],
  T: [{ pts: [[0.86, 0], [0.86, 3]] }, { pts: [[0, 3], [1.72, 3]], w: 0.34 }],
  N: [{ pts: [[0, 0], [0, 3]] }, { pts: [[0, 3], [1.7, 0]] }, { pts: [[1.7, 0], [1.7, 3]] }],
  M: [{ pts: [[0, 0], [0, 3]] }, { pts: [[0, 3], [1.05, 1.2]] }, { pts: [[1.05, 1.2], [2.1, 3]] }, { pts: [[2.1, 3], [2.1, 0]] }],
  L: [{ pts: [[0, 3], [0, 0]] }, { pts: [[0, 0], [1.5, 0]], w: 0.34 }],
  I: [{ pts: [[0, 0], [0, 3]] }],
  H: [{ pts: [[0, 0], [0, 3]] }, { pts: [[1.6, 0], [1.6, 3]] }, { pts: [[0, 1.5], [1.6, 1.5]], w: 0.34 }],
  B: [
    { pts: [[0, 0], [0, 3]] },
    { pts: arcPts(0.0, 2.24, 0.98, 0.76, -90, 90, 36) },
    { pts: arcPts(0.0, 0.76, 1.06, 0.76, -90, 90, 36) },
  ],
  U: [{ pts: [[0, 3], [0, 1.1]] }, { pts: arcPts(0.86, 1.1, 0.86, 1.1, 180, 0, 36) }, { pts: [[1.72, 1.1], [1.72, 3]] }],
  P: [{ pts: [[0, 0], [0, 3]] }, { pts: arcPts(0.0, 2.16, 1.12, 0.84, -90, 90, 40) }],
  G: [{ pts: arcPts(1.2, 1.5, 1.14, 1.44, 40, 320, 54) }, { pts: [[2.2, 1.5], [1.3, 1.5]], w: 0.34 }],
  F: [{ pts: [[0, 0], [0, 3]] }, { pts: [[0, 3], [1.5, 3]], w: 0.34 }, { pts: [[0, 1.56], [1.2, 1.56]], w: 0.32 }],
  W: [{ pts: [[0, 3], [0.66, 0]] }, { pts: [[0.66, 0], [1.2, 2.1]] }, { pts: [[1.2, 2.1], [1.76, 0]] }, { pts: [[1.76, 0], [2.4, 3]] }],
  Y: [{ pts: [[0, 3], [0.86, 1.5]] }, { pts: [[1.72, 3], [0.86, 1.5]] }, { pts: [[0.86, 1.5], [0.86, 0]] }],
  V: [{ pts: [[0, 3], [0.9, 0]] }, { pts: [[1.8, 3], [0.9, 0]] }],
  X: [{ pts: [[0, 3], [1.7, 0]] }, { pts: [[1.7, 3], [0, 0]] }],
  Z: [{ pts: [[0, 3], [1.6, 3]], w: 0.34 }, { pts: [[1.6, 3], [0, 0]] }, { pts: [[0, 0], [1.6, 0]], w: 0.34 }],
  J: [{ pts: [[1.1, 3], [1.1, 0.9]] }, { pts: arcPts(0.55, 0.9, 0.55, 0.9, 0, -180, 30) }],
  Q: [{ pts: arcPts(1.24, 1.5, 1.2, 1.44, 0, 360, 58) }, { pts: [[1.5, 1.0], [2.5, -0.2]] }],
};

/* ------------------------------------------------------------------ */
/* field math                                                          */
/* ------------------------------------------------------------------ */
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(ax + dx * t - px, ay + dy * t - py);
}
function strokeDist(s: Stroke, x: number, y: number) {
  if (s.pts.length === 1) return Math.hypot(s.pts[0][0] - x, s.pts[0][1] - y) - (s.w ?? W);
  let d = Infinity;
  for (let i = 0; i < s.pts.length - 1; i++) {
    const a = s.pts[i];
    const b = s.pts[i + 1];
    const v = segDist(x, y, a[0], a[1], b[0], b[1]);
    if (v < d) d = v;
  }
  return d - (s.w ?? W);
}
const smin = (a: number, b: number, k: number) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};
function glyphSdf(g: Stroke[], x: number, y: number) {
  let d = Infinity;
  for (const s of g) {
    const di = strokeDist(s, x, y);
    d = d === Infinity ? di : smin(d, di, 0.34);
  }
  return d;
}

const RES = 52; // marching-cubes grid per glyph — smooth enough, and cheap enough to build without blocking first paint
const HM = 0.6; // max half-thickness (z) — fat, solid balloon depth
const RIN = 0.5; // inflate radius: the pillow profile reaches full thickness this far inside the outline

const geoCache = new Map<string, THREE.BufferGeometry>();

function glyphGeometry(key: string, strokes: Stroke[], pad: number): { geo: THREE.BufferGeometry; box: [number, number, number, number] } {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  strokes.forEach((s) =>
    s.pts.forEach(([x, y]) => {
      const w = s.w ?? W;
      minX = Math.min(minX, x - w);
      maxX = Math.max(maxX, x + w);
      minY = Math.min(minY, y - w);
      maxY = Math.max(maxY, y + w);
    }),
  );
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const S = Math.max(maxX - minX, maxY - minY) / 2 + pad;
  const box: [number, number, number, number] = [minX, minY, maxX, maxY];

  const cached = geoCache.get(key);
  if (cached) return { geo: cached, box };

  const mc = new MarchingCubes(RES, new THREE.MeshBasicMaterial(), false, false, 90000);
  mc.isolation = 0;
  const f = mc.field;
  f.fill(-1);
  const size = mc.size;
  const half = mc.halfsize;
  const size2 = size * size;

  const col = new Float32Array(size2);
  for (let iy = 0; iy < size; iy++) {
    for (let ix = 0; ix < size; ix++) {
      const x = cx + ((ix - half) / half) * S;
      const y = cy + ((iy - half) / half) * S;
      col[iy * size + ix] = -glyphSdf(strokes, x, y); // inside > 0
    }
  }
  for (let iz = 0; iz < size; iz++) {
    const az = Math.abs(((iz - half) / half) * S);
    if (az > HM + 0.14) continue;
    for (let iy = 0; iy < size; iy++) {
      for (let ix = 0; ix < size; ix++) {
        const t = col[iy * size + ix];
        let h: number;
        if (t <= 0) h = t * 4 - 0.02;
        else {
          const u = Math.min(t / RIN, 1);
          h = HM * Math.sqrt(1 - (1 - u) * (1 - u));
        }
        f[ix + iy * size + iz * size2] = (h - az) * 10;
      }
    }
  }
  mc.update();
  const n = mc.count;
  const pos = mc.positionArray.slice(0, n * 3);
  const nor = mc.normalArray.slice(0, n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] *= S;
    pos[i * 3 + 1] *= S;
    pos[i * 3 + 2] *= S;
    const nx = nor[i * 3], ny = nor[i * 3 + 1], nz = nor[i * 3 + 2];
    const l = Math.hypot(nx, ny, nz) || 1;
    nor[i * 3] = nx / l;
    nor[i * 3 + 1] = ny / l;
    nor[i * 3 + 2] = nz / l;
  }
  mc.geometry.dispose();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  geo.computeBoundingSphere();
  geoCache.set(key, geo);
  return { geo, box };
}

export type BalloonText = {
  group: THREE.Group;
  width: number;
  height: number;
  letters: THREE.Mesh[];
};

/**
 * Build stacked lines of balloon letters. Each letter is a separate mesh (for jelly physics).
 * `case` selects lowercase / uppercase glyph shapes.
 */
export function buildBalloonText(
  lines: string[],
  opts: { upper?: boolean; letterGap?: number; lineGap?: number; pad?: number } = {},
): BalloonText {
  const { upper = false, letterGap = 0.06, lineGap = 0.34, pad = 0.26 } = opts;
  const table = upper ? UPPER : LOWER;
  const capH = upper ? 3.0 : 3.0; // ascender/cap top in glyph units
  const group = new THREE.Group();
  const letters: THREE.Mesh[] = [];
  const material = new THREE.MeshStandardMaterial({ color: "#ffffff" }); // replaced by caller

  const lineMetas = lines.map((line) => {
    const chars = [...line];
    const boxes = chars.map((ch) => {
      const strokes = table[ch] ?? table[ch.toLowerCase()] ?? [];
      if (!strokes.length) return null;
      return glyphGeometry(`${upper ? "U" : "L"}:${ch}`, strokes, pad).box;
    });
    let w = 0;
    boxes.forEach((b, i) => {
      if (!b) {
        w += capH * 0.3;
        return;
      }
      w += b[2] - b[0] + (i < boxes.length - 1 ? letterGap : 0);
    });
    return { chars, boxes, width: w };
  });

  const totalW = Math.max(...lineMetas.map((l) => l.width));
  const totalH = lines.length * capH + (lines.length - 1) * lineGap * capH * 0.5;

  lineMetas.forEach((meta, li) => {
    const lineY = (lines.length - 1 - li) * (capH + lineGap * capH * 0.5) - totalH / 2 + capH / 2;
    let cursor = -meta.width / 2;
    meta.chars.forEach((ch, ci) => {
      const b = meta.boxes[ci];
      if (!b) {
        cursor += capH * 0.3;
        return;
      }
      const strokes = table[ch] ?? table[ch.toLowerCase()] ?? [];
      const { geo } = glyphGeometry(`${upper ? "U" : "L"}:${ch}`, strokes, pad);
      const mesh = new THREE.Mesh(geo, material);
      const gcx = (b[0] + b[2]) / 2;
      const gcy = (b[1] + b[3]) / 2;
      mesh.position.set(cursor + gcx - b[0], lineY + gcy - capH / 2, 0);
      mesh.userData = { char: ch, home: mesh.position.clone(), phase: Math.random() * 6.28 };
      group.add(mesh);
      letters.push(mesh);
      cursor += b[2] - b[0] + letterGap;
    });
  });

  return { group, width: totalW, height: totalH, letters };
}
