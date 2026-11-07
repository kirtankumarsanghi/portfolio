import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useApp } from "@/lib/app-context";

/**
 * Exact 5-stage feedback ping-pong water / caustic bokeh background from curiositywen.design (sz / sV):
 *   1. vignette  — dynamic pointer-following vignette mixing uClearColor (bg) and uVignetteColor
 *   2. swirl     — radial swirl around the smoothed pointer UV
 *   3. sine      — sine-wave water ripple distortion
 *   4. shatter   — animated Voronoi cell refraction with softened cell edges & corners
 *   5. bokeh     — 32-iteration Golden Angle bokeh blur jittered by a 128×128 noise texture
 *   6. output    — clip-space full-screen composite with overlay base + output tint
 */

const LIGHT_BG = "#ffead6";
const LIGHT_VIGNETTE = "#6196ff";
const LIGHT_OUTPUT = "#acffb9";
const DARK_BG = "#2c4bd5";
const DARK_VIGNETTE = "#00000d";
const DARK_OUTPUT = "#00344C";

const THEME_MIX = {
  light: { outputMix: 0.65, edgeIntensity: -0.16 },
  dark: { outputMix: 0.95, edgeIntensity: -0.82 },
} as const;

const DEFAULT_CONFIG = {
  resolutionScale: 0.3,
  vignette: {
    radius: 0.354,
    falloff: 1,
    mix: 1,
    displace: 0,
    skew: 0.54,
    angle: 0,
    edgeIntensity: 0,
  },
  swirl: {
    radius: 0.25,
    angle: 0.1,
    phase: 0,
    mix: 0.5,
    pinch: 0,
  },
  sine: {
    mixRadius: 1,
    frequency: 0.35,
    amplitude: 1.18,
    rotation: 0,
  },
  shatter: {
    amount: 1,
    spread: 0.9,
    angleDeg: -45,
    skew: 0.9,
    mixRadius: 1,
    mixRadiusInvert: 0,
  },
  bokeh: {
    radius: 0.754,
    tilt: 0.5,
    trackMouse: 0,
  },
  smoothing: 0.1,
  leaveSmoothing: 0.05,
};

const MOBILE_POS = new THREE.Vector2(0.5, -0.1);
const CENTER_POS = new THREE.Vector2(0.5, 0.5);

function colorToVec3(hex: string): THREE.Vector3 {
  const c = new THREE.Color(hex);
  return new THREE.Vector3(c.r, c.g, c.b);
}

function createNoiseTexture(size = 128): { texture: THREE.Texture; resolution: THREE.Vector2 } {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.needsUpdate = true;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return { texture: tex, resolution: new THREE.Vector2(size, size) };
}

const PASS_VERT = /* glsl */ `
precision mediump float;
precision mediump int;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const OUTPUT_VERT = /* glsl */ `
precision mediump float;
precision mediump int;

varying vec2 vUv;

void main() {
  vUv = uv;
  // Render in clip-space to fill the screen, ignoring camera transforms
  gl_Position = vec4(position, 1.0);
}
`;

const VIGNETTE_FRAG = /* glsl */ `
precision mediump float;
precision mediump int;
varying vec2 vUv;
uniform float uRadius;
uniform float uFalloff;
uniform float uMix;
uniform float uDisplace;
uniform float uSkew;
uniform float uAngle;
uniform vec3 uVignetteColor;
uniform vec2 uPos;
uniform vec2 uResolution;
uniform vec3 uClearColor;
uniform float uEdgeIntensity;

