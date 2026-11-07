import { useEffect } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";

/**
 * Shared "liquid jelly" state for every gel lettering (hero name, closing block).
 *
 * Clicking a gel word fires a radial liquid ripple through the tube from the hit point
 * (uClick) and kicks a damped spring (uWob) so the whole word jiggles and settles like
 * jelly — matching the reference site's balloon type. All gel materials share one uniform
 * set, advanced by a single global rAF loop so every canvas stays in sync.
 */

export const jellyUniforms = {
  uTime: { value: 0 },
  uClick: { value: new THREE.Vector4(0, 0, 0, -1000) }, // xyz = world hit point, w = click time
  uWob: { value: 0 }, // damped-spring amplitude, kicked by each click
  uPointer: { value: new THREE.Vector3(0, 0, 0) }, // world-space cursor on the text plane
  uPointerGlow: { value: 0 }, // 0..1 cursor glow strength (eases in/out)
};

const spring = { t: 0, w: 0, v: 0, glow: 0 };
const K = 36; // stiffness
const C = 4.2; // damping (underdamped → visible jiggle before settling)

let looping = false;
let lastNow = 0;

function step(now: number) {
  const dt = Math.min(Math.max((now - (lastNow || now)) / 1000, 0), 0.05);
  lastNow = now;
  spring.t += dt;
  spring.v += (-K * spring.w - C * spring.v) * dt;
  spring.w += spring.v * dt;
  spring.glow = Math.min(1, Math.abs(spring.w) * 1.1 + Math.abs(spring.v) * 0.28);
  jellyUniforms.uTime.value = spring.t;
  jellyUniforms.uWob.value = spring.w;
  requestAnimationFrame(step);
}

export function ensureJellyLoop() {
  if (looping || typeof requestAnimationFrame === "undefined") return;
  looping = true;
  requestAnimationFrame(step);
}

/** Kick the jelly: radial ripple from the world-space hit point + spring impulse. */
export function kickJelly(point: THREE.Vector3) {
  ensureJellyLoop();
  jellyUniforms.uClick.value.set(point.x, point.y, point.z, spring.t);
  spring.v += 4.2;
}

/** Current wobble intensity 0..1 for material FX (iridescence, env boost, glow). */
export function jellyGlow() {
  return spring.glow;
}

/**
 * Feed the cursor position (world space, on the text plane) into the shared glow uniforms.
 * Strength eases toward `active` each call so the highlight fades in/out smoothly.
 */
export function setJellyPointer(x: number, y: number, z: number, active: boolean) {
  jellyUniforms.uPointer.value.set(x, y, z);
  const g = jellyUniforms.uPointerGlow;
  g.value += ((active ? 1 : 0) - g.value) * 0.12;
}

// dev-only handle so the glow can be inspected from the console
if (typeof window !== "undefined") {
  (window as unknown as { __jelly?: typeof jellyUniforms }).__jelly = jellyUniforms;
}

const VERT_DECL = /* glsl */ `
uniform float uTime;
uniform vec4 uClick;
uniform float uWob;
varying vec3 vJw;
`;

const VERT_BODY = /* glsl */ `
{
  vec4 jw = modelMatrix * vec4( transformed, 1.0 );
  vJw = jw.xyz;
  float jage = max( uTime - uClick.w, 0.0 );
  float jd = distance( jw.xyz, uClick.xyz );
  float jenv = exp( -jage * 1.35 ) * exp( -jd * 0.38 );
  float jphase = jd * 1.6 - jage * 6.4;
  float jwave = sin( jphase ) * jenv;
  vec3 jdir = normalize( jw.xyz - uClick.xyz + vec3( 0.0001 ) );
  vec3 jsway = vec3(
    sin( jw.y * 1.25 + uTime * 2.05 ),
    cos( jw.x * 1.05 - uTime * 1.75 ),
    sin( ( jw.x + jw.y ) * 0.8 + uTime * 1.35 )
  );
  transformed += objectNormal * ( jwave * 0.42 + 0.012 * sin( jw.x * 1.6 + jw.y * 1.1 + uTime * 1.1 ) );
  transformed += jsway * ( uWob * 0.16 );
  float jderv = jenv * cos( jphase ) * 0.26;
  vec3 jdirV = normalize( mat3( viewMatrix ) * jdir );
  vNormal = normalize( vNormal + jdirV * jderv + normalMatrix * jsway * ( uWob * 0.10 ) );
}
`;

const FRAG_DECL = /* glsl */ `
uniform float uWob;
uniform vec3 uPointer;
uniform float uPointerGlow;
varying vec3 vJw;
`;

const FRAG_BODY = /* glsl */ `
{
  float jfres = pow( 1.0 - saturate( dot( normalize( vViewPosition ), normal ) ), 2.2 );
  totalEmissiveRadiance += mix( vec3( 0.10, 0.22, 0.9 ), vec3( 0.45, 0.7, 1.0 ), jfres ) * jfres * abs( uWob ) * 0.5;
  float pd = distance( vJw.xy, uPointer.xy );
  float pg = exp( -pd * pd * 5.2 ) * uPointerGlow;
  vec3 pcol = mix( vec3( 0.24, 0.62, 1.0 ), vec3( 0.62, 0.9, 1.0 ), smoothstep( 0.25, 1.0, pg ) );
  totalEmissiveRadiance += pcol * pg * 1.25;
}
`;

/** Inject the jelly ripple/sway into a gel material's shader (shared uniforms). */
export function attachJelly(mat: THREE.MeshPhysicalMaterial) {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, jellyUniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\n" + VERT_DECL)
      .replace("#include <begin_vertex>", "#include <begin_vertex>\n" + VERT_BODY);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\n" + FRAG_DECL)
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n" + FRAG_BODY);
  };
  mat.customProgramCacheKey = () => "gel-jelly";
}

/**
 * Raycast window clicks against the gel meshes; on a hit, kick the jelly from that point.
 * Clicks that land on the DOM above the canvas still fire (window listener), exactly like
 * the reference where clicking the text through the overlaying headline wobbles it.
 */
export function useJellyClick(meshes: THREE.Object3D[], enabled = true) {
  const { camera, gl } = useThree();
  useEffect(() => {
    if (!enabled || !meshes.length) return;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const onDown = (e: PointerEvent) => {
      const r = gl.domElement.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 2 - 1;
      const y = -((e.clientY - r.top) / r.height) * 2 + 1;
      if (x < -1 || x > 1 || y < -1 || y > 1) return;
      ndc.set(x, y);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(meshes, false)[0];
      if (hit) kickJelly(hit.point);
    };
    ensureJellyLoop();
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => window.removeEventListener("pointerdown", onDown);
  }, [meshes, camera, gl, enabled]);
}
