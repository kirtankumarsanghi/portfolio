import * as THREE from "three";
import { use } from "react";
import { parse as parseFont, type Font, type Path as OFPath } from "opentype.js";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import fontUrl from "@/assets/fonts/Pacifico-Regular.ttf?url";

export type FontBlock = { group: THREE.Group; width: number; height: number; meshes: THREE.Mesh[] };

const fontPromise: Promise<Font> = fetch(fontUrl)
  .then((r) => r.arrayBuffer())
  .then((buf) => parseFont(buf));

/** Suspends until the script font is parsed (wrap the caller in <Suspense>). */
export function useScriptFont() {
  return use(fontPromise);
}

/** Append one opentype contour to a THREE.Path / Shape. */
function contourToPath(commands: OFPath["commands"], target: THREE.Path) {
  let started = false;
  for (const c of commands) {
    switch (c.type) {
      case "M":
        if (started) target.closePath();
        target.moveTo(c.x, c.y);
        started = true;
        break;
      case "L":
        target.lineTo(c.x, c.y);
        break;
      case "Q":
        target.quadraticCurveTo(c.x1, c.y1, c.x, c.y);
        break;
      case "C":
        target.bezierCurveTo(c.x1, c.y1, c.x2, c.y2, c.x, c.y);
        break;
      case "Z":
        target.closePath();
        started = false;
        break;
    }
  }
  if (started) target.closePath();
}

function signedArea(pts: THREE.Vector2[]) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i],
      q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

function pointInPolygon(pt: THREE.Vector2, poly: THREE.Vector2[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i],
      b = poly[j];
    if (a.y > pt.y !== b.y > pt.y && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Split a glyph path into contours, then assemble outer shapes with their holes. */
function glyphShapes(p: OFPath): THREE.Shape[] {
  const contours: OFPath["commands"][] = [];
  let cur: OFPath["commands"] = [];
  for (const c of p.commands) {
    if (c.type === "M" && cur.length) {
      contours.push(cur);
      cur = [];
    }
    cur.push(c);
  }
  if (cur.length) contours.push(cur);

  const outers: { shape: THREE.Shape; poly: THREE.Vector2[] }[] = [];
  const holes: { path: THREE.Path; poly: THREE.Vector2[] }[] = [];

  for (const cmds of contours) {
    const path = new THREE.Path();
    contourToPath(cmds, path);
    const poly = path.getPoints(12);
    if (poly.length < 3) continue;
    if (signedArea(poly) >= 0) {
      outers.push({ shape: new THREE.Shape(poly), poly });
    } else {
      holes.push({ path, poly });
    }
  }

  for (const h of holes) {
    const host = outers.find((o) => pointInPolygon(h.poly[0], o.poly));
    if (host) host.shape.holes.push(h.path);
  }
  return outers.map((o) => o.shape);
}

function lineShapes(font: Font, text: string, fontSize: number): THREE.Shape[] {
  const shapes: THREE.Shape[] = [];
  for (const p of font.getPaths(text, 0, 0, fontSize)) shapes.push(...glyphShapes(p));
  return shapes;
}

type Seg2D = { ax: number; ay: number; bx: number; by: number; dx: number; dy: number; lenSq: number };

function collectContourSegments(shapes: THREE.Shape[]): Seg2D[] {
  const segs: Seg2D[] = [];
  const addLoop = (pts: THREE.Vector2[]) => {
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq > 1e-6) {
        segs.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, dx, dy, lenSq });
      }
    }
  };
  for (const s of shapes) {
    addLoop(s.getPoints(10));
    for (const h of s.holes) {
      addLoop(h.getPoints(10));
    }
  }
  return segs;
}

function minDistanceToSegments(px: number, py: number, segs: Seg2D[]): number {
  let minD2 = Infinity;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    let t = ((px - s.ax) * s.dx + (py - s.ay) * s.dy) / s.lenSq;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    const cx = s.ax + s.dx * t - px;
    const cy = s.ay + s.dy * t - py;
    const d2 = cx * cx + cy * cy;
    if (d2 < minD2) minD2 = d2;
  }
  return Math.sqrt(minD2);
}

/**
 * Longest-edge triangle bisection on cap faces so interior vertices exist along stroke centerlines.
 */