mat2 rot(float a) {
  return mat2(cos(a), -sin(a), sin(a), cos(a));
}
void main() {
  vec2 uv = vUv;
  vec4 color = vec4(vec3(1.), 0.);
  float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  float displacement = (luma - 0.5) * uDisplace * 0.5;
  vec2 aspectRatio = vec2(uResolution.x / uResolution.y, 1.0);
  vec2 skew = vec2(uSkew, 1.0 - uSkew);
  float halfRadius = uRadius * 0.5;
  float innerEdge = halfRadius - uFalloff * halfRadius * 0.5;
  float outerEdge = halfRadius + uFalloff * halfRadius * 0.5;
  vec2 pos = uPos;
  vec2 scaledUV = uv * aspectRatio * rot(uAngle * 6.28318530718) * skew;
  vec2 scaledPos = pos * aspectRatio * rot(uAngle * 6.28318530718) * skew;
  float radius = distance(scaledUV, scaledPos);
  float falloff = smoothstep(innerEdge + displacement, outerEdge + displacement, radius);

  float brighten = max(uEdgeIntensity, 0.0);
  float darken = max(-uEdgeIntensity, 0.0);
  falloff = mix(falloff, 0.0, brighten);
  falloff = mix(falloff, 1.0, darken);

  vec3 mixed = mix(uClearColor, uVignetteColor, falloff);
  gl_FragColor = vec4(mixed, falloff);
}
`;

const SWIRL_FRAG = /* glsl */ `
precision mediump float;
precision mediump int;
varying vec2 vUv;
uniform vec2 uResolution;
uniform sampler2D tInput;
uniform float uRadius;
uniform float uAngle;
uniform float uPhase;
uniform float uTime;
uniform float uMix;
uniform vec2 uPos;

void main() {
  vec2 uv = vUv;
  float angle = uAngle * 10.;
  vec2 originalUV = uv;
  vec2 pos = uPos;
  uv -= pos;
  vec2 R = vec2(uv.x * uResolution.x / uResolution.y, uv.y);
  float distanceToCenter = length(R);
  if (distanceToCenter <= uRadius) {
    float rot = atan(R.y, R.x) + angle * smoothstep(uRadius, 0., distanceToCenter);
    uv = vec2(cos(rot + uTime / 20. + uPhase * 6.28318530718), sin(rot + uTime / 20. + uPhase * 6.28318530718));
    uv = distanceToCenter * uv + pos;
  }
  float t = smoothstep(0., uRadius, distanceToCenter);
  vec2 mixedUV = mix(uv, originalUV, t);
  gl_FragColor = texture2D(tInput, mix(vUv, mixedUV, uMix));
}
`;

const SINE_FRAG = /* glsl */ `
precision mediump float;
precision mediump int;
varying vec2 vUv;
uniform sampler2D tInput;
uniform float uMixRadius;
uniform vec2 uPos;
uniform float uFrequency;
uniform float uAmplitude;
uniform float uRotation;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMousePos;
uniform float uTrackMouse;

void main() {
  vec2 uv = vUv;
  vec2 waveCoord = vUv.xy * 2.0 - 1.0;
  float time = uTime * 0.25;
  float frequency = 20.0 * uFrequency;
  float amp = uAmplitude * 0.2;
  float waveX = sin((waveCoord.y + uPos.y) * frequency + (time)) * amp;
  float waveY = sin((waveCoord.x - uPos.x) * frequency + (time)) * amp;
  waveCoord.xy += vec2(mix(waveX, 0., uRotation), mix(0., waveY, uRotation));
  vec2 finalUV = waveCoord * 0.5 + 0.5;
  float aspectRatio = uResolution.x / uResolution.y;
  vec2 mPos = uPos + mix(vec2(0.), (uMousePos - 0.5), uTrackMouse);
  float dist = (max(0., 1. - distance(uv * vec2(aspectRatio, 1.), mPos * vec2(aspectRatio, 1.)) * 4. * (1. - uMixRadius)));
  uv = mix(uv, finalUV, dist);
  gl_FragColor = texture2D(tInput, uv);
}
`;

const SHATTER_FRAG = /* glsl */ `
precision mediump float;
precision mediump int;
varying vec2 vUv;
uniform sampler2D tInput;
uniform float uAmount;
uniform float uSpread;
uniform float uAngle;
uniform float uTime;
uniform float uSkew;
uniform float uCellScale;
uniform vec2 uPos;
uniform vec2 uResolution;
uniform float uMixRadius;
uniform int uMixRadiusInvert;
uniform int uEasing;
uniform vec2 uMousePos;
uniform float uTrackMouse;
uniform float uRoundness;

