import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { buildBalloonText } from "./balloonType";
import { buildFontText, useScriptFont } from "./fontText";
import { makeGelMaterial } from "./shared";
import { jellyGlow, useJellyClick } from "./jelly";
import { usePointer } from "@/hooks/useScroll";

type Ref = { current: number };

const MAX_TILT = THREE.MathUtils.degToRad(2.8); // ≤ 3° pointer parallax, nothing else

/**
 * 3D balloon lettering with a liquid-jelly response to clicks: hitting a word fires a radial
 * ripple through the tube and kicks a damped spring wobble (see ./jelly). Otherwise the text
 * only has a slow idle float (±0.04) and a gentle pointer parallax tilt (≤ 3°).
 * `cursive` builds connected handwriting tubes ("kirtan kumar" / "sanghi"); `upper` builds
 * the stacked uppercase closing block ("CODE" / "& CARE").
 */
export default function JellyText({
  lines,
  upper = false,
  cursive = false,
  rotZ = 0,
  fitW = 0.8,
  fitH = 0.7,
  cy = 0,
  scroll,
  reduced = false,
  onRect,
}: {
  lines: string[];
  upper?: boolean;
  cursive?: boolean;
  rotZ?: number;
  fitW?: number;
  fitH?: number;
  cy?: number;
  scroll?: Ref;
  tilt?: number;
  float?: number;
  jelly?: number;
  pop?: boolean | number;
  reduced?: boolean;
  onRect?: (r: { x0: number; y0: number; x1: number; y1: number }) => void;
}) {
  const outer = useRef<THREE.Group>(null);
  const { viewport, camera, size, gl } = useThree();
  const ptr = usePointer();
  const material = useMemo(() => makeGelMaterial(), []);
  const font = useScriptFont(); // suspends until the script font is parsed

  const text = useMemo(() => {
    if (cursive) return buildFontText(font, lines, material);
    const t = buildBalloonText(lines, { upper, letterGap: 0.05, lineGap: 0.3 });
    t.letters.forEach((m) => (m.material = material));
    return { group: t.group, width: t.width, height: t.height, meshes: t.letters };
  }, [lines, upper, cursive, material, font]);

  useJellyClick(text.meshes, !reduced);

  const fit = useMemo(() => {
    const c = Math.abs(Math.cos(rotZ));
    const sn = Math.abs(Math.sin(rotZ));
    const rw = text.width * c + text.height * sn;
    const rh = text.width * sn + text.height * c;
    return Math.min((viewport.width * fitW) / rw, (viewport.height * fitH) / rh);
  }, [viewport, text, fitW, fitH, rotZ]);

  const box = useMemo(() => new THREE.Box3(), []);
  const corner = useMemo(() => new THREE.Vector3(), []);
  const frameN = useRef(0);

  useEffect(() => {
    frameN.current = 0;
  }, [fit]);

  useFrame((state, delta) => {
    const g = outer.current;
    if (!g) return;
    const dt = Math.min(delta, 0.045);
    const t = state.clock.elapsedTime;
    const glow = reduced ? 0 : jellyGlow();
    material.iridescence = 0.06 + glow * 0.85;
    material.envMapIntensity = 0.95 + glow * 1.1;
    const p = scroll ? THREE.MathUtils.clamp(scroll.current, 0, 1) : 0;

    if (reduced) {
      g.rotation.set(0, 0, rotZ);
      g.position.set(0, viewport.height * cy, 0);
      g.scale.setScalar(fit);
    } else {
      const ty = THREE.MathUtils.clamp(ptr.current.tx * MAX_TILT, -MAX_TILT, MAX_TILT);
      const tx = THREE.MathUtils.clamp(-ptr.current.ty * MAX_TILT * 0.7, -MAX_TILT, MAX_TILT);
      g.rotation.z = rotZ;
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, ty, 3.2, dt);
      g.rotation.x = THREE.MathUtils.damp(g.rotation.x, tx, 3.2, dt);
      g.position.y = viewport.height * cy + Math.sin(t * 0.55) * 0.038;
      g.position.x = Math.cos(t * 0.4) * 0.025;
      g.scale.setScalar(fit * (1 + 0.06 * p));
    }

    if (onRect && (frameN.current < 3 || ++frameN.current % 30 === 0)) {
      frameN.current++;
      g.updateWorldMatrix(true, true);
      box.setFromObject(text.group);
      const cr = gl.domElement.getBoundingClientRect(); // report in client coordinates
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (let i = 0; i < 8; i++) {
        corner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(camera);
        const sx = (corner.x * 0.5 + 0.5) * size.width + cr.left;
        const sy = (-corner.y * 0.5 + 0.5) * size.height + cr.top;
        x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
      }
      onRect({ x0, y0, x1, y1 });
    }
  });

  return (
    <group ref={outer} rotation={[0, 0, rotZ]} scale={fit}>
      <primitive object={text.group} />
    </group>
  );
}
