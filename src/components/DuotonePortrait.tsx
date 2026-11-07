import { useEffect, useRef } from "react";
import { portraitUrl } from "@/lib/assets";

const VERT = `
attribute vec2 p;
varying vec2 vUv;
void main(){ vUv = vec2(p.x*0.5+0.5, 0.5-p.y*0.5); gl_Position = vec4(p, 0.0, 1.0); }`;

/* white skin / teal-blue shadows duotone, RGB split that leans toward the pointer on hover */
const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uMouse;
uniform float uHover;
float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 duo(float l){
  vec3 shadow = vec3(0.012, 0.145, 0.30);
  vec3 mid    = vec3(0.10, 0.58, 0.74);
  vec3 hi     = vec3(1.0);
  return l < 0.5 ? mix(shadow, mid, l * 2.0) : mix(mid, hi, (l - 0.5) * 2.0);
}
void main(){
  vec2 dir = uMouse - vUv;
  vec2 off = dir / (length(dir) + 0.001) * 0.016 * uHover;
  vec3 L = vec3(
    lum(texture2D(uTex, vUv + off).rgb),
    lum(texture2D(uTex, vUv).rgb),
    lum(texture2D(uTex, vUv - off).rgb)
  );
  L = smoothstep(0.06, 0.94, L);
  gl_FragColor = vec4(duo(L.r).r, duo(L.g).g, duo(L.b).b, 1.0);
}`;

function placeholder(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d")!;
  const lg = g.createLinearGradient(0, 0, 0, 512);
  lg.addColorStop(0, "#dcdcdc");
  lg.addColorStop(0.55, "#8a8a8a");
  lg.addColorStop(1, "#262626");
  g.fillStyle = lg;
  g.fillRect(0, 0, 512, 512);
  const rg = g.createRadialGradient(180, 160, 10, 230, 230, 340);
  rg.addColorStop(0, "rgba(255,255,255,0.95)");
  rg.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = rg;
  g.fillRect(0, 0, 512, 512);
  const img = g.getImageData(0, 0, 512, 512);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 36;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  return c;
}

function coverSquare(img: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const g = c.getContext("2d")!;
  const s = Math.max(1024 / img.width, 1024 / img.height);
  const w = img.width * s;
  const h = img.height * s;
  g.drawImage(img, (1024 - w) / 2, (1024 - h) * 0.3, w, h);
  return c;
}

/**
 * Square portrait with a duotone shader. Drop a photo at src/assets/me.jpg to replace the
 * neutral placeholder; hover adds a slight chromatic shift toward the pointer.
 */
export default function DuotonePortrait({ src = portraitUrl, caption = "PORTRAIT" }: { src?: string; caption?: string }) {
  const wrap = useRef<HTMLDivElement | null>(null);
  const cv = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = cv.current;
    const host = wrap.current;
    if (!canvas || !host) return;
    const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false });
    if (!gl) return;

    const sh = (type: number, srcText: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, srcText);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const tex = gl.createTexture();
    const upload = (source: HTMLCanvasElement) => {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    };
    const uMouse = gl.getUniformLocation(prog, "uMouse");
    const uHover = gl.getUniformLocation(prog, "uHover");

    const size = Math.round(Math.min(2, window.devicePixelRatio || 1) * Math.max(host.clientWidth, 200));
    canvas.width = canvas.height = size;
    gl.viewport(0, 0, size, size);

    const s = { hover: 0, target: 0, mx: 0.5, my: 0.5, tx: 0.5, ty: 0.5, running: false };
    const draw = () => {
      gl.uniform2f(uMouse, s.mx, s.my);
      gl.uniform1f(uHover, s.hover);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    let raf = 0;
    const frame = () => {
      s.hover += (s.target - s.hover) * 0.12;
      s.mx += (s.tx - s.mx) * 0.2;
      s.my += (s.ty - s.my) * 0.2;
      draw();
      if (Math.abs(s.target - s.hover) > 0.003 || Math.abs(s.tx - s.mx) > 0.003 || Math.abs(s.ty - s.my) > 0.003) {
        raf = requestAnimationFrame(frame);
      } else s.running = false;
    };
    const kick = () => {
      if (s.running) return;
      s.running = true;
      raf = requestAnimationFrame(frame);
    };

    upload(placeholder());
    draw();

    let alive = true;
    if (src) {
      const img = new Image();
      img.onload = () => {
        if (!alive) return;
        upload(coverSquare(img));
        draw();
      };
      img.src = src;
    }

    const move = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      s.tx = (e.clientX - r.left) / r.width;
      s.ty = (e.clientY - r.top) / r.height;
      kick();
    };
    const enter = () => {
      s.target = 1;
      kick();
    };
    const leave = () => {
      s.target = 0;
      kick();
    };
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerenter", enter);
    host.addEventListener("pointerleave", leave);
    host.addEventListener("focus", enter);
    host.addEventListener("blur", leave);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerenter", enter);
      host.removeEventListener("pointerleave", leave);
      host.removeEventListener("focus", enter);
      host.removeEventListener("blur", leave);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [src]);

  return (
    <div
      ref={wrap}
      tabIndex={0}
      role="img"
      aria-label="Portrait of Kirtan Kumar Sanghi (duotone)"
      className="relative aspect-square w-full overflow-hidden outline-none"
      style={{ background: "#0a3a55", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)" }}
      data-cursor="HOVER"
    >
      <canvas ref={cv} className="absolute inset-0 h-full w-full" />
      <span className="mono absolute bottom-2 left-2 text-white/80">{caption}</span>
    </div>
  );
}