vec2 random2(vec2 p) {
  return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}
mat2 rot(float a) { return mat2(cos(a), -sin(a), sin(a), cos(a)); }

float ease(int mode, float t) {
  if (mode == 1) { return 1.0 - (1.0 - t) * (1.0 - t); }
  if (mode == 2) { return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0; }
  return t;
}

void main() {
  vec2 uv = vUv;
  float aspectRatio = uResolution.x / uResolution.y;
  vec2 skew = mix(vec2(1.0), vec2(1.0, 0.0), uSkew);
  vec2 st = (uv - uPos) * vec2(aspectRatio, 1.0) * uCellScale * uAmount;
  st = st * rot(uAngle * 2.0 * 3.14159265359) * skew;
  vec2 i_st = floor(st);
  vec2 f_st = fract(st);

  float m_dist = 15.0;
  float m_dist2 = 15.0;
  vec2 m_point = vec2(0.0);
  vec2 diffBest = vec2(0.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 neighbor = vec2(float(i), float(j));
      vec2 point = random2(i_st + neighbor);
      point = 0.5 + 0.5 * sin(5.0 + uTime * 0.2 + 6.2831 * point);
      vec2 diff = neighbor + point - f_st;
      float dist = length(diff);
      if (dist < m_dist) {
        m_dist2 = m_dist;
        m_dist = dist;
        m_point = point;
        diffBest = diff;
      } else if (dist < m_dist2) {
        m_dist2 = dist;
      }
    }
  }

  vec2 offset = (m_point * 0.2 * uSpread * 2.0) - (uSpread * 0.2);
  float cornerSoft = smoothstep(0.0, max(0.0001, uRoundness) * 2.0, m_dist2 - m_dist);
  float edgeSoft = smoothstep(0.0, max(0.0001, uRoundness), m_dist) * cornerSoft;
  offset *= edgeSoft;

  vec2 mPos = uPos + mix(vec2(0.0), (uMousePos - 0.5), uTrackMouse);
  vec2 pos = mix(uPos, mPos, floor(uMixRadius));

  float rawDist = max(0.0, 1.0 - distance(uv * vec2(aspectRatio, 1.0), mPos * vec2(aspectRatio, 1.0)) * 4.0 * (1.0 - uMixRadius));
  if (uMixRadiusInvert == 1) { rawDist = 1.0 - rawDist; }
  float dist = ease(uEasing, rawDist);

  vec4 color = texture2D(tInput, uv + offset * dist);
  gl_FragColor = color;
}
`;

const BOKEH_FRAG = /* glsl */ `
precision mediump float;
precision mediump int;
varying vec2 vUv;
uniform sampler2D tInput;
uniform sampler2D tBlueNoise;
uniform float uAmount;
uniform float uTilt;
uniform float uTime;
uniform vec2 uPos;
uniform vec2 uResolution;
uniform vec2 uBlueNoiseResolution;
uniform vec2 uMousePos;
uniform float uTrackMouse;

#define PI 3.14159265
#define PI2 6.28318530718
#define ITERATIONS 32.0
#define GOLDEN_ANGLE 2.39996323

vec2 Sample(in float theta, inout float r) {
  r += 1.0 / r;
  return (r - 1.0) * vec2(cos(theta), sin(theta));
}

float getBlueNoiseOffset(vec2 st) {
  vec2 texSize = uBlueNoiseResolution;
  vec2 uv = fract(st * (uResolution / texSize) * vec2(texSize.x / texSize.y, 1.0));
  vec4 blueNoise = texture2D(tBlueNoise, uv);
  return mod((blueNoise.r - 0.5) * PI2, PI2);
}