function subdivideCapTriangles(geo: THREE.BufferGeometry, midZ: number, capZThreshold: number, maxEdgeLen: number, passes = 4): THREE.BufferGeometry {
  const nonIndexed = geo.index ? geo.toNonIndexed() : geo;
  let posArr = Array.from(nonIndexed.getAttribute("position").array as Float32Array);
  const maxEdgeSq = maxEdgeLen * maxEdgeLen;

  for (let pass = 0; pass < passes; pass++) {
    const nextPos: number[] = [];
    const triCount = posArr.length / 9;
    let splitAny = false;

    for (let t = 0; t < triCount; t++) {
      const b = t * 9;
      const ax = posArr[b],
        ay = posArr[b + 1],
        az = posArr[b + 2];
      const bx = posArr[b + 3],
        by = posArr[b + 4],
        bz = posArr[b + 5];
      const cx = posArr[b + 6],
        cy = posArr[b + 7],
        cz = posArr[b + 8];

      const isCap =
        Math.abs(az - midZ) >= capZThreshold ||
        Math.abs(bz - midZ) >= capZThreshold ||
        Math.abs(cz - midZ) >= capZThreshold;

      if (!isCap) {
        nextPos.push(ax, ay, az, bx, by, bz, cx, cy, cz);
        continue;
      }

      const dab = (ax - bx) * (ax - bx) + (ay - by) * (ay - by) + (az - bz) * (az - bz);
      const dbc = (bx - cx) * (bx - cx) + (by - cy) * (by - cy) + (bz - cz) * (bz - cz);
      const dca = (cx - ax) * (cx - ax) + (cy - ay) * (cy - ay) + (cz - az) * (cz - az);

      if (dab <= maxEdgeSq && dbc <= maxEdgeSq && dca <= maxEdgeSq) {
        nextPos.push(ax, ay, az, bx, by, bz, cx, cy, cz);
        continue;
      }

      splitAny = true;
      if (dab >= dbc && dab >= dca) {
        const mx = 0.5 * (ax + bx),
          my = 0.5 * (ay + by),
          mz = 0.5 * (az + bz);
        nextPos.push(ax, ay, az, mx, my, mz, cx, cy, cz);
        nextPos.push(mx, my, mz, bx, by, bz, cx, cy, cz);
      } else if (dbc >= dab && dbc >= dca) {
        const mx = 0.5 * (bx + cx),
          my = 0.5 * (by + cy),
          mz = 0.5 * (bz + cz);
        nextPos.push(ax, ay, az, bx, by, bz, mx, my, mz);
        nextPos.push(ax, ay, az, mx, my, mz, cx, cy, cz);
      } else {
        const mx = 0.5 * (cx + ax),
          my = 0.5 * (cy + ay),
          mz = 0.5 * (cz + az);
        nextPos.push(ax, ay, az, bx, by, bz, mx, my, mz);
        nextPos.push(mx, my, mz, bx, by, bz, cx, cy, cz);
      }
    }

    posArr = nextPos;
    if (!splitAny) break;
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(new Float32Array(posArr), 3));
  return out;
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - edge0) / Math.max(1e-6, edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Inflate cap vertices into a smooth circular dome based on 2D distance to glyph contours,
 * then apply Laplacian vertex & normal smoothing so every letter stroke is a puffy 3D tube.
 */
function inflateAndSmoothBalloon(
  rawExtruded: THREE.BufferGeometry,
  shapes: THREE.Shape[],
  depth: number,
  bevelThickness: number,
  domeRadius: number,
  domeHeight: number,
): THREE.BufferGeometry {
  rawExtruded.deleteAttribute("uv");
  rawExtruded.deleteAttribute("normal");

  const midZ = depth * 0.5;
  const capZThreshold = depth * 0.5 + bevelThickness * 0.55;
  const subdivided = subdivideCapTriangles(rawExtruded, midZ, capZThreshold, 4.2, 4);
  const welded = mergeVertices(subdivided, 1e-3);

  const posAttr = welded.getAttribute("position") as THREE.BufferAttribute;
  const vCount = posAttr.count;
  const pos = posAttr.array as Float32Array;

  const segs = collectContourSegments(shapes);
  const innerZStart = depth * 0.5 + bevelThickness * 0.25;
  const innerZFull = depth * 0.5 + bevelThickness * 0.92;

  for (let i = 0; i < vCount; i++) {
    const idx = i * 3;
    const x = pos[idx];
    const y = pos[idx + 1];
    const z = pos[idx + 2];
    const dz = z - midZ;
    const adz = Math.abs(dz);
    if (adz > innerZStart) {
      const w = smoothstep(innerZStart, innerZFull, adz);
      const d = minDistanceToSegments(x, y, segs);
      const u = Math.min(d / domeRadius, 1.0);
      const dome = domeHeight * Math.sqrt(Math.max(0, 1 - (1 - u) * (1 - u)));
      pos[idx + 2] = z + Math.sign(dz) * dome * w;
    }
  }

  // Build vertex adjacency for Laplacian smoothing
  const indexAttr = welded.getIndex();
  if (indexAttr) {
    const indices = indexAttr.array;
    const neighbors: number[][] = Array.from({ length: vCount }, () => []);
    const addEdge = (a: number, b: number) => {
      const listA = neighbors[a];
      if (!listA.includes(b)) listA.push(b);
      const listB = neighbors[b];
      if (!listB.includes(a)) listB.push(a);
    };
    for (let i = 0; i < indices.length; i += 3) {
      const a = indices[i],
        b = indices[i + 1],
        c = indices[i + 2];
      addEdge(a, b);
      addEdge(b, c);
      addEdge(c, a);
    }

    const temp = new Float32Array(pos.length);
    const lambda = 0.42;
    for (let iter = 0; iter < 5; iter++) {
      temp.set(pos);
      for (let i = 0; i < vCount; i++) {
        const nb = neighbors[i];
        if (nb.length === 0) continue;
        let sx = 0,
          sy = 0,
          sz = 0;
        for (let j = 0; j < nb.length; j++) {
          const nIdx = nb[j] * 3;
          sx += temp[nIdx];
          sy += temp[nIdx + 1];
          sz += temp[nIdx + 2];
        }
        const inv = 1 / nb.length;
        const idx = i * 3;
        pos[idx] = temp[idx] * (1 - lambda) + sx * inv * lambda;
        pos[idx + 1] = temp[idx + 1] * (1 - lambda) + sy * inv * lambda;
        pos[idx + 2] = temp[idx + 2] * (1 - lambda) + sz * inv * lambda;
      }
    }

    welded.computeVertexNormals();
    const normAttr = welded.getAttribute("normal") as THREE.BufferAttribute;
    const norm = normAttr.array as Float32Array;
    const tempN = new Float32Array(norm.length);
    for (let iter = 0; iter < 2; iter++) {
      tempN.set(norm);
      for (let i = 0; i < vCount; i++) {
        const nb = neighbors[i];
        if (nb.length === 0) continue;
        let nx = tempN[i * 3],
          ny = tempN[i * 3 + 1],
          nz = tempN[i * 3 + 2];
        for (let j = 0; j < nb.length; j++) {
          const nIdx = nb[j] * 3;
          nx += tempN[nIdx];
          ny += tempN[nIdx + 1];
          nz += tempN[nIdx + 2];
        }
        const len = Math.hypot(nx, ny, nz) || 1;
        norm[i * 3] = nx / len;
        norm[i * 3 + 1] = ny / len;
        norm[i * 3 + 2] = nz / len;
      }
    }
    normAttr.needsUpdate = true;
  } else {
    welded.computeVertexNormals();
  }

  posAttr.needsUpdate = true;
  return welded;
}

const glassGeoCache = new Map<string, THREE.BufferGeometry>();

/**
 * Builds a single merged, centered, tubular balloon BufferGeometry for GlassMesh.
 */
export function buildFontGlassGeometry(font: Font, lines: string[]): THREE.BufferGeometry {
  const key = lines.join("\n");
  const cached = glassGeoCache.get(key);
  if (cached) return cached;

  const FS = 100;
  const STEP = FS * 1.02;
  const depth = FS * 0.08;
  const bevelThickness = FS * 0.16;
  const bevelSize = FS * 0.095;

  const lineGeos: THREE.BufferGeometry[] = [];

  lines.forEach((line, i) => {
    const shapes = lineShapes(font, line, FS);
    const extruded = new THREE.ExtrudeGeometry(shapes, {
      depth,
      bevelEnabled: true,
      bevelThickness,
      bevelSize,
      bevelSegments: 10,
      curveSegments: 22,
      steps: 1,
    });

    const geo = inflateAndSmoothBalloon(extruded, shapes, depth, bevelThickness, FS * 0.15, FS * 0.18);
    // Flip Y from opentype glyph coordinates to Three.js Y-up
    const flipMat = new THREE.Matrix4().makeScale(1, -1, 1);
    geo.applyMatrix4(flipMat);
    // Flip winding order after negative Y scale so front faces point outward
    const idxAttr = geo.getIndex();
    if (idxAttr) {
      const arr = idxAttr.array;
      for (let k = 0; k < arr.length; k += 3) {
        const tmp = arr[k + 1];
        arr[k + 1] = arr[k + 2];
        arr[k + 2] = tmp;
      }
      idxAttr.needsUpdate = true;
    }
    geo.computeVertexNormals();
    geo.translate(0, -i * STEP, 0);
    lineGeos.push(geo);
  });

  const merged = mergeGeometries(lineGeos, false);
  merged.computeBoundingBox();
  const box = merged.boundingBox!;
  const center = box.getCenter(new THREE.Vector3());
  merged.translate(-center.x, -center.y, -center.z);
  merged.computeBoundingBox();
  merged.computeBoundingSphere();

  glassGeoCache.set(key, merged);
  return merged;
}

export function buildFontText(font: Font, lines: string[], material: THREE.Material): FontBlock {
  const geo = buildFontGlassGeometry(font, lines);
  geo.computeBoundingBox();
  const size = geo.boundingBox!.getSize(new THREE.Vector3());
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  group.add(mesh);
  return { group, width: size.x, height: size.y, meshes: [mesh] };
}
