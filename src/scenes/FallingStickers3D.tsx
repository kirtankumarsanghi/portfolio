import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

/**
 * Exact 3D instanced falling & click-burst stickers from curiositywen.design (ul):
 *  - Renders on Layer 0 at zOffset = -6 (behind the Layer 10 glass text at z = 2),
 *    so stickers are captured into the refraction FBO and refract through the 3D glass letters!
 *  - Continuously falls with wind sway and respawns when passing startY - fallDistance.
 *  - Clicking in the section raycasts to z = 0 and emits a burst of stickers.
 */

const STICKER_URLS = [
  "/sticker_img/s_01.png",
  "/sticker_img/s_02.png",
  "/sticker_img/s_03.png",
  "/sticker_img/s_04.png",
  "/sticker_img/s_05.png",
  "/sticker_img/s_06.png",
  "/sticker_img/s_07.png",
  "/sticker_img/s_08.png",
  "/sticker_img/s_09.png",
  "/sticker_img/s_10.png",
  "/sticker_img/s_11.png",
  "/sticker_img/s_12.png",
];

const CONFIG = {
  particleCount: STICKER_URLS.length,
  spawnWidth: 32,
  clickSpawnWidth: 24,
  spawnHeight: 24,
  clickSpawnHeight: 24,
  positionY: 24,
  fallDistance: 48,
  zDepth: 4,
  zOffset: -6,
  windStrength: 1.8,
  windFrequency: 0.3,
  scale: 1.4,
  clickScale: 1.4,
  rotationSpeed: 0.8,
  fallSpeed: 1.8,
  enterDurationRatio: 0.05,
};

const VERT = /* glsl */ `
attribute vec4 uvRect;

varying vec2 vAtlasUv;

void main() {
  vAtlasUv = uvRect.xy + uv * uvRect.zw;

  vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const FRAG = /* glsl */ `
uniform sampler2D map;

varying vec2 vAtlasUv;

void main() {
  vec4 color = texture2D(map, vAtlasUv);
  if (color.a < 0.01) discard;

  gl_FragColor = color;
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

type Particle = {
  position: THREE.Vector3;
  startY: number;
  fallSpeed: number;
  rotation: number;
  rotationSpeed: number;
  scale: number;
  textureIndex: number;
  windPhase: number;
  windAmplitude: number;
  emitAt: number;
  hasStarted: boolean;
  dead: boolean;
  isOneShot: boolean;
  originX: number;
  originY: number;
  originZ: number;
};

const nextPow2 = (v: number) => Math.pow(2, Math.ceil(Math.log2(Math.max(1, v))));

function resetParticle(p: Particle, cfg: typeof CONFIG, mode: "scroll" | "click" = "scroll") {
  const isClick = mode === "click";
  const h = isClick ? cfg.clickSpawnHeight : cfg.spawnHeight;
  const halfH = Math.min(0.5 * Math.max(h, 0), 8);
  const yOff = isClick ? cfg.positionY + (2 * Math.random() - 1) * halfH : cfg.positionY + Math.random() * Math.max(h, 0);
  const w = isClick ? cfg.clickSpawnWidth : cfg.spawnWidth;
  p.position.set(
    p.originX + (Math.random() - 0.5) * w,
    p.originY + yOff,
    p.originZ + (Math.random() - 0.5) * cfg.zDepth + cfg.zOffset,
  );
  p.startY = p.position.y;
  p.fallSpeed = cfg.fallSpeed * (0.6 + 0.8 * Math.random());
  p.rotation = Math.random() * Math.PI * 2;
  p.rotationSpeed = (Math.random() - 0.5) * cfg.rotationSpeed * 2;
  p.scale = isClick ? cfg.clickScale : cfg.scale;
  p.windPhase = Math.random() * Math.PI * 2;
  p.windAmplitude = 0.3 + Math.random() * cfg.windStrength;
  p.dead = false;
  p.hasStarted = true;
  p.emitAt = 0;
}

function createBatch(count: number, texCount: number, isOneShot = false): Particle[] {
  const list: Particle[] = Array.from({ length: count }, () => ({
    position: new THREE.Vector3(),
    startY: 0,
    fallSpeed: 0,
    rotation: 0,
    rotationSpeed: 0,
    scale: 1,
    textureIndex: Math.floor(Math.random() * texCount),
    windPhase: 0,
    windAmplitude: 0,
    emitAt: 0,
    hasStarted: true,
    dead: false,
    isOneShot,
    originX: 0,
    originY: 0,
    originZ: 0,
  }));
  if (count > 0 && count <= texCount) {
    const indices = Array.from({ length: texCount }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    for (let i = 0; i < count; i++) {
      list[i].textureIndex = indices[i];
    }
  }
  return list;
}

function pruneParticles(list: Particle[]): Particle[] {
  const alive = list.filter((p) => !p.isOneShot || !p.dead);
  const persistent = alive.filter((p) => !p.isOneShot);
  const oneShots = alive.filter((p) => p.isOneShot);
  if (oneShots.length <= 384) return alive;
  oneShots.sort((a, b) => b.emitAt - a.emitAt);
  return persistent.concat(oneShots.slice(0, 384));
}

function pickUnusedTexture(texCount: number, activeSet: Set<number>): number {
  if (texCount <= 0) return 0;
  if (activeSet.size >= texCount) return Math.floor(Math.random() * texCount);
  const candidates: number[] = [];
  for (let i = 0; i < texCount; i++) {
    if (!activeSet.has(i)) candidates.push(i);
  }
  return candidates[Math.floor(Math.random() * candidates.length)] ?? 0;
}

function insertSortedByZ(arr: Particle[], item: Particle) {
  const z = item.position.z;
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid].position.z <= z) lo = mid + 1;
    else hi = mid;
  }
  arr.push(item);
  for (let i = arr.length - 1; i > lo; i--) {
    arr[i] = arr[i - 1];
  }
  arr[lo] = item;
}