vec4 Bokeh(sampler2D tex, vec2 uv, float blurRadius) {
  vec3 accumulatedColor = vec3(0.0);
  vec3 accumulatedWeights = vec3(0.0);
  float accumulatedAlpha = 0.0;
  float aspectRatio = uResolution.x / uResolution.y;
  vec2 basePixelSize = vec2(1.0 / aspectRatio, 1.0) * 0.04 * 0.075;
  float r = 1.0;
  float noiseOffset = (getBlueNoiseOffset(uv) - 0.5) * 0.01;
  float noiseAngle = noiseOffset * PI2;
  mat2 rotationMatrix = mat2(
    cos(noiseAngle), -sin(noiseAngle),
    sin(noiseAngle),  cos(noiseAngle)
  );
  for (float j = 0.0; j < GOLDEN_ANGLE * ITERATIONS; j += GOLDEN_ANGLE) {
    vec2 offset = Sample(j, r) * basePixelSize * blurRadius;
    float jitterAmount = 0.05 * (sin(j * 0.1) * 0.5 + 0.5);
    offset *= 1.0 + jitterAmount * sin(j * 0.7 + noiseOffset);
    vec2 sampleOffset = rotationMatrix * offset;
    vec4 colorSample = texture2D(tex, uv + sampleOffset);
    vec3 linearSample = colorSample.rgb;
    vec3 bokehWeight = vec3(5.0) + pow(linearSample, vec3(9.0)) * 150.0;
    accumulatedAlpha += colorSample.a;
    accumulatedColor += linearSample * bokehWeight;
    accumulatedWeights += bokehWeight;
  }
  vec3 linearOut = accumulatedColor / accumulatedWeights;
  return vec4(linearOut, accumulatedAlpha / ITERATIONS);
}

void main() {
  vec2 uv = vUv;
  if (uAmount == 0.0) { gl_FragColor = vec4(0.0); return; }
  vec2 pos = uPos + mix(vec2(0.0), (uMousePos - 0.5), uTrackMouse);
  float dis = distance(uv, pos) * 1000.0;
  float tilt = mix(1.0 - dis * 0.001, dis * 0.001, uTilt);
  float blurRadius = uAmount * tilt;
  gl_FragColor = Bokeh(tInput, uv, blurRadius);
}
`;

const OUTPUT_FRAG = /* glsl */ `
precision mediump float;
precision mediump int;
varying vec2 vUv;
uniform sampler2D tInput;
uniform vec3 uBgColor;
uniform vec3 uOutputColor;
uniform int uLoaded;
uniform float uOutputMix;

vec3 overlay(vec3 base, vec3 blend) {
  return mix(2.0 * base * blend, 1.0 - 2.0 * (1.0 - base) * (1.0 - blend), step(0.5, base));
}

