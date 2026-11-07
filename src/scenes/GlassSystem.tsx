import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { sharedPointer } from "./WaterBg";

export interface GlassThemeParams {
  refractPower: number;
  chromaticAberration: number;
  diffuseness: number;
  shininess: number;
  fresnelPower: number;
  saturation: number;
  brightness: number;
  contrast: number;
  gamma: number;
  specularStrength: number;
  fresnelStrength: number;
  fresnelSideDir: [number, number, number];
  tintMix: number;
  tintColorA: string;
  tintColorB: string;
  tintThicknessMinAlpha: number;
  tintThicknessMaxAlpha: number;
  loop: number;
  lightZ: number;
}

const DARK_GLASS_PARAMS: GlassThemeParams = {
  refractPower: 0.72,
  chromaticAberration: 0.14,
  diffuseness: 0.05,
  shininess: 100,
  fresnelPower: 3,
  saturation: 1.2,
  brightness: 0.6,
  contrast: 0.98,
  gamma: 1.0,
  specularStrength: 1.2,
  fresnelStrength: 0.72,
  fresnelSideDir: [-1, 1, -1],
  tintMix: 1.0,
  tintColorA: "#64c3ff",
  tintColorB: "#8e9dc4",
  tintThicknessMinAlpha: 1.0,
  tintThicknessMaxAlpha: 0.4,
  loop: 3,
  lightZ: 0.5,
};

const LIGHT_GLASS_PARAMS: GlassThemeParams = {
  refractPower: 0.72,
  chromaticAberration: 0.14,
  diffuseness: 0.1,
  shininess: 120,
  fresnelPower: 1,
  saturation: 1.2,
  brightness: 0.78,
  contrast: 0.9,
  gamma: 1.0,
  specularStrength: 1.2,
  fresnelStrength: 0.24,
  fresnelSideDir: [-1, 1, -1],
  tintMix: 1.0,
  tintColorA: "#009dff",
  tintColorB: "#ffffff",
  tintThicknessMinAlpha: 1.0,
  tintThicknessMaxAlpha: 0.92,
  loop: 3,
  lightZ: 0.5,
};

interface GlassSystemContextValue {
  theme: "dark" | "light";
  params: GlassThemeParams;
  envMapBase: THREE.Texture;
  screenResolutionPx: THREE.Vector2;
  refractionResolutionPx: THREE.Vector2;
  glassLayer: number;
  sceneRefractionActiveRef: React.MutableRefObject<boolean>;
}

const GlassSystemContext = createContext<GlassSystemContextValue | null>(null);

export function useGlassSystem() {
  const ctx = useContext(GlassSystemContext);
  if (!ctx) throw new Error("useGlassSystem must be used within GlassSystemProvider");
  return ctx;
}

/**
 * Orbiting pointer light tracker (`ca` from curiositywen.design):
 * Unprojects pointer UV onto z=0 plane and smoothly orbits a light at radius hypot(4, 9).
 */
