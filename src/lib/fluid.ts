/**
 * Compact WebGL Navier-Stokes fluid solver (stable-fluids: advect → curl → vorticity →
 * divergence → Jacobi pressure → gradient subtract), tuned for a soft cyan "liquid light" trail.
 *
 * Constraints baked in (see CONFIG): colours are restricted to sky-blue/cyan, dye alpha is
 * clamped to ~35%, and the dye dissipates so a splat fades in roughly a second.
 * Auto-degrades resolution when FPS drops, and can be paused when off-screen.
 */

export type FluidConfig = {
  simResolution: number;
  dyeResolution: number;
  densityDissipation: number;
  velocityDissipation: number;
  pressure: number;
  pressureIterations: number;
  curl: number;
  splatRadius: number;
  splatForce: number;
};

export const FLUID_CONFIG: FluidConfig = {
  simResolution: 128,
  dyeResolution: 768,
  densityDissipation: 2.2,
  velocityDissipation: 0.8,
  pressure: 0.8,
  pressureIterations: 14,
  curl: 14,
  splatRadius: 0.16,
  splatForce: 4500,
};

/** soft cyan → sky blue, never rainbow */
const PALETTE: [number, number, number][] = [
  [0.18, 0.55, 1.0], // #2f8cff
  [0.3, 0.75, 1.0],
  [0.5, 0.89, 1.0], // #7fe3ff
  [0.12, 0.42, 0.95],
];

const VERT = `
precision highp float;
attribute vec2 aPosition;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform vec2 texelSize;
void main(){
  vUv = aPosition * 0.5 + 0.5;
  vL = vUv - vec2(texelSize.x, 0.0);
  vR = vUv + vec2(texelSize.x, 0.0);
  vT = vUv + vec2(0.0, texelSize.y);
  vB = vUv - vec2(0.0, texelSize.y);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const FRAG = {
  copy: `precision mediump float; precision mediump sampler2D; varying highp vec2 vUv; uniform sampler2D uTexture; void main(){ gl_FragColor = texture2D(uTexture, vUv); }`,

  clear: `precision mediump float; precision mediump sampler2D; varying highp vec2 vUv; uniform sampler2D uTexture; uniform float value; void main(){ gl_FragColor = value * texture2D(uTexture, vUv); }`,

  splat: `precision highp float; precision highp sampler2D; varying vec2 vUv; uniform sampler2D uTarget; uniform float aspectRatio; uniform vec3 color; uniform vec2 point; uniform float radius; void main(){ vec2 p = vUv - point; p.x *= aspectRatio; vec3 splat = exp(-dot(p,p) / radius) * color; vec3 base = texture2D(uTarget, vUv).xyz; gl_FragColor = vec4(base + splat, 1.0); }`,

  // manual bilinear when linear filtering of half-float is unavailable
  advection: `
precision highp float; precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 texelSize;
uniform vec2 dyeTexelSize;
uniform float dt;
uniform float dissipation;
vec4 bilerp(sampler2D sam, vec2 uv, vec2 tsize){
  vec2 st = uv / tsize - 0.5;
  vec2 iuv = floor(st);
  vec2 fuv = fract(st);
  vec4 a = texture2D(sam, (iuv + vec2(0.5,0.5)) * tsize);
  vec4 b = texture2D(sam, (iuv + vec2(1.5,0.5)) * tsize);
  vec4 c = texture2D(sam, (iuv + vec2(0.5,1.5)) * tsize);
  vec4 d = texture2D(sam, (iuv + vec2(1.5,1.5)) * tsize);
  return mix(mix(a,b,fuv.x), mix(c,d,fuv.x), fuv.y);
}
void main(){
#ifdef MANUAL_FILTERING
  vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
  vec4 result = bilerp(uSource, coord, dyeTexelSize);
#else
  vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
  vec4 result = texture2D(uSource, coord);
#endif
  float decay = 1.0 + dissipation * dt;
  gl_FragColor = result / decay;
}`,

  divergence: `
