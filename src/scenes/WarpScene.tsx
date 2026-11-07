import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { usePointer } from "@/hooks/useScroll";

type NumRef = { current: number };

const COUNT = 1200;
// cyan / magenta / violet / white (weighted)
const PALETTE = ["#19e6ff", "#19e6ff", "#ff2bd6", "#ff2bd6", "#8a4dff", "#8a4dff", "#ffffff"];

/**
 * ~900 instanced screen-space streaks radiating from a vanishing point.
 * 2–4px wide quads, 5%–45% of the screen long, additive. Speed + length + brightness follow scroll velocity.
 */
function Streaks({ speed }: { speed: NumRef }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const { size, gl } = useThree();
  const ptr = usePointer();
  const travel = useRef(0);
  const boost = useRef(0);
  const vp = useRef({ x: 0, y: 0 });

  const geometry = useMemo(() => {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([-1, 0, 0, 1, 0, 0, -1, 1, 0, 1, 1, 0], 3));
    g.setIndex([0, 1, 2, 2, 1, 3]);
    const angle = new Float32Array(COUNT);
    const phase = new Float32Array(COUNT);
    const len = new Float32Array(COUNT);
    const width = new Float32Array(COUNT);
    const mul = new Float32Array(COUNT);
    const color = new Float32Array(COUNT * 3);
    const c = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      angle[i] = Math.random() * Math.PI * 2;
      phase[i] = Math.random();
      len[i] = 0.05 + Math.pow(Math.random(), 1.5) * 0.4;
      width[i] = 2.4 + Math.random() * 2.6; // 2–4px (× DPR), a touch thicker than before
      mul[i] = 0.6 + Math.random() * 0.8;
      c.set(PALETTE[Math.floor(Math.random() * PALETTE.length)]);
      const b = 0.85 + Math.random() * 0.5;
      color[i * 3] = c.r * b;
      color[i * 3 + 1] = c.g * b;
      color[i * 3 + 2] = c.b * b;
    }
    g.setAttribute("aAngle", new THREE.InstancedBufferAttribute(angle, 1));
    g.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phase, 1));
    g.setAttribute("aLen", new THREE.InstancedBufferAttribute(len, 1));
    g.setAttribute("aWidth", new THREE.InstancedBufferAttribute(width, 1));
    g.setAttribute("aMul", new THREE.InstancedBufferAttribute(mul, 1));
    g.setAttribute("aColor", new THREE.InstancedBufferAttribute(color, 3));
    g.instanceCount = COUNT;
    return g;
  }, []);

  const uniforms = useMemo(
    () => ({
      uRes: { value: new THREE.Vector2(1, 1) },
      uVP: { value: new THREE.Vector2(0, 0) },
      uTravel: { value: 0 },
      uBoost: { value: 0 },
      uDpr: { value: 1 },
    }),
    [],
  );

  useFrame((_, delta) => {
    const m = mat.current;
    if (!m) return;
    const dt = Math.min(delta, 0.05);
    boost.current = THREE.MathUtils.damp(boost.current, Math.min(1, speed.current), 3, dt);
    travel.current += dt * (0.1 + boost.current * 1.6);
    const dpr = gl.getPixelRatio();
    const w = size.width * dpr;
    const h = size.height * dpr;
    vp.current.x = THREE.MathUtils.damp(vp.current.x, ptr.current.tx * 0.085, 3, dt);
    vp.current.y = THREE.MathUtils.damp(vp.current.y, ptr.current.ty * 0.085, 3, dt);
    const u = m.uniforms;
    u.uRes.value.set(w, h);
    u.uVP.value.set(w / 2 + vp.current.x * w, h / 2 + vp.current.y * h);
    u.uTravel.value = travel.current;
    u.uBoost.value = boost.current;
    u.uDpr.value = dpr;
  });

  return (
    <mesh geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
        // the (perp, dir) basis mirrors the quad → clockwise winding; without this every streak is back-face culled
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        vertexShader={/* glsl */ `
          attribute float aAngle;
          attribute float aPhase;
          attribute float aLen;
          attribute float aWidth;
          attribute float aMul;
          attribute vec3 aColor;
          uniform vec2 uRes;
          uniform vec2 uVP;
          uniform float uTravel;
          uniform float uBoost;
          uniform float uDpr;
          varying vec3 vColor;
          varying float vAlpha;
          varying float vAlong;
          varying float vAcross;
          void main() {
            float t = fract(aPhase + uTravel * aMul);
            float diag = length(uRes);
            float minR = diag * 0.006;                      // tiny core only — a larger value reads as a black disc
            float head = minR + pow(t, 2.1) * diag * 0.62;
            float lenPx = aLen * diag * mix(0.3, 1.0, t) * (1.0 + uBoost * 1.5);
            float tail = max(head - lenPx, minR);
            vec2 dir = vec2(cos(aAngle), sin(aAngle));
            vec2 perp = vec2(-dir.y, dir.x);
            float along = position.y;
            float r = mix(tail, head, along);
            float wPx = aWidth * uDpr * (0.55 + 0.95 * t);
            vec2 px = uVP + dir * r + perp * position.x * wPx * 0.5;
            vec2 ndc = px / uRes * 2.0 - 1.0;
            gl_Position = vec4(ndc, 0.0, 1.0);
            // kept low: 1200 additive streaks cover most of the frame, so alpha is what holds the black
            vAlpha = smoothstep(0.0, 0.07, t) * (1.0 - smoothstep(0.86, 1.0, t)) * 0.34;
            vColor = aColor * (1.15 + uBoost * 0.9);
            vAlong = along;
            vAcross = position.x;
          }
        `}
        fragmentShader={/* glsl */ `
          varying vec3 vColor;
          varying float vAlpha;
          varying float vAlong;
          varying float vAcross;
          void main() {
            float core = 1.0 - pow(abs(vAcross), 2.2);
            float a = vAlpha * mix(0.05, 1.0, pow(vAlong, 2.1)) * core;
            gl_FragColor = vec4(vColor, clamp(a, 0.0, 1.0));
            #include <colorspace_fragment>
          }
        `}
      />
    </mesh>
  );
}

export default function WarpScene({ speed, active }: { speed: NumRef; active: boolean }) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 2]}
      // opaque black: additive streaks on a transparent canvas yield invalid premultiplied alpha
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
      aria-hidden="true"
    >
      <color attach="background" args={["#000000"]} />
      <Suspense fallback={null}>
        <Streaks speed={speed} />
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom mipmapBlur intensity={1.35} luminanceThreshold={0.2} luminanceSmoothing={0.35} radius={0.85} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