function createOrbitingLight() {
  const defaultX = 4;
  const defaultY = 9;
  const radius = Math.hypot(defaultX, defaultY);
  const defaultAngle = Math.atan2(defaultY, defaultX);
  let targetAngle = defaultAngle;
  let currentAngle = defaultAngle;

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hitPoint = new THREE.Vector3();
  const pos = new THREE.Vector2(defaultX, defaultY);

  return {
    update({
      uv,
      inside,
      camera,
      delta,
    }: {
      uv: THREE.Vector2;
      inside: boolean;
      camera: THREE.Camera;
      delta: number;
    }) {
      ndc.set(2 * uv.x - 1, 2 * uv.y - 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.ray.intersectPlane(plane, hitPoint);
      const hasHit = hit !== null;
      if (hasHit) hitPoint.copy(hit);
      const active = inside && hasHit;
      const lx = -hitPoint.x;
      const ly = -hitPoint.y;
      if (active && lx * lx + ly * ly > 1e-6) {
        targetAngle = Math.atan2(ly, lx);
      }
      const desired = active ? targetAngle : defaultAngle;
      const diff = Math.atan2(Math.sin(desired - currentAngle), Math.cos(desired - currentAngle));
      currentAngle = currentAngle + diff * (1 - Math.exp(-6 * delta));
      pos.x = radius * Math.cos(currentAngle);
      pos.y = radius * Math.sin(currentAngle);
      return { x: pos.x, y: pos.y };
    },
  };
}

export function centerGeometry(geo: THREE.BufferGeometry) {
  geo.computeBoundingBox();
  const box = geo.boundingBox;
  if (!box) return;
  const cx = (box.min.x + box.max.x) / 2;
  const cy = (box.min.y + box.max.y) / 2;
  const cz = (box.min.z + box.max.z) / 2;
  if (Math.abs(cx) + Math.abs(cy) + Math.abs(cz) >= 1e-8) {
    geo.translate(-cx, -cy, -cz);
    geo.computeBoundingSphere();
  }
}

function parseColorWithAlpha(input: string) {
  const color = new THREE.Color(input);
  let alpha = 1;
  const trimmed = input.trim();
  if (trimmed.startsWith("#")) {
    if (trimmed.length === 9) {
      alpha = parseInt(trimmed.slice(7, 9), 16) / 255;
    } else if (trimmed.length === 5) {
      const ch = trimmed.slice(4, 5);
      alpha = parseInt(ch + ch, 16) / 255;
    }
  }
  return { color, alpha };
}

/**
 * GlassSystemProvider (`cu` from curiositywen.design):
 * Renders Layer 0 (WaterBg + FallingStickers3D) into a half-resolution WebGLRenderTarget
 * before the main scene pass so Layer 10 glass meshes can refract it with chromatic dispersion.
 */
export function GlassSystemProvider({
  theme = "dark",
  children,
}: {
  theme?: "dark" | "light";
  children: React.ReactNode;
}) {
  const { size, camera, scene, gl, viewport } = useThree();
  const fboWidth = Math.max(1, Math.floor(0.5 * size.width * viewport.dpr));
  const fboHeight = Math.max(1, Math.floor(0.5 * size.height * viewport.dpr));

  const screenResolutionPx = useMemo(
    () => gl.getDrawingBufferSize(new THREE.Vector2()),
    [gl, size.width, size.height, viewport.dpr],
  );
  const refractionResolutionPx = useMemo(
    () => new THREE.Vector2(fboWidth, fboHeight),
    [fboWidth, fboHeight],
  );

  const fbo = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(fboWidth, fboHeight, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      stencilBuffer: false,
      depthBuffer: true,
      samples: 0,
    });
    return target;
  }, []);

  useEffect(() => {
    fbo.setSize(fboWidth, fboHeight);
  }, [fbo, fboWidth, fboHeight]);

  useEffect(() => () => fbo.dispose(), [fbo]);

  useEffect(() => {
    camera.layers.enable(10);
    camera.layers.enable(11);
  }, [camera]);

  const frameCounter = useRef(0);
  const sceneRefractionActiveRef = useRef(true);

  useFrame(() => {
    const isMobile = size.width < 768;
    const stride = isMobile ? 2 : 1;
    if (frameCounter.current++ % stride !== 0) return;

    const prevMask = camera.layers.mask;
    const prevTarget = gl.getRenderTarget();
    const prevAutoClear = gl.autoClear;

    gl.setRenderTarget(fbo);
    gl.clear();
    camera.layers.mask = 1; // Layer 0 only (WaterBg + FallingStickers3D)
    gl.render(scene, camera);

    camera.layers.mask = prevMask;
    gl.setRenderTarget(prevTarget);
    gl.autoClear = prevAutoClear;
  }, -1);

  const params = theme === "dark" ? DARK_GLASS_PARAMS : LIGHT_GLASS_PARAMS;

  const value = useMemo<GlassSystemContextValue>(
    () => ({
      theme,
      params,
      envMapBase: fbo.texture,
      screenResolutionPx,
      refractionResolutionPx,
      glassLayer: 10,
      sceneRefractionActiveRef,
    }),
    [theme, params, fbo.texture, screenResolutionPx, refractionResolutionPx],
  );

  return <GlassSystemContext.Provider value={value}>{children}</GlassSystemContext.Provider>;
}

/**
 * CameraRig (`cK` from curiositywen.design):
 * Horizontal FOV 60° on desktop / 38° on mobile, entry zoom 32 -> 24, and pointer parallax.
 */