precision mediump float; precision mediump sampler2D;
varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB;
uniform sampler2D uVelocity;
void main(){
  float L = texture2D(uVelocity, vL).x;
  float R = texture2D(uVelocity, vR).x;
  float T = texture2D(uVelocity, vT).y;
  float B = texture2D(uVelocity, vB).y;
  vec2 C = texture2D(uVelocity, vUv).xy;
  if (vL.x < 0.0) L = -C.x;
  if (vR.x > 1.0) R = -C.x;
  if (vT.y > 1.0) T = -C.y;
  if (vB.y < 0.0) B = -C.y;
  gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`,

  curl: `
precision mediump float; precision mediump sampler2D;
varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB;
uniform sampler2D uVelocity;
void main(){
  float L = texture2D(uVelocity, vL).y;
  float R = texture2D(uVelocity, vR).y;
  float T = texture2D(uVelocity, vT).x;
  float B = texture2D(uVelocity, vB).x;
  gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`,

  vorticity: `
precision highp float; precision highp sampler2D;
varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float curl;
uniform float dt;
void main(){
  float L = texture2D(uCurl, vL).x;
  float R = texture2D(uCurl, vR).x;
  float T = texture2D(uCurl, vT).x;
  float B = texture2D(uCurl, vB).x;
  float C = texture2D(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= curl * C;
  force.y *= -1.0;
  vec2 velocity = texture2D(uVelocity, vUv).xy;
  velocity += force * dt;
  velocity = min(max(velocity, -1000.0), 1000.0);
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}`,

  pressure: `
precision mediump float; precision mediump sampler2D;
varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main(){
  float L = texture2D(uPressure, vL).x;
  float R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x;
  float B = texture2D(uPressure, vB).x;
  float divergence = texture2D(uDivergence, vUv).x;
  gl_FragColor = vec4((L + R + B + T - divergence) * 0.25, 0.0, 0.0, 1.0);
}`,

  gradientSubtract: `
precision mediump float; precision mediump sampler2D;
varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main(){
  float L = texture2D(uPressure, vL).x;
  float R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x;
  float B = texture2D(uPressure, vB).x;
  vec2 velocity = texture2D(uVelocity, vUv).xy;
  velocity.xy -= vec2(R - L, T - B);
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}`,

  // dye → screen: sky-blue tint, alpha clamped to ~35%
  display: `
precision highp float; precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D uTexture;
void main(){
  vec3 c = texture2D(uTexture, vUv).rgb;
  float a = clamp(max(max(c.r, c.g), c.b), 0.0, 1.0);
  a = pow(a, 1.35) * 0.35;
  vec3 tint = c / max(max(c.r, max(c.g, c.b)), 0.0001);
  tint = mix(vec3(0.5, 0.72, 1.0), tint, 0.55);
  gl_FragColor = vec4(tint * a, a);
}`,
};

type FBO = { texture: WebGLTexture; fbo: WebGLFramebuffer; width: number; height: number; texelSizeX: number; texelSizeY: number; attach(id: number): number };
type DoubleFBO = { width: number; height: number; texelSizeX: number; texelSizeY: number; read: FBO; write: FBO; swap(): void };

export class FluidTrail2D {
  private gl: WebGLRenderingContext;
  private canvas: HTMLCanvasElement;
  private cfg: FluidConfig;
  private programs = new Map<string, { program: WebGLProgram; uniforms: Record<string, WebGLUniformLocation | null> }>();
  private quad!: WebGLBuffer;
  private velocity!: DoubleFBO;
  private dye!: DoubleFBO;
  private divergence!: FBO;
  private curl!: FBO;
  private pressure!: DoubleFBO;
  private manual: boolean;
  private raf = 0;
  private last = 0;
  private running = false;
  private disposed = false;
  private scale = 1;
  private frames = 0;
  private fpsWindow = 0;
  private splatQueue: { x: number; y: number; dx: number; dy: number; color: [number, number, number]; force: number }[] = [];

  constructor(canvas: HTMLCanvasElement, cfg: Partial<FluidConfig> = {}) {
    this.canvas = canvas;
    this.cfg = { ...FLUID_CONFIG, ...cfg };
    const gl = canvas.getContext("webgl", { alpha: true, depth: false, stencil: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
    if (!gl) throw new Error("webgl unavailable");
    this.gl = gl as WebGLRenderingContext;

    const float = gl.getExtension("OES_texture_half_float");
    const floatLinear = gl.getExtension("OES_texture_half_float_linear");
    const filtering = !!(floatLinear && float);
    this.manual = !filtering;
    this.halfFloat = (float && (float as unknown as { HALF_FLOAT_OES: number }).HALF_FLOAT_OES) || gl.UNSIGNED_BYTE;

    gl.clearColor(0, 0, 0, 0);
    this.quad = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    for (const [name, src] of Object.entries(FRAG)) this.programs.set(name, this.compile(VERT, src));
    this.resize();
    this.initFramebuffers();
  }

  private halfFloat: number;

  private compile(vs: string, fs: string) {
    const gl = this.gl;
    const mk = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader");
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, mk(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || "link");
    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < n; i++) {
      const name = gl.getActiveUniform(p, i)!.name;
      uniforms[name] = gl.getUniformLocation(p, name);
    }
    return { program: p, uniforms };
  }

  private getResolution(base: number) {
    let aspect = this.gl.drawingBufferWidth / this.gl.drawingBufferHeight;
    if (aspect < 1) aspect = 1 / aspect;
    const min = Math.round(base);
    const max = Math.round(base * aspect);
    return this.gl.drawingBufferWidth > this.gl.drawingBufferHeight ? { width: max, height: min } : { width: min, height: max };
  }

  private createFBO(w: number, h: number, internal: number, format: number, type: number, filter: number): FBO {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, null);
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return {
      texture,
      fbo,
      width: w,
      height: h,
      texelSizeX: 1 / w,
      texelSizeY: 1 / h,
      attach: (id: number) => {
        gl.activeTexture(gl.TEXTURE0 + id);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        return id;
      },
    };
  }

  private createDouble(w: number, h: number, internal: number, format: number, type: number, filter: number): DoubleFBO {
    const a = this.createFBO(w, h, internal, format, type, filter);
    const b = this.createFBO(w, h, internal, format, type, filter);
    return {
      width: w,
      height: h,
      texelSizeX: a.texelSizeX,
      texelSizeY: a.texelSizeY,
      read: a,
      write: b,
      swap() {
        const t = this.read;
        this.read = this.write;
        this.write = t;
      },
    };
  }

  private initFramebuffers() {
    const gl = this.gl;
    const sim = this.getResolution(this.cfg.simResolution * this.scale);
    const dye = this.getResolution(this.cfg.dyeResolution * this.scale);
    const filter = this.manual ? gl.NEAREST : gl.LINEAR;
    const glRGBA = gl.RGBA;
    this.velocity = this.createDouble(sim.width, sim.height, glRGBA, glRGBA, this.halfFloat, filter);
    this.dye = this.createDouble(dye.width, dye.height, glRGBA, glRGBA, this.halfFloat, filter);
    this.divergence = this.createFBO(sim.width, sim.height, glRGBA, glRGBA, this.halfFloat, gl.NEAREST);
    this.curl = this.createFBO(sim.width, sim.height, glRGBA, glRGBA, this.halfFloat, gl.NEAREST);
    this.pressure = this.createDouble(sim.width, sim.height, glRGBA, glRGBA, this.halfFloat, gl.NEAREST);
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(this.canvas.clientWidth * dpr);
    const h = Math.floor(this.canvas.clientHeight * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  /** render into an FBO with the program/quad already bound */
  private use(name: string) {
    const p = this.programs.get(name)!;
    this.gl.useProgram(p.program);
    const loc = this.gl.getAttribLocation(p.program, "aPosition");
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quad);
    this.gl.enableVertexAttribArray(loc);
    this.gl.vertexAttribPointer(loc, 2, this.gl.FLOAT, false, 0, 0);
    return p;
  }
  private u(p: { uniforms: Record<string, WebGLUniformLocation | null> }, n: string) {
    return p.uniforms[n];
  }

  /** pointer-driven splat; velocity comes from the pointer delta */
  splat(x: number, y: number, dx: number, dy: number, force = 1) {
    const c = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    this.splatQueue.push({ x, y, dx, dy, color: c, force });
  }

  /** bind a render target and draw the already-bound program/quad into it */
  private drawTo(target: FBO | null) {
    const gl = this.gl;
    if (target) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      gl.viewport(0, 0, target.width, target.height);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private doSplat(x: number, y: number, dx: number, dy: number, color: [number, number, number], force: number) {
    const gl = this.gl;

    let p = this.use("splat");
    gl.uniform1i(this.u(p, "uTarget"), this.velocity.read.attach(0));
    gl.uniform1f(this.u(p, "aspectRatio"), this.canvas.width / this.canvas.height);
    gl.uniform2f(this.u(p, "point"), x, y);
    gl.uniform3f(this.u(p, "color"), dx, dy, 0);
    gl.uniform1f(this.u(p, "radius"), this.cfg.splatRadius / 100);
    this.drawTo(this.velocity.write);
    this.velocity.swap();

    p = this.use("splat");
    gl.uniform1i(this.u(p, "uTarget"), this.dye.read.attach(0));
    gl.uniform1f(this.u(p, "aspectRatio"), this.canvas.width / this.canvas.height);
    gl.uniform2f(this.u(p, "point"), x, y);
    const k = 0.16 * force;
    gl.uniform3f(this.u(p, "color"), color[0] * k, color[1] * k, color[2] * k);
    gl.uniform1f(this.u(p, "radius"), this.cfg.splatRadius / 100);
    this.drawTo(this.dye.write);
    this.dye.swap();
  }

  private step(dt: number) {
    const gl = this.gl;
    gl.disable(gl.BLEND);
    const tsx = this.velocity.texelSizeX;
    const tsy = this.velocity.texelSizeY;

    // curl → vorticity confinement
    let p = this.use("curl");
    gl.uniform2f(this.u(p, "texelSize"), tsx, tsy);
    gl.uniform1i(this.u(p, "uVelocity"), this.velocity.read.attach(0));
    this.drawTo(this.curl);

    p = this.use("vorticity");
    gl.uniform2f(this.u(p, "texelSize"), tsx, tsy);
    gl.uniform1i(this.u(p, "uVelocity"), this.velocity.read.attach(0));
    gl.uniform1i(this.u(p, "uCurl"), this.curl.attach(1));
    gl.uniform1f(this.u(p, "curl"), this.cfg.curl);
    gl.uniform1f(this.u(p, "dt"), dt);
    this.drawTo(this.velocity.write);
    this.velocity.swap();

    // divergence
    p = this.use("divergence");
    gl.uniform2f(this.u(p, "texelSize"), tsx, tsy);
    gl.uniform1i(this.u(p, "uVelocity"), this.velocity.read.attach(0));
    this.drawTo(this.divergence);

    // clear pressure
    p = this.use("clear");
    gl.uniform1i(this.u(p, "uTexture"), this.pressure.read.attach(0));
    gl.uniform1f(this.u(p, "value"), this.cfg.pressure);
    this.drawTo(this.pressure.write);
    this.pressure.swap();

    // Jacobi pressure solve
    p = this.use("pressure");
    gl.uniform2f(this.u(p, "texelSize"), tsx, tsy);
    gl.uniform1i(this.u(p, "uDivergence"), this.divergence.attach(0));
    for (let i = 0; i < this.cfg.pressureIterations; i++) {
      gl.uniform1i(this.u(p, "uPressure"), this.pressure.read.attach(1));
      this.drawTo(this.pressure.write);
      this.pressure.swap();
    }

    // gradient subtract
    p = this.use("gradientSubtract");
    gl.uniform2f(this.u(p, "texelSize"), tsx, tsy);
    gl.uniform1i(this.u(p, "uPressure"), this.pressure.read.attach(0));
    gl.uniform1i(this.u(p, "uVelocity"), this.velocity.read.attach(1));
    this.drawTo(this.velocity.write);
    this.velocity.swap();

    // advect velocity
    p = this.use("advection");
    gl.uniform2f(this.u(p, "texelSize"), tsx, tsy);
    gl.uniform2f(this.u(p, "dyeTexelSize"), tsx, tsy);
    gl.uniform1i(this.u(p, "uVelocity"), this.velocity.read.attach(0));
    gl.uniform1i(this.u(p, "uSource"), this.velocity.read.attach(0));
    gl.uniform1f(this.u(p, "dt"), dt);
    gl.uniform1f(this.u(p, "dissipation"), this.cfg.velocityDissipation);
    this.drawTo(this.velocity.write);
    this.velocity.swap();

    // advect dye
    p = this.use("advection");
    gl.uniform2f(this.u(p, "texelSize"), tsx, tsy);
    gl.uniform2f(this.u(p, "dyeTexelSize"), this.dye.texelSizeX, this.dye.texelSizeY);
    gl.uniform1i(this.u(p, "uVelocity"), this.velocity.read.attach(0));
    gl.uniform1i(this.u(p, "uSource"), this.dye.read.attach(1));
    gl.uniform1f(this.u(p, "dt"), dt);
    gl.uniform1f(this.u(p, "dissipation"), this.cfg.densityDissipation);
    this.drawTo(this.dye.write);
    this.dye.swap();
  }

  private render() {
    const gl = this.gl;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const p = this.use("display");
    gl.uniform1i(this.u(p, "uTexture"), this.dye.read.attach(0));
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  start() {
    if (this.running || this.disposed) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running || this.disposed) return;
      const dt = Math.max(0, Math.min((now - this.last) / 1000, 0.0166));
      this.last = now;

      // auto-reduce resolution if we can't hold ~50fps
      this.frames++;
      this.fpsWindow += dt || 0.0001;
      if (this.fpsWindow > 1.5) {
        const fps = this.frames / this.fpsWindow;
        if (fps < 50 && this.scale > 0.35) {
          this.scale = Math.max(0.35, this.scale - 0.25);
          this.initFramebuffers();
        }
        this.frames = 0;
        this.fpsWindow = 0;
      }

      while (this.splatQueue.length) {
        const s = this.splatQueue.shift()!;
        this.doSplat(s.x, s.y, s.dx * this.cfg.splatForce, s.dy * this.cfg.splatForce, s.color, s.force);
      }
      this.step(dt);
      this.render();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  dispose() {
    this.stop();
    this.disposed = true;
    const gl = this.gl;
    [this.velocity, this.dye, this.pressure].forEach((d) => {
      [d.read, d.write].forEach((f) => {
        gl.deleteTexture(f.texture);
        gl.deleteFramebuffer(f.fbo);
      });
    });
    [this.divergence, this.curl].forEach((f) => {
      gl.deleteTexture(f.texture);
      gl.deleteFramebuffer(f.fbo);
    });
    this.programs.forEach((p) => gl.deleteProgram(p.program));
    gl.deleteBuffer(this.quad);
  }
}
