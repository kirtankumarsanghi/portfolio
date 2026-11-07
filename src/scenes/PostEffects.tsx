import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { Pass } from "postprocessing";
import { sharedPointer } from "./WaterBg";

const FULLSCREEN_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`;

const FLARE_FRAGMENT = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uEnabled;
uniform float uIntensity;
uniform float uThreshold;
uniform float uStreakScale;
uniform float uHotspotPower;
uniform float uGate;
uniform float uStarRays;
uniform vec3 uTailColor;

const float TAIL_MIX = 1.0;
const float TAIL_START = 0.0;
const float TAIL_FALLOFF = 0.5;

varying vec2 vUv;

float luma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

float brightMask(float lum) {
  float x = max(lum - uThreshold, 0.0);
  float m = x / max(1.0 - uThreshold, 1e-5);
  m = clamp(m, 0.0, 1.0);
  m = m * m * (3.0 - 2.0 * m);

  float hp = max(uHotspotPower, 1.0);
  if (hp > 1.01) {
    m = pow(m, hp);
  }

  float gate = clamp(uGate, 0.0, 1.0);
  float gm = (m - gate) / max(1.0 - gate, 1e-5);
  gm = clamp(gm, 0.0, 1.0);
  return m * gm;
}

vec3 sampleBright(vec2 uv) {
  vec3 c = texture2D(tDiffuse, uv).rgb;
  return c * brightMask(luma(c));
}

vec3 streak(vec2 dirPx) {
  vec3 acc = vec3(0.0);
  vec2 pixel = floor(vUv * uResolution);
  float h = fract(52.9829189 * fract(dot(pixel, vec2(0.06711056, 0.00583715))));
  float phase = step(0.5, h) * 0.5;
  for (int i = 1; i <= 8; i++) {
    float fi = float(i);
    float dist = fi * 1.5 + phase;
    float w = 1.0 / (1.0 + dist * 0.22);
    w *= w;

    float t = clamp(dist / 8.0, 0.0, 1.0);
    float start = clamp(TAIL_START, 0.0, 0.95);
    float tt = clamp((t - start) / max(1.0 - start, 1e-5), 0.0, 1.0);
    tt = pow(tt, max(TAIL_FALLOFF, 0.001));
    vec3 ramp = mix(vec3(1.0), uTailColor, clamp(TAIL_MIX, 0.0, 1.0) * tt);

    vec2 o = dirPx * dist;
    acc += sampleBright(vUv + o) * (w * ramp);
    acc += sampleBright(vUv - o) * (w * ramp);
  }
  return acc;
}

void main() {
  vec3 flare = vec3(0.0);
  if (uEnabled >= 0.5 && uIntensity > 0.0001) {
    vec3 base = texture2D(tDiffuse, vUv).rgb;
    vec2 px = (1.0 / max(uResolution, vec2(1.0))) * uStreakScale;

    flare += base * brightMask(luma(base)) * 1.2;

    if (uStarRays >= 7.5) {
      flare += streak(vec2(px.x, 0.0));
      flare += streak(vec2(0.0, px.y));
      const float c45 = 0.70710678;
      flare += streak(vec2(px.x * c45, px.y * c45));
      flare += streak(vec2(px.x * c45, -px.y * c45));
    } else if (uStarRays >= 5.5) {
      flare += streak(vec2(0.0, px.y));
      const float c30 = 0.8660254;
      const float s30 = 0.5;
      flare += streak(vec2(px.x * c30, px.y * s30));
      flare += streak(vec2(px.x * c30, -px.y * s30));
    } else {
      flare += streak(vec2(px.x, 0.0));
      flare += streak(vec2(0.0, px.y));
    }
  }

  flare *= (uIntensity * 0.75);
  gl_FragColor = vec4(flare, 1.0);
}
`;

const FLARE_COMPOSITE_FRAGMENT = /* glsl */ `
uniform sampler2D tBase;
uniform sampler2D tFlare;
varying vec2 vUv;

void main() {
  vec3 base = texture2D(tBase, vUv).rgb;
  vec3 flare = texture2D(tFlare, vUv).rgb;
  gl_FragColor = vec4(base + flare, 1.0);
  #include <colorspace_fragment>
}
`;

/**
 * LensFlarePass (`cT` from curiositywen.design):
 * 6-ray starburst streaks on bright specular hotspots.
 */
class LensFlarePass extends Pass {
  flareScale: number;
  flareStride: number;
  flareFrame = 0;
  width = 1;
  height = 1;
  flareTarget: THREE.WebGLRenderTarget;
  flareMaterial: THREE.ShaderMaterial;
  compositeMaterial: THREE.ShaderMaterial;

