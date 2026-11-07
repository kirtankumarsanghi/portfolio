import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Effect, BlendFunction } from "postprocessing";
import { useFrame, useThree } from "@react-three/fiber";

/**
 * 8×8 Bayer ordered-dither dissolve, applied to the whole 3D scene.
 * progress 0 → 1: pixel size grows 3 → 10px, colour shifts toward a dark blue, then alpha hits 0.
 * Used to dissolve the hero name on exit and to resolve the closing letters in (progress 1 → 0).
 */

const FRAG = /* glsl */ `
uniform float uProgress;
uniform float uPixelMax;
uniform vec3 uFade;
uniform vec2 uResolution;

float bayer2(vec2 a){ a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
float bayer4(vec2 a){ return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a){ return bayer4(0.5 * a) * 0.25 + bayer2(a); }

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float p = clamp(uProgress, 0.0, 1.0);
  if (p <= 0.001) { outputColor = inputColor; return; }

  float px = mix(3.0, uPixelMax, p);
  vec2 grid = floor(uv * uResolution / max(px, 1.0));
  float threshold = bayer8(grid);

  vec3 col = mix(inputColor.rgb, uFade, smoothstep(0.0, 0.85, p));
  float alive = step(p * 0.985, threshold);
  outputColor = vec4(col, inputColor.a * alive);
}`;

export class DitherEffectImpl extends Effect {
  constructor() {
    super("DitherEffect", FRAG, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ["uProgress", new THREE.Uniform(0)],
        ["uPixelMax", new THREE.Uniform(10)],
        ["uFade", new THREE.Uniform(new THREE.Color("#081046"))],
        ["uResolution", new THREE.Uniform(new THREE.Vector2(1, 1))],
      ]),
    });
  }
  get progress() {
    return this.uniforms.get("uProgress")!.value as number;
  }
  set progress(v: number) {
    this.uniforms.get("uProgress")!.value = v;
  }
}

/** Mount inside <EffectComposer>. Drives progress from a ref so GSAP scrub can push it. */
export default function DitherPass({ progress }: { progress: { current: number } }) {
  const effect = useMemo(() => new DitherEffectImpl(), []);
  const { size, gl } = useThree();
  const res = useRef(new THREE.Vector2());

  useEffect(() => () => effect.dispose(), [effect]);

  useEffect(() => {
    const dpr = Math.min(gl.getPixelRatio(), 2);
    res.current.set(size.width * dpr, size.height * dpr);
    (effect.uniforms.get("uResolution")!.value as THREE.Vector2).copy(res.current);
  }, [size, gl, effect]);

  useFrame(() => {
    const next = Math.max(0, Math.min(1, progress.current));
    if (Math.abs(next - effect.progress) > 0.0005) effect.progress = next;
  });

  return <primitive object={effect} />;
}