type AtlasData = {
  texture: THREE.CanvasTexture;
  uvRects: Float32Array;
  aspects: number[];
};

let cachedAtlasPromise: Promise<AtlasData | null> | null = null;

function loadStickerAtlas(): Promise<AtlasData | null> {
  if (cachedAtlasPromise) return cachedAtlasPromise;
  cachedAtlasPromise = Promise.all(
    STICKER_URLS.map(
      (url) =>
        new Promise<HTMLImageElement | null>((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = url;
        }),
    ),
  ).then((loaded) => {
    const imgs = loaded.filter((x): x is HTMLImageElement => !!x && x.width > 0 && x.height > 0);
    if (imgs.length === 0) return null;
    const maxW = Math.max(...imgs.map((i) => i.width));
    const maxH = Math.max(...imgs.map((i) => i.height));
    const cols = Math.ceil(Math.sqrt(imgs.length));
    const rows = Math.ceil(imgs.length / cols);
    const cellW = maxW + 4;
    const cellH = maxH + 4;
    const atlasW = nextPow2(cols * cellW);
    const atlasH = nextPow2(rows * cellH);
    const canvas = document.createElement("canvas");
    canvas.width = atlasW;
    canvas.height = atlasH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.clearRect(0, 0, atlasW, atlasH);
    const uvRects = new Float32Array(4 * imgs.length);
    const aspects: number[] = [];
    imgs.forEach((img, idx) => {
      const r = Math.floor(idx / cols);
      const x = (idx % cols) * cellW + 2;
      const y = r * cellH + 2;
      ctx.drawImage(img, x, y, img.width, img.height);
      const base = 4 * idx;
      uvRects[base] = (x + 0.5) / atlasW;
      uvRects[base + 1] = 1 - (y + img.height - 0.5) / atlasH;
      uvRects[base + 2] = (img.width - 1) / atlasW;
      uvRects[base + 3] = (img.height - 1) / atlasH;
      aspects[idx] = img.width / img.height;
    });
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return { texture, uvRects, aspects };
  });
  return cachedAtlasPromise;
}