  constructor({
    flareDownsample = 0.5,
    flareStride = 2,
    starRays = 6,
    intensity = 0.7,
    threshold = 0.99,
    streakScale = 8,
    hotspotPower = 32,
    gate = 0.88,
    tailColor = "#1600ff",
  }: {
    flareDownsample?: number;
    flareStride?: number;
    starRays?: number;
    intensity?: number;
    threshold?: number;
    streakScale?: number;
    hotspotPower?: number;
    gate?: number;
    tailColor?: string;
  } = {}) {
    super("LensFlarePass");
    this.flareScale = Math.min(1, Math.max(0.2, flareDownsample));
    this.flareStride = Math.max(1, Math.floor(flareStride));
    this.flareTarget = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
    });
    this.flareTarget.texture.colorSpace = THREE.LinearSRGBColorSpace;
    this.flareTarget.texture.generateMipmaps = false;

    this.flareMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uEnabled: { value: 1 },
        uStarRays: { value: starRays },
        uIntensity: { value: intensity },
        uThreshold: { value: threshold },
        uStreakScale: { value: streakScale },
        uHotspotPower: { value: hotspotPower },
        uGate: { value: gate },
        uTailColor: { value: new THREE.Color(tailColor) },
      },
      vertexShader: FULLSCREEN_VERTEX,
      fragmentShader: FLARE_FRAGMENT,
      depthTest: false,
      depthWrite: false,
      transparent: false,
      toneMapped: false,
    });

    this.compositeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tBase: { value: null },
        tFlare: { value: null },
      },
      vertexShader: FULLSCREEN_VERTEX,
      fragmentShader: FLARE_COMPOSITE_FRAGMENT,
      depthTest: false,
      depthWrite: false,
      transparent: false,
      toneMapped: false,
    });

    this.fullscreenMaterial = this.compositeMaterial;
  }

  setParams({
    starRays,
    intensity,
    threshold,
    streakScale,
    hotspotPower,
    gate,
    tailColor,
  }: {
    starRays: number;
    intensity: number;
    threshold: number;
    streakScale: number;
    hotspotPower: number;
    gate: number;
    tailColor: string;
  }) {
    this.flareMaterial.uniforms.uStarRays.value = starRays;
    this.flareMaterial.uniforms.uIntensity.value = intensity;
    this.flareMaterial.uniforms.uThreshold.value = threshold;
    this.flareMaterial.uniforms.uStreakScale.value = streakScale;
    this.flareMaterial.uniforms.uHotspotPower.value = hotspotPower;
    this.flareMaterial.uniforms.uGate.value = gate;
    this.flareMaterial.uniforms.uTailColor.value.set(tailColor);
  }

  resetFlareCadence() {
    this.flareFrame = 0;
  }

  setSize(w: number, h: number) {
    this.width = Math.max(1, Math.floor(w));
    this.height = Math.max(1, Math.floor(h));
    this.flareMaterial.uniforms.uResolution.value.set(this.width, this.height);
    const fw = Math.max(1, Math.floor(this.width * this.flareScale));
    const fh = Math.max(1, Math.floor(this.height * this.flareScale));
    this.flareTarget.setSize(fw, fh);
    this.resetFlareCadence();
  }

  render(
    renderer: THREE.WebGLRenderer,
    inputBuffer: THREE.WebGLRenderTarget | null,
    outputBuffer: THREE.WebGLRenderTarget | null,
  ) {
    if (!inputBuffer) return;
    if (this.flareFrame % this.flareStride === 0) {
      this.flareMaterial.uniforms.tDiffuse.value = inputBuffer.texture;
      this.fullscreenMaterial = this.flareMaterial;
      renderer.setRenderTarget(this.flareTarget);
      renderer.clear();
      renderer.render(this.scene, this.camera);
    }
    this.flareFrame += 1;

    this.compositeMaterial.uniforms.tBase.value = inputBuffer.texture;
    this.compositeMaterial.uniforms.tFlare.value = this.flareTarget.texture;
    this.fullscreenMaterial = this.compositeMaterial;
    renderer.setRenderTarget(this.renderToScreen ? null : outputBuffer);
    renderer.clear();
    renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.flareTarget.dispose();
    this.flareMaterial.dispose();
    this.compositeMaterial.dispose();
  }
}

const POINTER_COLOR = "#c0fe04";