void main() {
  if (uLoaded != 1) {
    gl_FragColor = vec4(197. / 255., 136. / 255., 122. / 255., 1.);
    return;
  }

  vec3 bgTex = vec3(1.0);
  vec3 base = mix(uBgColor, overlay(uBgColor, bgTex), 0.61);

  vec4 inTex = texture2D(tInput, vUv);
  vec3 tint = uOutputColor * 0.35;
  vec3 blend = clamp(inTex.rgb + tint, 0.0, 1.0);
  vec3 finalColor = base * mix(vec3(1.0), blend, clamp(uOutputMix, 0.0, 1.0));

  gl_FragColor = vec4(finalColor, 1.0);
  #include <colorspace_fragment>
}
`;

export const sharedPointer = {
  uv: new THREE.Vector2(0.5, 0.5),
  inside: true,
};

export default function WaterBg({ theme: themeOverride }: { theme?: "dark" | "light" } = {}) {
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const { theme: appTheme } = useApp();
  const theme = themeOverride ?? appTheme;
  const isMobile = size.width < 1024;
  const ks = DEFAULT_CONFIG;

  const resolution = useMemo(() => new THREE.Vector2(1, 1), []);
  const sharedPos = useMemo(() => new THREE.Vector2(0.5, 0.5), []);
  const timeUniform = useMemo(() => ({ value: 0 }), []);

  const { texture: noiseTexture, resolution: noiseRes } = useMemo(() => createNoiseTexture(128), []);
  useEffect(() => () => noiseTexture.dispose(), [noiseTexture]);

  const themeColors = useMemo(() => {
    const hex =
      theme === "light"
        ? { bg: LIGHT_BG, vignette: LIGHT_VIGNETTE, output: LIGHT_OUTPUT }
        : { bg: DARK_BG, vignette: DARK_VIGNETTE, output: DARK_OUTPUT };
    return {
      hex,
      vec: {
        bg: colorToVec3(hex.bg),
        vignette: colorToVec3(hex.vignette),
        output: colorToVec3(hex.output),
      },
      mix: THEME_MIX[theme],
    };
  }, [theme]);

  const pipeline = useMemo(() => {
    const makePass = (fragmentShader: string, extraUniforms: Record<string, { value: unknown }> = {}) =>
      new THREE.ShaderMaterial({
        vertexShader: PASS_VERT,
        fragmentShader,
        uniforms: {
          tInput: { value: null },
          uResolution: { value: resolution },
          uTime: timeUniform,
          uPos: { value: sharedPos },
          uMousePos: { value: new THREE.Vector2(0.5, 0.5) },
          uTrackMouse: { value: 1 },
          ...extraUniforms,
        },
        transparent: false,
        blending: THREE.NoBlending,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      });

    const vignetteMaterial = makePass(VIGNETTE_FRAG, {
      uRadius: { value: ks.vignette.radius },
      uFalloff: { value: ks.vignette.falloff },
      uMix: { value: ks.vignette.mix },
      uDisplace: { value: ks.vignette.displace },
      uSkew: { value: ks.vignette.skew },
      uAngle: { value: ks.vignette.angle },
      uEdgeIntensity: { value: themeColors.mix.edgeIntensity },
      uVignetteColor: { value: themeColors.vec.vignette.clone() },
      uColorAlpha: { value: 1 },
      uClearColor: { value: themeColors.vec.bg.clone() },
      uTrackMouse: { value: 1 },
    });

    const swirlMaterial = makePass(SWIRL_FRAG, {
      uRadius: { value: ks.swirl.radius },
      uAngle: { value: ks.swirl.angle },
      uPhase: { value: ks.swirl.phase },
      uMix: { value: ks.swirl.mix },
      uPinch: { value: ks.swirl.pinch },
    });

    const sineMaterial = makePass(SINE_FRAG, {
      uMixRadius: { value: ks.sine.mixRadius },
      uFrequency: { value: ks.sine.frequency },
      uAmplitude: { value: ks.sine.amplitude },
      uRotation: { value: ks.sine.rotation },
    });

    const shatterMaterial = makePass(SHATTER_FRAG, {
      uAmount: { value: ks.shatter.amount },
      uSpread: { value: ks.shatter.spread },
      uAngle: { value: ks.shatter.angleDeg / 360 },
      uSkew: { value: ks.shatter.skew },
      uCellScale: { value: 16 },
      uMixRadius: { value: ks.shatter.mixRadius },
      uMixRadiusInvert: { value: ks.shatter.mixRadiusInvert },
      uEasing: { value: 1 },
      uTrackMouse: { value: 0 },
      uPos: { value: new THREE.Vector2(0.5, 0.5) },
      uRoundness: { value: 0.02 },
    });

    const bokehMaterial = makePass(BOKEH_FRAG, {
      tBlueNoise: { value: noiseTexture },
      uBlueNoiseResolution: { value: noiseRes.clone() },
      uAmount: { value: 3.125 * ks.bokeh.radius },
      uTilt: { value: ks.bokeh.tilt },
      uPos: { value: new THREE.Vector2(0.5, 0.5) },
      uTrackMouse: { value: ks.bokeh.trackMouse },
    });

    const outputMaterial = makePass(OUTPUT_FRAG, {
      uBgColor: { value: themeColors.vec.bg.clone() },
      uOutputColor: { value: themeColors.vec.output.clone() },
      uLoaded: { value: 1 },
      uOutputMix: { value: themeColors.mix.outputMix },
    });
    outputMaterial.vertexShader = OUTPUT_VERT;
    outputMaterial.depthTest = false;
    outputMaterial.depthWrite = false;
    outputMaterial.toneMapped = false;
    outputMaterial.transparent = false;
    outputMaterial.blending = THREE.NoBlending;

    const prePasses = [
      { name: "vignette", material: vignetteMaterial },
      { name: "swirl", material: swirlMaterial },
      { name: "sine", material: sineMaterial },
      { name: "shatter", material: shatterMaterial },
      { name: "bokeh", material: bokehMaterial },
    ];
    const mouseConsumers = prePasses.filter((p) => p.name !== "shatter");

    return {
      prePasses,
      outputMaterial,
      vignetteMaterial,
      shatterMaterial,
      mouseConsumers,
    };
  }, [ks, resolution, sharedPos, timeUniform, noiseTexture, noiseRes, themeColors]);

  const targetsRef = useRef<{
    read: THREE.WebGLRenderTarget;
    write: THREE.WebGLRenderTarget;
  }>({
    read: new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false }),
    write: new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false }),
  });

  const frameCount = useRef(0);

  useEffect(() => {
    const w = Math.max(1, Math.floor(size.width * ks.resolutionScale));
    const h = Math.max(1, Math.floor(size.height * ks.resolutionScale));
    resolution.set(w, h);
    targetsRef.current.read.dispose();
    targetsRef.current.write.dispose();
    targetsRef.current = {
      read: new THREE.WebGLRenderTarget(w, h, { depthBuffer: false }),
      write: new THREE.WebGLRenderTarget(w, h, { depthBuffer: false }),
    };
    const prevTarget = gl.getRenderTarget();
    gl.setRenderTarget(targetsRef.current.read);
    gl.setClearColor(themeColors.hex.bg, 1);
    gl.clear();
    gl.setRenderTarget(prevTarget);
    frameCount.current = 0;
    pipeline.outputMaterial.uniforms.tInput.value = targetsRef.current.read.texture;
  }, [gl, ks.resolutionScale, resolution, size.width, size.height, themeColors.hex.bg, pipeline]);

  useEffect(
    () => () => {
      targetsRef.current.read.dispose();
      targetsRef.current.write.dispose();
    },
    [],
  );

  const fboScene = useMemo(() => new THREE.Scene(), []);
  const fboCamera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);
  const quadMeshRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    const geom = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geom, pipeline.prePasses[0]?.material);
    fboScene.add(mesh);
    quadMeshRef.current = mesh;
    return () => {
      fboScene.remove(mesh);
      geom.dispose();
    };
  }, [pipeline, fboScene]);

  useEffect(
    () => () => {
      pipeline.prePasses.forEach((p) => p.material.dispose());
      pipeline.outputMaterial.dispose();
    },
    [pipeline],
  );

  useEffect(() => {
    const track = isMobile ? 0 : 1;
    pipeline.prePasses.forEach((p) => {
      if (p.material.uniforms.uTrackMouse && p.name !== "shatter" && p.name !== "bokeh") {
        p.material.uniforms.uTrackMouse.value = track;
      }
    });
    pipeline.vignetteMaterial.uniforms.uPos?.value.copy(MOBILE_POS);
    pipeline.shatterMaterial.uniforms.uPos?.value.copy(MOBILE_POS);
    const bokehPass = pipeline.prePasses.find((p) => p.name === "bokeh");
    bokehPass?.material.uniforms.uPos?.value.copy(MOBILE_POS);
  }, [isMobile, pipeline]);

  // Pointer UV tracking in [0, 1] space (bottom-left origin matching WebGL UV)
  const pointerUvRef = useRef(new THREE.Vector2(0.5, 0.5));
  const pointerInsideRef = useRef(true);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointerInsideRef.current = true;
      sharedPointer.inside = true;
      const w = Math.max(1, window.innerWidth);
      const h = Math.max(1, window.innerHeight);
      const u = THREE.MathUtils.clamp(e.clientX / w, 0, 1);
      const v = THREE.MathUtils.clamp(1 - e.clientY / h, 0, 1);
      pointerUvRef.current.set(u, v);
      sharedPointer.uv.set(u, v);
    };
    const onLeave = () => {
      pointerInsideRef.current = false;
      sharedPointer.inside = false;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  const smoothedMouse = useMemo(() => new THREE.Vector2(0.5, 0.5), []);
  const targetMouse = useMemo(() => new THREE.Vector2(0.5, 0.5), []);
  const curBg = useMemo(() => themeColors.vec.bg.clone(), [themeColors]);
  const tgtBg = useMemo(() => themeColors.vec.bg.clone(), [themeColors]);
  const curVig = useMemo(() => themeColors.vec.vignette.clone(), [themeColors]);
  const tgtVig = useMemo(() => themeColors.vec.vignette.clone(), [themeColors]);
  const curOut = useMemo(() => themeColors.vec.output.clone(), [themeColors]);
  const tgtOut = useMemo(() => themeColors.vec.output.clone(), [themeColors]);

  useEffect(() => {
    tgtBg.copy(themeColors.vec.bg);
    tgtVig.copy(themeColors.vec.vignette);
    tgtOut.copy(themeColors.vec.output);
    pipeline.vignetteMaterial.uniforms.uEdgeIntensity.value = themeColors.mix.edgeIntensity;
    pipeline.outputMaterial.uniforms.uOutputMix.value = themeColors.mix.outputMix;
  }, [themeColors, tgtBg, tgtVig, tgtOut, pipeline]);

  useFrame((state) => {
    const targets = targetsRef.current;
    const quad = quadMeshRef.current;
    if (!targets || !quad) return;

    timeUniform.value = state.clock.getElapsedTime();

    if (isMobile) {
      sharedPos.copy(MOBILE_POS);
      pipeline.mouseConsumers.forEach((p) => {
        p.material.uniforms.uMousePos?.value.copy(MOBILE_POS);
      });
      pipeline.shatterMaterial.uniforms.uPos.value.copy(MOBILE_POS);
    } else {
      if (pointerInsideRef.current) {
        targetMouse.copy(pointerUvRef.current);
      } else {
        targetMouse.copy(CENTER_POS);
      }
      const alpha = pointerInsideRef.current ? ks.smoothing : ks.leaveSmoothing;
      smoothedMouse.lerp(targetMouse, alpha);
      sharedPos.copy(smoothedMouse);
      pipeline.mouseConsumers.forEach((p) => {
        p.material.uniforms.uMousePos?.value.copy(smoothedMouse);
      });
      pipeline.shatterMaterial.uniforms.uPos.value.copy(CENTER_POS);
    }

    curBg.lerp(tgtBg, ks.smoothing);
    curVig.lerp(tgtVig, ks.smoothing);
    curOut.lerp(tgtOut, ks.smoothing);

    pipeline.vignetteMaterial.uniforms.uVignetteColor.value.copy(curVig);
    pipeline.vignetteMaterial.uniforms.uClearColor.value.copy(curBg);
    pipeline.outputMaterial.uniforms.uBgColor.value.copy(curBg);
    pipeline.outputMaterial.uniforms.uOutputColor.value.copy(curOut);

    if (frameCount.current++ % 2 === 0) {
      const renderer = state.gl;
      const prevTarget = renderer.getRenderTarget();
      for (const pass of pipeline.prePasses) {
        if (pass.material.uniforms.tInput) {
          pass.material.uniforms.tInput.value = targets.read.texture;
        }
        quad.material = pass.material;
        renderer.setRenderTarget(targets.write);
        renderer.render(fboScene, fboCamera);
        const tmp = targets.read;
        targets.read = targets.write;
        targets.write = tmp;
      }
      renderer.setRenderTarget(prevTarget);
      pipeline.outputMaterial.uniforms.tInput.value = targets.read.texture;
    }
  }, -2);

  return (
    <mesh frustumCulled={false} renderOrder={-10}>
      <planeGeometry args={[2, 2]} />
      <primitive object={pipeline.outputMaterial} attach="material" />
    </mesh>
  );
}