export default function FallingStickers3D({ active = true }: { active?: boolean; zOffset?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { camera, gl, size } = useThree();
  const isMobile = size.width < 1024;

  const [atlas, setAtlas] = useState<AtlasData | null>(null);
  useEffect(() => {
    let mounted = true;
    loadStickerAtlas().then((res) => {
      if (mounted && res) setAtlas(res);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(2, 2);
    g.setAttribute("uvRect", new THREE.InstancedBufferAttribute(new Float32Array(8192), 4));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const material = useMemo(() => {
    if (!atlas) return null;
    return new THREE.ShaderMaterial({
      uniforms: { map: { value: atlas.texture } },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
      toneMapped: false,
    });
  }, [atlas]);
  useEffect(() => () => material?.dispose(), [material]);

  const particlesRef = useRef<Particle[]>([]);
  const initedRef = useRef(false);
  const elapsedRef = useRef(0);
  const nextEmitRef = useRef(0);
  const activeTexSet = useRef(new Set<number>());
  const renderListRef = useRef<Particle[]>([]);
  const dummyObj = useRef(new THREE.Object3D());
  const raycaster = useRef(new THREE.Raycaster());
  const ndc = useRef(new THREE.Vector2());
  const planeZ0 = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
  const localHit = useRef(new THREE.Vector3());

  useEffect(() => {
    if (!atlas || initedRef.current) return;
    initedRef.current = true;
    elapsedRef.current = 0;
    nextEmitRef.current = 0;
    const batch = createBatch(CONFIG.particleCount, atlas.aspects.length, false);
    for (const p of batch) {
      resetParticle(p, CONFIG, "scroll");
      // Distribute initial Y across the fall range so stickers are immediately visible in the hero!
      p.position.y = p.startY - Math.random() * CONFIG.fallDistance * 0.85;
    }
    particlesRef.current = batch;
  }, [atlas]);

  const spawnBurst = useCallback(
    (localPt: THREE.Vector3) => {
      if (!atlas) return;
      const batch = createBatch(CONFIG.particleCount, atlas.aspects.length, true);
      let delay = 0.05 * Math.random();
      for (const p of batch) {
        p.hasStarted = false;
        p.dead = false;
        p.emitAt = elapsedRef.current + delay;
        delay += 0.04 + 0.04 * Math.random();
        p.originX = localPt.x;
        p.originY = localPt.y - CONFIG.positionY;
        p.originZ = 0;
      }
      particlesRef.current = pruneParticles(particlesRef.current.concat(batch));
    },
    [atlas],
  );

  useEffect(() => {
    if (isMobile || !active) return;
    const dom = gl.domElement;
    if (!dom) return;

    let downState: {
      id: number;
      pointerType: string;
      startX: number;
      startY: number;
      startAt: number;
      cancelled: boolean;
    } | null = null;

    const onDown = (e: PointerEvent) => {
      if (!e.isPrimary) return;
      if ((e.pointerType === "mouse" || e.pointerType === "pen") && e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest?.("a, button, nav, input, textarea, [role='button'], [data-ui]")) return;
      downState = {
        id: e.pointerId,
        pointerType: e.pointerType,
        startX: e.clientX,
        startY: e.clientY,
        startAt: e.timeStamp || performance.now(),
        cancelled: false,
      };
    };

    const onMove = (e: PointerEvent) => {
      if (!downState || e.pointerId !== downState.id || downState.cancelled) return;
      const dx = e.clientX - downState.startX;
      const dy = e.clientY - downState.startY;
      const tol = downState.pointerType === "touch" ? 10 : 4;
      if (dx * dx + dy * dy > tol * tol) downState.cancelled = true;
    };

    const onUp = (e: PointerEvent) => {
      const st = downState;
      if (!st || e.pointerId !== st.id) return;
      downState = null;
      if (st.cancelled || (e.timeStamp || performance.now()) - st.startAt > 600) return;
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) return;

      const rect = dom.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;

      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      ndc.current.set(nx, ny);
      raycaster.current.setFromCamera(ndc.current, camera);
      const hit = new THREE.Vector3();
      if (!raycaster.current.ray.intersectPlane(planeZ0.current, hit)) return;
      localHit.current.copy(hit);
      groupRef.current?.worldToLocal(localHit.current);
      spawnBurst(localHit.current);
    };

    const onCancel = (e: PointerEvent) => {
      if (downState && e.pointerId === downState.id) downState = null;
    };

    window.addEventListener("pointerdown", onDown, { capture: true, passive: true });
    window.addEventListener("pointermove", onMove, { capture: true, passive: true });
    window.addEventListener("pointerup", onUp, { capture: true, passive: true });
    window.addEventListener("pointercancel", onCancel, { capture: true, passive: true });
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("pointercancel", onCancel, true);
    };
  }, [camera, gl.domElement, isMobile, active, spawnBurst]);

  useFrame((_state, delta) => {
    const inst = meshRef.current;
    if (!inst || !atlas || !initedRef.current || !active) {
      if (inst) {
        inst.count = 0;
        inst.visible = false;
      }
      return;
    }

    const dt = Math.min(delta, 0.1);
    elapsedRef.current += dt;
    const now = elapsedRef.current;
    const particles = particlesRef.current;
    const activeSet = activeTexSet.current;
    activeSet.clear();

    for (const p of particles) {
      if (!p.isOneShot && !p.dead && p.hasStarted) {
        activeSet.add(p.textureIndex);
      }
    }

    const sorted = renderListRef.current;
    sorted.length = 0;
    let needsPrune = false;

    for (const p of particles) {
      if (!p.hasStarted) {
        if (now < p.emitAt) continue;
        resetParticle(p, CONFIG, p.isOneShot ? "click" : "scroll");
        p.hasStarted = true;
      }
      if (p.dead) {
        if (p.isOneShot) needsPrune = true;
        continue;
      }

      p.position.y -= p.fallSpeed * dt;
      const sway = Math.sin(now * CONFIG.windFrequency + p.windPhase) * p.windAmplitude;
      p.position.x += sway * dt;
      p.rotation += p.rotationSpeed * dt;

      const progress = (p.startY - p.position.y) / CONFIG.fallDistance;
      const clamped = THREE.MathUtils.clamp(progress, 0, 1);
      let lifeScale = 1;
      const enterR = CONFIG.enterDurationRatio;
      if (enterR > 0 && clamped < enterR) {
        lifeScale = clamped / enterR;
      } else if (clamped > 0.9) {
        lifeScale = (1 - clamped) / 0.1;
      }
      lifeScale = THREE.MathUtils.clamp(lifeScale, 0, 1);

      if (p.position.y < p.startY - CONFIG.fallDistance) {
        if (p.isOneShot) {
          p.dead = true;
          needsPrune = true;
          continue;
        }
        activeSet.delete(p.textureIndex);
        p.textureIndex = pickUnusedTexture(atlas.aspects.length, activeSet);
        p.emitAt = Math.max(nextEmitRef.current, now) + (0.04 + 0.04 * Math.random());
        nextEmitRef.current = p.emitAt;
        p.hasStarted = false;
        continue;
      }

      p.scale = lifeScale;
      if (sorted.length < 96) insertSortedByZ(sorted, p);
      else sorted.push(p);
    }

    if (needsPrune) {
      particlesRef.current = pruneParticles(particles.filter((p) => !p.isOneShot || !p.dead));
    }
    if (sorted.length > 96) {
      sorted.sort((a, b) => a.position.z - b.position.z);
    }

    const uvAttr = geometry.getAttribute("uvRect") as THREE.InstancedBufferAttribute;
    const count = Math.min(sorted.length, 2048);
    const dummy = dummyObj.current;

    for (let i = 0; i < count; i++) {
      const p = sorted[i];
      const aspect = atlas.aspects[p.textureIndex] ?? 1;
      const s = (p.isOneShot ? CONFIG.clickScale : CONFIG.scale) * p.scale;
      const uIdx = 4 * p.textureIndex;
      dummy.position.copy(p.position);
      dummy.rotation.set(0, 0, p.rotation);
      dummy.scale.set(s * aspect, s, 1);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
      uvAttr.setXYZW(
        i,
        atlas.uvRects[uIdx],
        atlas.uvRects[uIdx + 1],
        atlas.uvRects[uIdx + 2],
        atlas.uvRects[uIdx + 3],
      );
    }

    inst.count = count;
    inst.visible = count > 0;
    inst.instanceMatrix.needsUpdate = true;
    uvAttr.needsUpdate = true;
  });

  return (
    <group ref={groupRef}>
      {atlas && material ? <instancedMesh ref={meshRef} args={[geometry, material, 2048]} frustumCulled={false} /> : null}
    </group>
  );
}