class PointerOverlayState {
  cssResolution = new THREE.Vector2(1, 1);
  devicePixelRatio = 1;
  trail = Array.from({ length: 16 }, () => new THREE.Vector2(0.5, 0.5));
  trailStrength = Array.from({ length: 16 }, () => 0);
  lastPointerCell = new THREE.Vector2(-1, -1);
  pixelSize = 16;

  uniforms = {
    uTrail: { value: this.trail },
    uTrailStrength: { value: this.trailStrength },
    uTrailCount: { value: 14 },
    uPointerColor: { value: new THREE.Color(POINTER_COLOR) },
    uPointerOpacity: { value: 0 },
    uPointerDotRadius: { value: 0.8 },
    uPointerPixelSize: { value: this.pixelSize },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uDevicePixelRatio: { value: this.devicePixelRatio },
  };

  setColor(c: string) {
    this.uniforms.uPointerColor.value.set(c);
  }

  setPixelSize(s: number) {
    this.pixelSize = s;
    this.uniforms.uPointerPixelSize.value = s;
  }

  setDisplayMetrics(w: number, h: number, dpr: number) {
    this.cssResolution.set(Math.max(1, w), Math.max(1, h));
    this.devicePixelRatio = Math.max(1, dpr);
    this.uniforms.uDevicePixelRatio.value = this.devicePixelRatio;
  }

  setResolution(w: number, h: number) {
    this.uniforms.uResolution.value.set(Math.max(1, w), Math.max(1, h));
  }

  updatePointer(uv: THREE.Vector2, active: boolean, delta: number) {
    const cellW = Math.max(this.pixelSize / Math.max(this.cssResolution.x, 1), 1e-6);
    const cellH = Math.max(this.pixelSize / Math.max(this.cssResolution.y, 1), 1e-6);

    for (let i = active ? 1 : 0; i < 14; i += 1) {
      this.trailStrength[i] = THREE.MathUtils.damp(this.trailStrength[i], 0, 2, delta);
    }

    if (active) {
      const cx = Math.floor(uv.x / cellW);
      const cy = Math.floor(uv.y / cellH);
      if (cx !== this.lastPointerCell.x || cy !== this.lastPointerCell.y) {
        for (let i = 13; i > 0; i -= 1) {
          this.trail[i].copy(this.trail[i - 1]);
          this.trailStrength[i] = this.trailStrength[i - 1];
        }
        this.lastPointerCell.set(cx, cy);
      }
      this.trail[0].set(uv.x, uv.y);
      this.trailStrength[0] = 1;
      return;
    }
    this.lastPointerCell.set(-1, -1);
  }
}

function makeSimTarget(w: number, h: number) {
  return new THREE.WebGLRenderTarget(w, h, {
    depthBuffer: false,
    stencilBuffer: false,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.HalfFloatType,
  });
}

function makePassMaterial(fragmentShader: string, uniforms: Record<string, THREE.IUniform>) {
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: FULLSCREEN_VERTEX,
    fragmentShader,
    depthTest: false,
    depthWrite: false,
    transparent: false,
    toneMapped: false,
  });
}

/**
 * FluidPushPass (`cO` from curiositywen.design):
 * Navier-Stokes cursor velocity field + 4-sample spectral chromatic dispersion + 16px lime dot trail.
 */
class FluidPushPass extends Pass {
  simResolution: number;
  simWidth = 1;
  simHeight = 1;
  viewportWidth = 1;
  viewportHeight = 1;
  pressureIterations: number;
  effectEnabled = true;
  pointerOverlayEnabled = false;
  resolution = new THREE.Vector2(1, 1);
  pointerOverlay = new PointerOverlayState();
  pointer = new THREE.Vector2(-1, -1);
  pointerDelta = new THREE.Vector2(0, 0);

  velocityRead = makeSimTarget(1, 1);
  velocityWrite = makeSimTarget(1, 1);
  curlTarget = makeSimTarget(1, 1);
  vortTarget = makeSimTarget(1, 1);
  divergenceTarget = makeSimTarget(1, 1);
  pressureA = makeSimTarget(1, 1);
  pressureB = makeSimTarget(1, 1);
  projectedVelocityTarget = makeSimTarget(1, 1);

  curlMaterial: THREE.ShaderMaterial;
  vorticityMaterial: THREE.ShaderMaterial;
  divergenceMaterial: THREE.ShaderMaterial;
  clearMaterial: THREE.ShaderMaterial;
  pressureMaterial: THREE.ShaderMaterial;
  gradientMaterial: THREE.ShaderMaterial;
  advectMaterial: THREE.ShaderMaterial;
  displayMaterial: THREE.ShaderMaterial;