export function CameraRig({
  scrollProgressRef,
  parallaxEnabled = true,
  parallaxStrength = 1.4,
  parallaxLag = 0.18,
  parallaxRotate = 0.12,
  leaveParallaxLag = 0.05,
  ready = true,
}: {
  scrollProgressRef?: React.MutableRefObject<number>;
  parallaxEnabled?: boolean;
  parallaxStrength?: number;
  parallaxLag?: number;
  parallaxRotate?: number;
  leaveParallaxLag?: number;
  ready?: boolean;
}) {
  const { size, camera } = useThree();
  const isMobile = size.width < 768;
  const hFov = size.width >= 1024 ? 60 : 38;

  const basePos = useRef<THREE.Vector2 | null>(null);
  const currentOffset = useRef(new THREE.Vector3());
  const currentLook = useRef(new THREE.Vector3());
  const targetOffset = useMemo(() => new THREE.Vector3(), []);
  const targetLook = useMemo(() => new THREE.Vector3(), []);
  const zeroVec = useMemo(() => new THREE.Vector3(), []);
  const entryProgress = useRef(0);

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const aspect = Math.max(1e-4, size.width / Math.max(1, size.height));
    const vFovRad = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(hFov) / 2) / aspect);
    const vFovDeg = THREE.MathUtils.radToDeg(vFovRad);
    if (Math.abs(camera.fov - vFovDeg) > 1e-4 || Math.abs(camera.aspect - aspect) > 1e-6) {
      camera.fov = vFovDeg;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }
  }, [size.width, size.height, hFov, camera]);

  useFrame((_state, delta) => {
    if (!basePos.current) {
      basePos.current = new THREE.Vector2(camera.position.x, camera.position.y);
    }
    const scrollP = THREE.MathUtils.clamp(scrollProgressRef?.current ?? 0, 0, 1);
    const baseZ = THREE.MathUtils.lerp(24, 32, scrollP);

    entryProgress.current = ready ? Math.min(entryProgress.current + delta / 1.2, 1) : 0;
    const t = entryProgress.current;
    // Smooth cubic ease-out matching reference customCubic
    const eased = 1 - Math.pow(1 - t, 3);
    camera.position.z = THREE.MathUtils.lerp(baseZ + 8, baseZ, eased);

    if (parallaxEnabled && !isMobile) {
      const nx = (0.5 - sharedPointer.uv.x) * 2;
      const ny = (0.5 - sharedPointer.uv.y) * 2;
      targetOffset.set(nx * parallaxStrength, ny * parallaxStrength * 0.6, 0);
      targetLook.set(-targetOffset.x * parallaxRotate, -targetOffset.y * parallaxRotate, 0);

      const lag = sharedPointer.inside ? parallaxLag : leaveParallaxLag;
      currentOffset.current.lerp(targetOffset, lag);
      currentLook.current.lerp(targetLook, lag);

      camera.position.x = basePos.current.x + currentOffset.current.x;
      camera.position.y = basePos.current.y + currentOffset.current.y;
      camera.lookAt(currentLook.current);
    } else {
      currentOffset.current.lerp(zeroVec, parallaxLag);
      currentLook.current.lerp(zeroVec, parallaxLag);
      camera.position.x = basePos.current.x;
      camera.position.y = basePos.current.y;
      camera.lookAt(0, 0, 0);
    }
  }, -2);

  return null;
}

const GLASS_VERTEX_SHADER = /* glsl */ `
varying vec3 worldNormal;
varying vec3 eyeVector;
varying float modelLocalY;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vec4 mvPosition = viewMatrix * worldPos;

  gl_Position = projectionMatrix * mvPosition;

  worldNormal = normalize(modelMatrix * vec4(normal, 0.0)).xyz;
  eyeVector = normalize(worldPos.xyz - cameraPosition);
  modelLocalY = position.y;
}
`;