  constructor({
    strength = 0.3,
    radius = 1.5,
    velocityScale = 1,
    chromaticStrength = 0.002,
    pressureIterations = 4,
    curlStrength = 0,
    velocityDissipation = 3,
    simResolution = 160,
  }: {
    strength?: number;
    radius?: number;
    velocityScale?: number;
    chromaticStrength?: number;
    pressureIterations?: number;
    curlStrength?: number;
    velocityDissipation?: number;
    simResolution?: number;
  } = {}) {
    super("FluidPushPass");
    this.simResolution = simResolution;
    this.pressureIterations = pressureIterations;

    const texel = new THREE.Vector2(1, 1);
    const res = new THREE.Vector2(1, 1);

    this.curlMaterial = makePassMaterial(
      /* glsl */ `
      uniform sampler2D uVelocity;
      uniform vec2 uTexelSize;
      varying vec2 vUv;
      void main() {
        float left = texture2D(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).y;
        float right = texture2D(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).y;
        float top = texture2D(uVelocity, vUv + vec2(0.0, uTexelSize.y)).x;
        float bottom = texture2D(uVelocity, vUv - vec2(0.0, uTexelSize.y)).x;
        float value = 0.5 * (right - left - top + bottom);
        gl_FragColor = vec4(value, 0.0, 0.0, 1.0);
      }`,
      { uVelocity: { value: null }, uTexelSize: { value: texel.clone() } },
    );

    this.vorticityMaterial = makePassMaterial(
      /* glsl */ `
      uniform sampler2D uVelocity;
      uniform sampler2D uCurl;
      uniform vec2 uTexelSize;
      uniform vec2 uResolution;
      uniform vec2 uPointer;
      uniform vec2 uPointerDelta;
      uniform float uCurlStrength;
      uniform float uSplatRadius;
      uniform float uSplatForce;
      varying vec2 vUv;

      void main() {
        float left = abs(texture2D(uCurl, vUv - vec2(uTexelSize.x, 0.0)).x);
        float right = abs(texture2D(uCurl, vUv + vec2(uTexelSize.x, 0.0)).x);
        float top = abs(texture2D(uCurl, vUv + vec2(0.0, uTexelSize.y)).x);
        float bottom = abs(texture2D(uCurl, vUv - vec2(0.0, uTexelSize.y)).x);
        float center = texture2D(uCurl, vUv).x;

        vec2 force = vec2(top - bottom, right - left);
        float forceLength = length(force);
        if (forceLength > 0.0001) {
          force /= forceLength;
        } else {
          force = vec2(0.0);
        }

        force *= uCurlStrength * center;
        force.y *= -1.0;

        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity += force * 0.016;
        velocity = clamp(velocity, vec2(-1000.0), vec2(1000.0));

        vec2 mouseUv = uPointer / max(uResolution, vec2(0.0001));
        vec2 diff = vUv - mouseUv;
        diff.x *= uResolution.x / max(uResolution.y, 0.0001);
        float pointerMask = exp(-dot(diff, diff) / max(uSplatRadius, 0.0001));
        velocity += (uPointerDelta / max(uResolution, vec2(0.0001))) * pointerMask * uSplatForce;

        gl_FragColor = vec4(velocity, 0.0, 1.0);
      }`,
      {
        uVelocity: { value: null },
        uCurl: { value: null },
        uTexelSize: { value: texel.clone() },
        uResolution: { value: res.clone() },
        uPointer: { value: this.pointer },
        uPointerDelta: { value: this.pointerDelta },
        uCurlStrength: { value: curlStrength },
        uSplatRadius: { value: Math.max(0.002 * radius, 0.0005) },
        uSplatForce: { value: Math.max(3000 * velocityScale, 0) },
      },
    );

    this.divergenceMaterial = makePassMaterial(
      /* glsl */ `
      uniform sampler2D uVelocity;
      uniform vec2 uTexelSize;
      varying vec2 vUv;
      void main() {
        float left = texture2D(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).x;
        float right = texture2D(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).x;
        float top = texture2D(uVelocity, vUv + vec2(0.0, uTexelSize.y)).y;
        float bottom = texture2D(uVelocity, vUv - vec2(0.0, uTexelSize.y)).y;
        float divergence = 0.5 * (right - left + top - bottom);
        gl_FragColor = vec4(divergence, 0.0, 0.0, 1.0);
      }`,
      { uVelocity: { value: null }, uTexelSize: { value: texel.clone() } },
    );

    this.clearMaterial = makePassMaterial(
      /* glsl */ `
      void main() {
        gl_FragColor = vec4(0.0);
      }`,
      {},
    );

    this.pressureMaterial = makePassMaterial(
      /* glsl */ `
      uniform sampler2D uPressure;
      uniform sampler2D uDivergence;
      uniform vec2 uTexelSize;
      varying vec2 vUv;
      void main() {
        float left = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
        float right = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
        float top = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
        float bottom = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
        float divergence = texture2D(uDivergence, vUv).x;
        float pressure = (left + right + top + bottom - divergence) * 0.25;
        gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
      }`,
      { uPressure: { value: null }, uDivergence: { value: null }, uTexelSize: { value: texel.clone() } },
    );

    this.gradientMaterial = makePassMaterial(
      /* glsl */ `
      uniform sampler2D uVelocity;
      uniform sampler2D uPressure;
      uniform vec2 uTexelSize;
      varying vec2 vUv;
      void main() {
        float left = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
        float right = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
        float top = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
        float bottom = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity -= vec2(right - left, top - bottom);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
      }`,
      { uVelocity: { value: null }, uPressure: { value: null }, uTexelSize: { value: texel.clone() } },
    );

    this.advectMaterial = makePassMaterial(
      /* glsl */ `
      uniform sampler2D uVelocity;
      uniform sampler2D uProjectedVelocity;
      uniform vec2 uTexelSize;
      uniform float uDissipation;
      varying vec2 vUv;
      void main() {
        vec2 velocity = texture2D(uProjectedVelocity, vUv).xy;
        vec2 coord = clamp(vUv - velocity * uTexelSize * 0.016, 0.0, 1.0);
        vec2 advected = texture2D(uProjectedVelocity, coord).xy;
        advected /= 1.0 + uDissipation * 0.016;
        gl_FragColor = vec4(advected, 0.0, 1.0);
      }`,
      {
        uVelocity: { value: null },
        uProjectedVelocity: { value: null },
        uTexelSize: { value: texel.clone() },
        uDissipation: { value: velocityDissipation },
      },
    );

    this.displayMaterial = makePassMaterial(
      /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform sampler2D uVelocity;
      uniform vec2 uSimSize;
      uniform float uDisplacementStrength;
      uniform float uChromaticBoost;
      uniform float uEffectEnabled;

      vec3 spectrum(float x) {
        return cos((x - vec3(0.0, 0.5, 1.0)) * vec3(0.6, 1.0, 0.5) * 3.14);
      }

      vec4 getFluidDisplayColor(vec2 uv) {
        vec2 velocity = texture2D(uVelocity, uv).xy;
        float effectEnabled = step(0.5, uEffectEnabled);
        vec2 displacement = velocity / max(uSimSize, vec2(1.0)) * uDisplacementStrength * effectEnabled;
        float velocityMagnitude = length(displacement);

        const int samples = 4;
        vec4 color = vec4(0.0);
        vec3 weightSum = vec3(0.0);

        for (int index = 0; index < samples; index++) {
          float t = float(index) / float(samples - 1);
          vec3 weight = max(vec3(0.0), cos((t - vec3(0.0, 0.5, 1.0)) * 3.14159 * 0.5));
          vec4 sampleColor = texture2D(tDiffuse, clamp(uv - displacement * 0.3 * (t + 0.3) * velocityMagnitude, 0.0, 1.0));
          color.rgb += sampleColor.rgb * weight;
          color.a += sampleColor.a * (weight.r + weight.g + weight.b) / 3.0;
          weightSum += weight;
        }

        color.rgb /= max(weightSum, vec3(0.0001));
        color.a /= max((weightSum.r + weightSum.g + weightSum.b) / 3.0, 0.0001);

        vec3 spectralHighlight = spectrum(sin(velocityMagnitude * 2.0) * 0.4 + 0.6);
        color.rgb += spectralHighlight * smoothstep(0.2, 0.8, velocityMagnitude) * 0.5 * uChromaticBoost * effectEnabled;

        return color;
      }

      uniform vec2 uTrail[16];
      uniform float uTrailStrength[16];
      uniform float uTrailCount;
      uniform vec3 uPointerColor;
      uniform float uPointerOpacity;
      uniform float uPointerDotRadius;
      uniform float uPointerPixelSize;
      uniform vec2 uResolution;
      uniform float uDevicePixelRatio;

      float cellEquals(vec2 a, vec2 b) {
        vec2 d = abs(a - b);
        return 1.0 - step(0.5, max(d.x, d.y));
      }

      vec4 applyPointerOverlay(vec2 uv, vec4 baseColor) {
        float cssPixelSize = uPointerPixelSize * max(uDevicePixelRatio, 1.0);
        vec2 normalizedPixelSize = vec2(
          cssPixelSize / max(uResolution.x, 1.0),
          cssPixelSize / max(uResolution.y, 1.0)
        );

        vec2 safePixelSize = max(normalizedPixelSize, vec2(1e-6));
        vec2 cellId = floor(uv / safePixelSize);
        vec2 cellUV = fract(uv / safePixelSize);

        float highlight = 0.0;
        for (int i = 0; i < 16; i++) {
          float enabled = step(float(i), uTrailCount - 1.0);
          vec2 pointerCell = floor(uTrail[i] / safePixelSize);
          float isSame = cellEquals(cellId, pointerCell);
          float weight = clamp(uTrailStrength[i], 0.0, 1.0);
          highlight = max(highlight, enabled * isSame * weight);
        }

        float distToCenter = distance(cellUV, vec2(0.5));
        float aa = fwidth(distToCenter) * 1.5;
        float radius = clamp(uPointerDotRadius, 0.0, 1.0);
        float circleMask = smoothstep(radius, radius - aa, distToCenter);
        float overlayAlpha = circleMask * highlight * clamp(uPointerOpacity, 0.0, 1.0);
        baseColor.rgb = mix(baseColor.rgb, uPointerColor, overlayAlpha);

        return baseColor;
      }

      varying vec2 vUv;

      void main() {
        vec4 color = getFluidDisplayColor(vUv);
        gl_FragColor = applyPointerOverlay(vUv, color);
        #include <colorspace_fragment>
      }`,
      {
        tDiffuse: { value: null },
        uVelocity: { value: null },
        uSimSize: { value: new THREE.Vector2(simResolution, simResolution) },
        uDisplacementStrength: { value: Math.max(strength / 0.3, 0) },
        uChromaticBoost: { value: Math.max(chromaticStrength / 0.004, 0) },
        uEffectEnabled: { value: 1 },
        ...this.pointerOverlay.uniforms,
      },
    );

    this.fullscreenMaterial = this.displayMaterial;
  }

  setEffectEnabled(enabled: boolean) {
    this.effectEnabled = enabled;
    this.displayMaterial.uniforms.uEffectEnabled.value = enabled ? 1 : 0;
  }

  setPointerOverlayEnabled(enabled: boolean) {
    this.pointerOverlayEnabled = enabled;
    this.displayMaterial.uniforms.uPointerOpacity.value = enabled ? 1 : 0;
  }

  setDisplayMetrics(w: number, h: number, dpr: number) {
    this.pointerOverlay.setDisplayMetrics(w, h, dpr);
  }

  updatePointer(uv: THREE.Vector2, active: boolean, delta: number) {
    this.pointerOverlay.updatePointer(uv, active, delta);
  }

  setPointer(p: THREE.Vector2) {
    this.pointer.copy(p);
  }

  setPointerDelta(d: THREE.Vector2) {
    this.pointerDelta.copy(d);
  }

  setSize(w: number, h: number) {
    this.viewportWidth = Math.max(1, w);
    this.viewportHeight = Math.max(1, h);
    const r = this.simResolution;
    const aspect = this.viewportWidth / this.viewportHeight;
    if (aspect > 1) {
      this.simWidth = Math.round(r * aspect);
      this.simHeight = r;
    } else {
      this.simWidth = r;
      this.simHeight = Math.round(r / Math.max(aspect, 1e-4));
    }

    const targets = [
      this.velocityRead,
      this.velocityWrite,
      this.curlTarget,
      this.vortTarget,
      this.divergenceTarget,
      this.pressureA,
      this.pressureB,
      this.projectedVelocityTarget,
    ];
    for (const t of targets) {
      t.setSize(this.simWidth, this.simHeight);
    }

    const tx = 1 / this.simWidth;
    const ty = 1 / this.simHeight;
    const viewVec = new THREE.Vector2(this.viewportWidth, this.viewportHeight);
    const simVec = new THREE.Vector2(this.simWidth, this.simHeight);
    this.resolution.copy(viewVec);
    this.pointerOverlay.setResolution(this.viewportWidth, this.viewportHeight);

    for (const mat of [
      this.curlMaterial,
      this.vorticityMaterial,
      this.divergenceMaterial,
      this.pressureMaterial,
      this.gradientMaterial,
      this.advectMaterial,
    ]) {
      if (mat.uniforms.uTexelSize) {
        mat.uniforms.uTexelSize.value.set(tx, ty);
      }
    }

    this.vorticityMaterial.uniforms.uResolution.value.copy(viewVec);
    this.displayMaterial.uniforms.uSimSize.value.copy(simVec);
  }

  renderMaterial(renderer: THREE.WebGLRenderer, mat: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget) {
    this.fullscreenMaterial = mat;
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(this.scene, this.camera);
  }

  swapVelocityTargets() {
    const tmp = this.velocityRead;
    this.velocityRead = this.velocityWrite;
    this.velocityWrite = tmp;
  }

  render(
    renderer: THREE.WebGLRenderer,
    inputBuffer: THREE.WebGLRenderTarget | null,
    outputBuffer: THREE.WebGLRenderTarget | null,
  ) {
    if (!inputBuffer) return;
    const prevTarget = renderer.getRenderTarget();

    if (this.effectEnabled) {
      this.curlMaterial.uniforms.uVelocity.value = this.velocityRead.texture;
      this.renderMaterial(renderer, this.curlMaterial, this.curlTarget);

      this.vorticityMaterial.uniforms.uVelocity.value = this.velocityRead.texture;
      this.vorticityMaterial.uniforms.uCurl.value = this.curlTarget.texture;
      this.renderMaterial(renderer, this.vorticityMaterial, this.vortTarget);

      this.divergenceMaterial.uniforms.uVelocity.value = this.vortTarget.texture;
      this.renderMaterial(renderer, this.divergenceMaterial, this.divergenceTarget);

      this.renderMaterial(renderer, this.clearMaterial, this.pressureA);
      let pRead = this.pressureA;
      let pWrite = this.pressureB;
      for (let i = 0; i < this.pressureIterations; i += 1) {
        this.pressureMaterial.uniforms.uPressure.value = pRead.texture;
        this.pressureMaterial.uniforms.uDivergence.value = this.divergenceTarget.texture;
        this.renderMaterial(renderer, this.pressureMaterial, pWrite);
        const tmp = pRead;
        pRead = pWrite;
        pWrite = tmp;
      }

      this.gradientMaterial.uniforms.uVelocity.value = this.vortTarget.texture;
      this.gradientMaterial.uniforms.uPressure.value = pRead.texture;
      this.renderMaterial(renderer, this.gradientMaterial, this.projectedVelocityTarget);

      this.advectMaterial.uniforms.uVelocity.value = this.velocityRead.texture;
      this.advectMaterial.uniforms.uProjectedVelocity.value = this.projectedVelocityTarget.texture;
      this.renderMaterial(renderer, this.advectMaterial, this.velocityWrite);

      this.swapVelocityTargets();
    }

    this.displayMaterial.uniforms.tDiffuse.value = inputBuffer.texture;
    this.displayMaterial.uniforms.uVelocity.value = this.velocityRead.texture;
    this.fullscreenMaterial = this.displayMaterial;
    renderer.setRenderTarget(this.renderToScreen ? null : outputBuffer);
    renderer.clear();
    renderer.render(this.scene, this.camera);
    renderer.setRenderTarget(prevTarget);
  }

  dispose() {
    this.velocityRead.dispose();
    this.velocityWrite.dispose();
    this.curlTarget.dispose();
    this.vortTarget.dispose();
    this.divergenceTarget.dispose();
    this.pressureA.dispose();
    this.pressureB.dispose();
    this.projectedVelocityTarget.dispose();
    this.curlMaterial.dispose();
    this.vorticityMaterial.dispose();
    this.divergenceMaterial.dispose();
    this.clearMaterial.dispose();
    this.pressureMaterial.dispose();
    this.gradientMaterial.dispose();
    this.advectMaterial.dispose();
    this.displayMaterial.dispose();
  }
}

/**
 * PostEffects (`cG` from curiositywen.design):
 * Combines 6-ray LensFlarePass + Navier-Stokes FluidPushPass inside EffectComposer.
 */
export default function PostEffects({
  theme = "dark",
  flareDownsample = 0.5,
  intensity = 0.7,
  threshold = 0.99,
  streakScale = 8,
  hotspotPower = 32,
  gate = 0.88,
  pointerOverlayEnabled = false,
}: {
  theme?: "dark" | "light";
  flareDownsample?: number;
  intensity?: number;
  threshold?: number;
  streakScale?: number;
  hotspotPower?: number;
  gate?: number;
  pointerOverlayEnabled?: boolean;
}) {
  const { size, gl } = useThree();
  const isMobile = size.width < 768;

  const composerRef = useRef<any>(null);
  const dprRef = useRef(1);
  const pointerPx = useRef(new THREE.Vector2(-1, -1));
  const pointerDeltaPx = useRef(new THREE.Vector2(0, 0));
  const lastPointerPx = useRef(new THREE.Vector2(-1, -1));
  const uvCopy = useRef(new THREE.Vector2(-1, -1));
  const lastMoveTime = useRef(0);

  const scaledStreak = streakScale * (Math.max(1, size.width) / 1920) * (isMobile ? 2 : 1);
  const tailColor = theme === "dark" ? "#1600ff" : "#ffa300";

  const flarePassRef = useRef<LensFlarePass | null>(null);
  if (!flarePassRef.current) {
    const pass = new LensFlarePass({
      flareDownsample,
      starRays: 6,
      intensity,
      threshold,
      streakScale: scaledStreak,
      hotspotPower,
      gate,
      tailColor,
    });
    pass.enabled = true;
    flarePassRef.current = pass;
  }
  const flarePass = flarePassRef.current;

  const fluidPassRef = useRef<FluidPushPass | null>(null);
  if (!fluidPassRef.current) {
    const pass = new FluidPushPass({});
    pass.enabled = true;
    fluidPassRef.current = pass;
  }
  const fluidPass = fluidPassRef.current;

  useEffect(() => {
    flarePass.setParams({
      starRays: 6,
      intensity,
      threshold,
      streakScale: scaledStreak,
      hotspotPower,
      gate,
      tailColor,
    });
  }, [flarePass, intensity, threshold, scaledStreak, hotspotPower, gate, tailColor]);

  useEffect(() => {
    fluidPass.pointerOverlay.setColor(POINTER_COLOR);
    fluidPass.pointerOverlay.setPixelSize(16);
  }, [fluidPass]);

  useEffect(
    () => () => {
      flarePass.dispose();
      fluidPass.dispose();
    },
    [flarePass, fluidPass],
  );

  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;
    const dpr = Math.min(gl.getPixelRatio(), 2);
    dprRef.current = dpr;
    const w = Math.max(1, Math.floor(size.width * dpr));
    const h = Math.max(1, Math.floor(size.height * dpr));
    composer.inputBuffer?.setSize(w, h);
    composer.outputBuffer?.setSize(w, h);
    if (composer.passes) {
      for (const p of composer.passes) {
        p.setSize(w, h);
      }
    }
    fluidPass.setDisplayMetrics(size.width, size.height, dpr);
  }, [fluidPass, gl, size.width, size.height]);

  useFrame((_state, delta) => {
    const inside = sharedPointer.inside && !isMobile;
    const dpr = dprRef.current;

    if (inside) {
      const px = sharedPointer.uv.x * size.width * dpr;
      const py = sharedPointer.uv.y * size.height * dpr;
      if (lastPointerPx.current.x >= 0 && lastPointerPx.current.y >= 0) {
        pointerDeltaPx.current.set(px - lastPointerPx.current.x, py - lastPointerPx.current.y);
      } else {
        pointerDeltaPx.current.set(0, 0);
      }
      pointerPx.current.set(px, py);
      lastPointerPx.current.set(px, py);
    } else {
      pointerDeltaPx.current.multiplyScalar(0.9);
    }

    const speedSq = inside ? pointerDeltaPx.current.lengthSq() : 0;
    const now = performance.now();
    if (speedSq > 1) {
      lastMoveTime.current = now;
    }

    const idle = now - lastMoveTime.current > 600;
    const fluidActive = !isMobile && !idle;

    flarePass.enabled = true;
    flarePass.renderToScreen = false;
    fluidPass.enabled = true;
    fluidPass.renderToScreen = true;

    fluidPass.setEffectEnabled(fluidActive);
    fluidPass.setPointerOverlayEnabled(pointerOverlayEnabled);
    fluidPass.setPointer(pointerPx.current);
    fluidPass.setPointerDelta(pointerDeltaPx.current);

    if (inside) {
      uvCopy.current.copy(sharedPointer.uv);
    } else {
      uvCopy.current.set(-1, -1);
    }
    fluidPass.updatePointer(uvCopy.current, inside && pointerOverlayEnabled, delta);
  }, 0);

  return (
    <EffectComposer
      ref={composerRef}
      multisampling={0}
      autoClear={true}
      frameBufferType={THREE.UnsignedByteType}
    >
      <primitive object={flarePass} />
      <primitive object={fluidPass} />
    </EffectComposer>
  );
}