const GLASS_FRAGMENT_SHADER = /* glsl */ `
uniform float uIorR;
uniform float uIorY;
uniform float uIorG;
uniform float uIorC;
uniform float uIorB;
uniform float uIorP;

uniform float uSaturation;
uniform float uChromaticAberration;
uniform float uRefractPower;
uniform float uFresnelPower;
uniform float uShininess;
uniform float uDiffuseness;
uniform vec3 uLight;

uniform float uBrightness;
uniform float uContrast;
uniform float uGamma;
uniform float uSpecularStrength;
uniform float uFresnelStrength;
uniform vec3 uFresnelSideDir;

uniform vec4 uTintColorA;
uniform vec4 uTintColorB;
uniform vec2 uTintLocalYRange;
uniform float uTintEnabled;
uniform float uTintMix;
uniform float uTintThicknessMinAlpha;
uniform float uTintThicknessMaxAlpha;

uniform vec2 uScreenResolutionPx;
uniform sampler2D uTexture;
uniform float uSceneRefractionEnabled;
uniform float uRgbRefraction;
uniform float uDark;
uniform int uLoop;

varying vec3 worldNormal;
varying vec3 eyeVector;
varying float modelLocalY;

float random(vec2 p){
  return fract(sin(dot(p.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

vec3 sat(vec3 rgb, float adjustment) {
  const vec3 W = vec3(0.2125, 0.7154, 0.0721);
  vec3 intensity = vec3(dot(rgb, W));
  return mix(intensity, rgb, adjustment);
}

float fresnel(vec3 eyeDir, vec3 normal, float power) {
  float fresnelFactor = abs(dot(eyeDir, normal));
  float inversefresnelFactor = 1.0 - fresnelFactor;
  return pow(inversefresnelFactor, power);
}

float specular(vec3 light, vec3 normal, vec3 eyeDir, float shininess, float diffuseness) {
  vec3 lightVector = normalize(-light);
  vec3 halfVector = normalize(eyeDir + lightVector);

  float NdotL = dot(normal, lightVector);
  float NdotH = abs(dot(normal, halfVector));
  float kDiffuse = max(0.0, NdotL);

  float kSpecular = pow(NdotH, shininess);
  return kSpecular + kDiffuse * diffuseness;
}

void main() {
  vec2 uv = gl_FragCoord.xy / max(uScreenResolutionPx.xy, vec2(1.0));
  vec3 normal = normalize(worldNormal);
  vec3 eyeDir = normalize(eyeVector);
  vec3 color;

  if (uSceneRefractionEnabled > 0.5) {
    color = vec3(0.0);

    float noiseIntensity = 0.025;
    float noise = random(uv) * noiseIntensity;

    if (uRgbRefraction > 0.5) {
      vec3 refractVecR = refract(eyeDir, normal, (1.0 / uIorR));
      vec3 refractVecG = refract(eyeDir, normal, (1.0 / uIorG));
      vec3 refractVecB = refract(eyeDir, normal, (1.0 / uIorB));

      for (int i = 0; i < 16; i++) {
        if (i >= uLoop) break;
        float slide = float(i) / float(uLoop) * 0.1 + noise;
        float offset = (uRefractPower + slide) * uChromaticAberration;

        color.r += texture2D(uTexture, uv + refractVecR.xy * offset).r;
        color.g += texture2D(uTexture, uv + refractVecG.xy * offset).g;
        color.b += texture2D(uTexture, uv + refractVecB.xy * offset).b;
      }
    } else {
      vec3 refractVecR = refract(eyeDir, normal, (1.0 / uIorR));
      vec3 refractVecY = refract(eyeDir, normal, (1.0 / uIorY));
      vec3 refractVecG = refract(eyeDir, normal, (1.0 / uIorG));
      vec3 refractVecC = refract(eyeDir, normal, (1.0 / uIorC));
      vec3 refractVecB = refract(eyeDir, normal, (1.0 / uIorB));
      vec3 refractVecP = refract(eyeDir, normal, (1.0 / uIorP));

      for (int i = 0; i < 16; i++) {
        if (i >= uLoop) break;
        float slide = float(i) / float(uLoop) * 0.1 + noise;

        float offsetR = (uRefractPower + slide * 1.0) * uChromaticAberration;
        float offsetY = (uRefractPower + slide * 1.0) * uChromaticAberration;
        float offsetG = (uRefractPower + slide * 2.0) * uChromaticAberration;
        float offsetC = (uRefractPower + slide * 2.5) * uChromaticAberration;
        float offsetB = (uRefractPower + slide * 3.0) * uChromaticAberration;
        float offsetP = (uRefractPower + slide * 1.0) * uChromaticAberration;

        float r = texture2D(uTexture, uv + refractVecR.xy * offsetR).x * 0.5;

        vec3 ySample = texture2D(uTexture, uv + refractVecY.xy * offsetY).xyz;
        float y = (ySample.x * 2.0 + ySample.y * 2.0 - ySample.z) / 6.0;

        float g = texture2D(uTexture, uv + refractVecG.xy * offsetG).y * 0.5;

        vec3 cSample = texture2D(uTexture, uv + refractVecC.xy * offsetC).xyz;
        float c = (cSample.y * 2.0 + cSample.z * 2.0 - cSample.x) / 6.0;

        float b = texture2D(uTexture, uv + refractVecB.xy * offsetB).z * 0.5;

        vec3 pSample = texture2D(uTexture, uv + refractVecP.xy * offsetP).xyz;
        float p = (pSample.z * 2.0 + pSample.x * 2.0 - pSample.y) / 6.0;

        float R = r + (2.0 * p + 2.0 * y - c) / 3.0;
        float G = g + (2.0 * y + 2.0 * c - p) / 3.0;
        float B = b + (2.0 * c + 2.0 * p - y) / 3.0;

        color.r += R;
        color.g += G;
        color.b += B;
      }
    }

    color /= float(uLoop);
  } else {
    color = texture2D(uTexture, uv).rgb;
  }

  color = sat(color, uSaturation);

  color *= uBrightness;
  color = (color - 0.5) * uContrast + 0.5;
  float invGamma = 1.0 / max(uGamma, 0.0001);
  color = pow(max(color, 0.0), vec3(invGamma));

  float mode = clamp(uDark, 0.0, 1.0);

  // Beer-Lambert transmission
  float localYMin = uTintLocalYRange.x;
  float localYMax = uTintLocalYRange.y;
  float localYDenominator = max(localYMax - localYMin, 1e-5);
  float tintGradientFactor = clamp((modelLocalY - localYMin) / localYDenominator, 0.0, 1.0);
  vec4 tintColorGradient = mix(uTintColorB, uTintColorA, tintGradientFactor);

  float ndotv = abs(dot(normal, eyeDir));
  float thicknessMask = clamp(1.0 - ndotv, 0.0, 1.0);
  float tintAlpha = clamp(tintColorGradient.a, 0.0, 1.0);
  float minAlpha = clamp(uTintThicknessMinAlpha, 0.0, 1.0);
  float maxAlpha = clamp(uTintThicknessMaxAlpha, 0.0, 1.0);
  tintAlpha *= mix(maxAlpha, minAlpha, thicknessMask);

  float tintK_beer = clamp(uTintEnabled, 0.0, 1.0) * tintAlpha;
  vec3 tintColorClamped = clamp(tintColorGradient.rgb, 0.001, 1.0);
  float thickness = clamp(uTintMix, 0.01, 3.0);
  vec3 transmittance = pow(tintColorClamped, vec3(thickness));
  vec3 beerColor = mix(color, color * transmittance, tintK_beer);

  // Hard Light duotone mix
  float tintK_hard = clamp(uTintEnabled, 0.0, 1.0) * clamp(uTintMix, 0.0, 1.0) * tintAlpha;
  vec3 baseClamped = clamp(color, 0.0, 1.0);
  vec3 blendClamped = clamp(tintColorGradient.rgb, 0.0, 1.0);
  vec3 h = step(vec3(0.5), blendClamped);
  vec3 hard = mix(2.0 * baseClamped * blendClamped,
                  1.0 - 2.0 * (1.0 - blendClamped) * (1.0 - baseClamped),
                  h);
  vec3 hardColor = mix(color, hard, tintK_hard);

  color = mix(beerColor, hardColor, mode);

  // Specular
  float specularLight = specular(uLight, normal, eyeDir, uShininess, uDiffuseness);
  color += specularLight * uSpecularStrength;

  // Fresnel
  float f = fresnel(eyeDir, normal, uFresnelPower);
  float sideDot = dot(normal, normalize(uFresnelSideDir));
  float sideMask = smoothstep(-0.5, 0.5, sideDot);
  color.rgb += f * sideMask * vec3(uFresnelStrength);

  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export interface GlassMeshProps {
  geometry?: THREE.BufferGeometry | null;
  modelPosition?: [number, number, number];
  rotationAxisTilt?: [number, number, number];
  rotation?: [number, number, number];
  beforeRotation?: [number, number, number];
  afterRotation?: [number, number, number];
  scale?: number;
  floatingMotion?: boolean;
  tintEnabled?: boolean;
  tingColor?: [string, string, string, string];
  /**
   * Progress 0..1 for entry rotation (beforeRotation -> rotation),
   * and 0..1 for exit rotation (rotation -> afterRotation).
   */
  entryProgressRef?: React.MutableRefObject<number>;
  afterProgressRef?: React.MutableRefObject<number>;
  scrollOffsetYRef?: React.MutableRefObject<number>;
  onReady?: () => void;
}

/**
 * Core GlassMesh component (`cp` from curiositywen.design).
 */
export function GlassMesh({
  geometry,
  modelPosition = [0, 0, 0],
  rotationAxisTilt = [0, 0, 0],
  rotation = [0, 0, 0],
  beforeRotation,
  afterRotation,
  scale = 1,
  floatingMotion = true,
  tintEnabled = true,
  tingColor,
  entryProgressRef,
  afterProgressRef,
  scrollOffsetYRef,
  onReady,
}: GlassMeshProps) {
  const { theme, params, envMapBase, screenResolutionPx, glassLayer, sceneRefractionActiveRef } = useGlassSystem();
  const { size } = useThree();
  const isMobile = size.width < 768;

  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const rootGroupRef = useRef<THREE.Group>(null);
  const rotGroupRef = useRef<THREE.Group>(null);
  const readyFired = useRef(false);
  const frameCount = useRef(0);
  const entryTimer = useRef(0);

  const orbitLight = useMemo(() => createOrbitingLight(), []);

  const tintPair = useMemo(() => {
    const isDark = theme === "dark";
    const defA = params.tintColorA;
    const defB = params.tintColorB;
    if (tingColor) {
      return {
        tintColorA: isDark ? tingColor[2] || defA : tingColor[0] || defA,
        tintColorB: isDark ? tingColor[3] || defB : tingColor[1] || defB,
      };
    }
    return { tintColorA: defA, tintColorB: defB };
  }, [theme, params.tintColorA, params.tintColorB, tingColor]);

  const localYRange = useMemo<[number, number]>(() => {
    if (!geometry) return [0, 1];
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    if (!box) return [0, 1];
    const minY = box.min.y;
    const maxY = box.max.y;
    return Math.abs(maxY - minY) < 1e-6 ? [minY, minY + 1] : [minY, maxY];
  }, [geometry]);

  const degToRad = useCallback((d: number) => THREE.MathUtils.degToRad(d), []);
  const startRot = beforeRotation ?? rotation;
  const startRad = useMemo<[number, number, number]>(
    () => [degToRad(startRot[0]), degToRad(startRot[1]), degToRad(startRot[2])],
    [startRot, degToRad],
  );
  const restRad = useMemo<[number, number, number]>(
    () => [degToRad(rotation[0]), degToRad(rotation[1]), degToRad(rotation[2])],
    [rotation, degToRad],
  );
  const endRad = useMemo<[number, number, number] | null>(
    () => (afterRotation ? [degToRad(afterRotation[0]), degToRad(afterRotation[1]), degToRad(afterRotation[2])] : null),
    [afterRotation, degToRad],
  );
  const tiltRad = useMemo<[number, number, number]>(
    () => [degToRad(rotationAxisTilt[0]), degToRad(rotationAxisTilt[1]), degToRad(rotationAxisTilt[2])],
    [rotationAxisTilt, degToRad],
  );
  const invTiltRad = useMemo<[number, number, number]>(
    () => [-tiltRad[0], -tiltRad[1], -tiltRad[2]],
    [tiltRad],
  );

  const uniforms = useMemo(
    () => ({
      uTexture: { value: null as THREE.Texture | null },
      uIorR: { value: 1.15 },
      uIorY: { value: 1.16 },
      uIorG: { value: 1.18 },
      uIorC: { value: 1.22 },
      uIorB: { value: 1.22 },
      uIorP: { value: 1.22 },
      uRefractPower: { value: 0.72 },
      uChromaticAberration: { value: 0.14 },
      uSaturation: { value: 1.2 },
      uShininess: { value: 100 },
      uDiffuseness: { value: 0.05 },
      uFresnelPower: { value: 3 },
      uBrightness: { value: 0.6 },
      uContrast: { value: 0.98 },
      uGamma: { value: 1.0 },
      uSpecularStrength: { value: 1.2 },
      uFresnelStrength: { value: 0.72 },
      uFresnelSideDir: { value: new THREE.Vector3(-1, 1, -1) },
      uTintColorA: { value: new THREE.Vector4(1, 1, 1, 1) },
      uTintColorB: { value: new THREE.Vector4(1, 1, 1, 1) },
      uTintLocalYRange: { value: new THREE.Vector2(0, 1) },
      uTintEnabled: { value: 1 },
      uTintMix: { value: 1.0 },
      uTintThicknessMinAlpha: { value: 1.0 },
      uTintThicknessMaxAlpha: { value: 0.4 },
      uDark: { value: 1 },
      uLoop: { value: 3 },
      uSceneRefractionEnabled: { value: 1 },
      uRgbRefraction: { value: 1 },
      uLight: { value: new THREE.Vector3(4, 9, 0.5) },
      uScreenResolutionPx: { value: new THREE.Vector2(1, 1) },
    }),
    [],
  );

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.layers.set(glassLayer);
    }
  }, [geometry, glassLayer]);

  useLayoutEffect(() => {
    const u = matRef.current?.uniforms;
    if (!u) return;
    u.uTexture.value = envMapBase;
    u.uRefractPower.value = params.refractPower;
    u.uChromaticAberration.value = params.chromaticAberration;
    u.uDiffuseness.value = params.diffuseness;
    u.uShininess.value = params.shininess;
    u.uFresnelPower.value = params.fresnelPower;
    u.uSaturation.value = params.saturation;
    u.uBrightness.value = params.brightness;
    u.uContrast.value = params.contrast;
    u.uGamma.value = params.gamma;
    u.uSpecularStrength.value = params.specularStrength;
    u.uFresnelStrength.value = params.fresnelStrength;
    u.uFresnelSideDir.value.set(...params.fresnelSideDir);
    u.uTintMix.value = params.tintMix;

    const loopCount = isMobile ? Math.min(params.loop, 2) : params.loop;
    u.uLoop.value = loopCount;
    u.uRgbRefraction.value = loopCount <= 3 ? 1 : 0;

    const { color: colA, alpha: alphaA } = parseColorWithAlpha(tintPair.tintColorA);
    const { color: colB, alpha: alphaB } = parseColorWithAlpha(tintPair.tintColorB);
    u.uTintColorA.value.set(colA.r, colA.g, colA.b, alphaA);
    u.uTintColorB.value.set(colB.r, colB.g, colB.b, alphaB);
    u.uTintLocalYRange.value.set(localYRange[0], localYRange[1]);
    u.uTintThicknessMinAlpha.value = params.tintThicknessMinAlpha;
    u.uTintThicknessMaxAlpha.value = params.tintThicknessMaxAlpha;
    u.uTintEnabled.value = tintEnabled ? 1 : 0;
    u.uDark.value = theme === "dark" ? 1 : 0;
  }, [params, tintPair, tintEnabled, envMapBase, theme, localYRange, isMobile]);

  useEffect(() => {
    const u = matRef.current?.uniforms;
    if (u) {
      u.uScreenResolutionPx.value.set(screenResolutionPx.x, screenResolutionPx.y);
    }
  }, [screenResolutionPx]);

  useFrame((state, delta) => {
    if (matRef.current) {
      matRef.current.uniforms.uSceneRefractionEnabled.value = sceneRefractionActiveRef.current ? 1 : 0;
      matRef.current.uniforms.uTexture.value = envMapBase;
      const drawSize = state.gl.getDrawingBufferSize(screenResolutionPx);
      matRef.current.uniforms.uScreenResolutionPx.value.copy(drawSize);
    }

    if (onReady && !readyFired.current) {
      frameCount.current += 1;
      if (frameCount.current >= 5) {
        readyFired.current = true;
        onReady();
      }
    }

    if (rootGroupRef.current) {
      const t = state.clock.getElapsedTime();
      const floatY = floatingMotion && !isMobile ? 0.18 * Math.sin(1.2 * t) + 0.06 * Math.sin(0.6 * t) : 0;
      const scrollY = scrollOffsetYRef?.current ?? 0;
      rootGroupRef.current.position.y = modelPosition[1] + scrollY + floatY;
    }

    if (rotGroupRef.current) {
      entryTimer.current = Math.min(entryTimer.current + delta / 1.1, 1);
      const entry = entryProgressRef ? entryProgressRef.current : entryTimer.current;
      const after = afterProgressRef ? afterProgressRef.current : 0;

      let rx = THREE.MathUtils.lerp(startRad[0], restRad[0], entry);
      let ry = THREE.MathUtils.lerp(startRad[1], restRad[1], entry);
      let rz = THREE.MathUtils.lerp(startRad[2], restRad[2], entry);

      if (endRad) {
        rx = THREE.MathUtils.lerp(rx, endRad[0], after);
        ry = THREE.MathUtils.lerp(ry, endRad[1], after);
        rz = THREE.MathUtils.lerp(rz, endRad[2], after);
      }

      rotGroupRef.current.rotation.x = THREE.MathUtils.damp(rotGroupRef.current.rotation.x, rx, 6, delta);
      rotGroupRef.current.rotation.y = THREE.MathUtils.damp(rotGroupRef.current.rotation.y, ry, 6, delta);
      rotGroupRef.current.rotation.z = THREE.MathUtils.damp(rotGroupRef.current.rotation.z, rz, 6, delta);
    }

    const { x: lx, y: ly } = orbitLight.update({
      uv: sharedPointer.uv,
      inside: sharedPointer.inside && !isMobile,
      camera: state.camera,
      delta,
    });
    if (matRef.current) {
      matRef.current.uniforms.uLight.value.set(lx, ly, params.lightZ);
    }
  }, -2);

  if (!geometry) return null;

  return (
    <group ref={rootGroupRef} position={modelPosition}>
      <group rotation={tiltRad}>
        <group ref={rotGroupRef} rotation={startRad}>
          <group rotation={invTiltRad}>
            <mesh ref={meshRef} geometry={geometry} scale={[scale, scale, scale]}>
              <shaderMaterial
                ref={matRef}
                vertexShader={GLASS_VERTEX_SHADER}
                fragmentShader={GLASS_FRAGMENT_SHADER}
                uniforms={uniforms}
                toneMapped={false}
                transparent={true}
              />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

/**
 * Loads a GLTF/GLB model (e.g. `/model/cursor.glb`, `/model/hello.gltf`, `/model/cnt.gltf`),
 * merges and centers its mesh geometries just like `cp` in curiositywen.design, and renders it as a GlassMesh.
 */
export function GlassGltfModel({
  url,
  ...props
}: Omit<GlassMeshProps, "geometry"> & { url: string }) {
  const gltf = useGLTF(url);

  const mergedGeo = useMemo(() => {
    if (!gltf?.scene) return null;
    gltf.scene.updateMatrixWorld(true);
    const list: THREE.BufferGeometry[] = [];
    gltf.scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const g = child.geometry.clone();
        g.applyMatrix4(child.matrixWorld);
        list.push(g);
      }
    });
    if (list.length === 0) return null;
    try {
      const merged = mergeGeometries(list, true);
      centerGeometry(merged);
      return merged;
    } catch {
      const fallback = list[0];
      centerGeometry(fallback);
      return fallback;
    }
  }, [gltf]);

  return <GlassMesh geometry={mergedGeo} {...props} />;
}

/**
 * DotOverlay (`s1` from curiositywen.design):
 * Scroll-driven dot-matrix transition overlay inside the WebGL canvas.
 */
export function DotOverlay({
  opacityRef,
  overlayColors = ["#0F1111", "#FBFAF4"],
  overlayPixelSize = 4,
  overlayRadiusScale = 0.9,
  theme = "dark",
}: {
  opacityRef: React.MutableRefObject<number>;
  overlayColors?: [string, string];
  overlayPixelSize?: number;
  overlayRadiusScale?: number;
  theme?: "dark" | "light";
}) {
  const { size } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(theme === "dark" ? overlayColors[0] : overlayColors[1]) },
      uOpacity: { value: 0 },
      uPixelSize: { value: overlayPixelSize },
      uRadiusScale: { value: overlayRadiusScale },
      uResolution: { value: new THREE.Vector2(Math.max(1, size.width), Math.max(1, size.height)) },
    }),
    [],
  );

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.layers.set(11);
    }
  }, []);

  useLayoutEffect(() => {
    matRef.current?.uniforms.uColor.value.set(theme === "dark" ? overlayColors[0] : overlayColors[1]);
  }, [theme, overlayColors]);

  useLayoutEffect(() => {
    matRef.current?.uniforms.uResolution.value.set(Math.max(1, size.width), Math.max(1, size.height));
  }, [size.width, size.height]);

  useFrame(() => {
    const op = THREE.MathUtils.clamp(opacityRef.current, 0, 1);
    if (matRef.current) {
      matRef.current.uniforms.uOpacity.value = op;
    }
    if (meshRef.current) {
      meshRef.current.visible = op > 0.001;
    }
  });

  return (
    <mesh ref={meshRef} renderOrder={10} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        transparent
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
        uniforms={uniforms}
        vertexShader={/* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position.xy, 0.0, 1.0);
          }
        `}
        fragmentShader={/* glsl */ `
          precision highp float;
          varying vec2 vUv;
          uniform vec3 uColor;
          uniform float uOpacity;
          uniform float uPixelSize;
          uniform float uRadiusScale;
          uniform vec2 uResolution;

          void main() {
            float a = clamp(uOpacity, 0.0, 1.0);
            if (a <= 0.001) discard;

            vec2 normalizedPixelSize = vec2(
              uPixelSize / max(uResolution.x, 1.0),
              uPixelSize / max(uResolution.y, 1.0)
            );

            vec2 safePixelSize = max(normalizedPixelSize, vec2(1e-6));
            vec2 cellUV = fract(vUv / safePixelSize);

            float radius = uRadiusScale * a;
            float distanceFromCenter = distance(cellUV, vec2(0.5));
            float aa = fwidth(distanceFromCenter) * 1.5;
            float circleMask = smoothstep(radius, radius - aa, distanceFromCenter);

            gl_FragColor = vec4(uColor, circleMask);
            #include <colorspace_fragment>
          }
        `}
      />
    </mesh>
  );
}
