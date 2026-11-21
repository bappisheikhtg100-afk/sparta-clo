import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import Lenis from 'lenis';
import { HERO_LOOKS, DemoLookPiece } from './demoData';

const PAINT_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy * 2.0, 0.999, 1.0);
  }
`;

const PAINT_CHUNK = /* glsl */ `
  uniform float uPaint;
  uniform float uTime;
  uniform vec2 uRes;

  float paintEdge(float x) {
    float amp = 0.075 * sin(3.14159265 * clamp(uPaint, 0.0, 1.0));
    float wave =
      sin(x * 4.2 + uTime * 0.9) * 0.45 +
      sin(x * 9.7 - uTime * 1.3) * 0.25 +
      sin(x * 21.0 + uTime * 2.1) * 0.10 +
      pow(max(0.0, sin(x * 2.3 - 0.6)), 8.0) * 0.9;
    return uPaint * 1.25 - 0.12 + wave * amp;
  }

  vec2 paintAt(vec2 fragCoord) {
    vec2 s = fragCoord / uRes;
    float x = s.x * (uRes.x / uRes.y);
    float edge = paintEdge(x);
    float d = edge - s.y;
    float aa = 1.5 / uRes.y;
    return vec2(smoothstep(-aa, aa, d), d);
  }
`;

const PAINT_FRAGMENT = /* glsl */ `
  ${PAINT_CHUNK}
  uniform vec3 uInk;
  uniform vec3 uPaper;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec2 pa = paintAt(gl_FragCoord.xy);
    float rim = exp(-pa.y * 70.0) * 0.07 * pa.x;
    vec3 paper = uPaper - rim;
    vec3 col = mix(uInk, paper, pa.x);
    col += (hash(gl_FragCoord.xy + fract(uTime) * 100.0) - 0.5) * 0.024 * (1.0 - pa.x);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const CARD_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const PA = 0.72;
const CARD_FRAGMENT = /* glsl */ `
  ${PAINT_CHUNK}
  uniform sampler2D uMap;
  uniform vec3 uTop;
  uniform vec3 uBottom;
  uniform vec3 uPaper;
  uniform float uAspect;
  uniform float uBlur;
  uniform float uOpacity;
  varying vec2 vUv;

  const float PLANE_W = ${PA.toFixed(4)};

  float sdRound(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  vec4 sampleLook(vec2 l) {
    vec2 iuv = vec2(l.x / 0.75 + 0.5, l.y + 0.5);
    vec2 inside = step(vec2(0.001), iuv) * step(iuv, vec2(0.999));
    return texture2D(uMap, clamp(iuv, vec2(0.0), vec2(1.0))) * inside.x * inside.y;
  }

  vec4 sampleLookBlurred(vec2 l) {
    if (uBlur < 0.0005) return sampleLook(l);
    vec4 acc = vec4(0.0);
    float total = 0.0;
    for (int i = 0; i < 24; i++) {
      float fi = float(i);
      float r = sqrt((fi + 0.5) / 24.0);
      float a = fi * 2.39996323;
      vec2 o = vec2(cos(a), sin(a)) * r * uBlur;
      float w = 1.0 - r * 0.5;
      vec4 s = sampleLook(l + o);
      acc += s * w;
      total += w;
    }
    return acc / max(total, 1e-4);
  }

  void main() {
    vec2 l = (vUv - 0.5) * vec2(PLANE_W, 1.0);
    vec2 pa = paintAt(gl_FragCoord.xy);
    float painted = pa.x;

    float d = sdRound(l, vec2(uAspect * 0.5, 0.5), 0.055);
    float aa = length(vec2(dFdx(l.y), dFdy(l.y))) * 1.6;
    float cardMask = 1.0 - smoothstep(-aa, aa, d);

    vec3 bg = mix(uBottom, uTop, smoothstep(0.0, 1.0, vUv.y));
    bg += 0.06 * exp(-dot(l - vec2(0.0, 0.08), l - vec2(0.0, 0.08)) * 9.0);
    bg -= 0.04 * smoothstep(0.2, 0.5, abs(l.x) / max(uAspect, 0.01));

    vec4 tex = sampleLookBlurred(l);
    vec3 portrait = mix(bg, tex.rgb, tex.a);
    float paperBorder = smoothstep(-0.012, 0.0, d) * cardMask * painted;
    vec3 col = mix(portrait, uPaper * 0.92, paperBorder * 0.65);

    gl_FragColor = vec4(col, cardMask * uOpacity);
  }
`;

const INK_HEX = '#0b0b0b';
const PAPER_HEX = '#f7f7f5';
const COUNT = HERO_LOOKS.length;
const GAP = 0.028;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smoothRange = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const wrapSigned = (x: number, n: number) => (((x + n / 2) % n) + n) % n - n / 2;

const sampleProfile = (arr: readonly number[], offset: number) => {
  const idx = offset + 2;
  if (idx <= 0) return arr[0] + (arr[0] - arr[1]) * -idx;
  if (idx >= 4) return arr[4] + (arr[4] - arr[3]) * (idx - 4);
  const lo = Math.floor(idx);
  return lerp(arr[lo], arr[Math.min(lo + 1, 4)], idx - lo);
};

const POSE_FAN = {
  x: [-0.575, -0.315, 0, 0.315, 0.575],
  y: [-0.06, -0.09, -0.17, -0.09, -0.06],
  h: [0.43, 0.5, 0.52, 0.5, 0.43],
  rot: [0.44, 0.3, 0, -0.3, -0.44],
  aspect: [0.56, 0.52, 0.64, 0.52, 0.56],
};

const POSE_FLAT = {
  x: [-0.57, -0.315, 0, 0.315, 0.57],
  y: [0.1, 0.06, -0.01, 0.06, 0.1],
  h: [0.43, 0.49, 0.5, 0.49, 0.43],
};

const POSE_CAROUSEL = {
  x: [-0.58, -0.32, 0, 0.32, 0.58],
  y: [0.17, 0.14, 0.1, 0.14, 0.17],
  h: [0.4, 0.44, 0.53, 0.44, 0.4],
  z: [-0.04, -0.02, 0.14, -0.02, -0.04],
  blur: [1, 1, 0, 1, 1],
};

function detectSoftwareWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl =
      (c.getContext('webgl2') as WebGLRenderingContext | null) ||
      (c.getContext('webgl') as WebGLRenderingContext | null);
    if (!gl) return true;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) {
      const r = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '');
      if (/SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(r)) return true;
    }
    return false;
  } catch {
    return true;
  }
}

interface CardEntry {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  mat: THREE.ShaderMaterial;
  product: DemoLookPiece;
}

class HeroStageEngine {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(30, 1, 1, 10000);
  cards: CardEntry[] = [];
  shared = {
    uPaint: { value: 0 },
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uPaper: { value: new THREE.Color(PAPER_HEX) },
  };
  width = 1;
  height = 1;
  raf = 0;
  lastTs = 0;
  elapsed = 0;
  started = -1;
  progress = 0;
  offset = 2;
  targetOffset = 2;
  mouse = new THREE.Vector2();
  mouseSmooth = new THREE.Vector2();
  aX = [...POSE_FAN.x];
  layoutKey = '';
  track: HTMLElement | null = null;
  contextLost = false;
  onFrame?: (state: {
    progress: number;
    intro: number;
    paint: number;
    shop: number;
    offset: number;
    width: number;
    height: number;
  }) => void;

  constructor(canvas: HTMLCanvasElement, isSoftGl: boolean) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !isSoftGl,
      alpha: false,
      powerPreference: isSoftGl ? 'default' : 'high-performance',
    });
    this.renderer.setPixelRatio(isSoftGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));

    const bgMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShaderMaterial({
        vertexShader: PAINT_VERTEX,
        fragmentShader: PAINT_FRAGMENT,
        uniforms: {
          ...this.shared,
          uInk: { value: new THREE.Color(INK_HEX) },
        },
        depthTest: false,
        depthWrite: false,
      })
    );
    bgMesh.frustumCulled = false;
    bgMesh.renderOrder = -1;
    this.scene.add(bgMesh);

    canvas.addEventListener('webglcontextlost', this.handleContextLost);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
    window.addEventListener('resize', this.resize);
    window.addEventListener('pointermove', this.onPointer);
    this.resize();
  }

  handleContextLost = (e: Event) => {
    e.preventDefault();
    this.contextLost = true;
  };

  handleContextRestored = () => {
    this.contextLost = false;
  };

  async load(): Promise<void> {
    const loader = new THREE.TextureLoader();
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const textures = await Promise.all(
      HERO_LOOKS.map(
        (item) =>
          new Promise<THREE.Texture>((resolve) => {
            loader.load(
              item.image,
              (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace;
                resolve(tex);
              },
              undefined,
              () => resolve(new THREE.Texture())
            );
          })
      )
    );

    textures.forEach((tex, i) => {
      tex.anisotropy = Math.min(maxAniso, 8);
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      const product = HERO_LOOKS[i];
      const mat = new THREE.ShaderMaterial({
        vertexShader: CARD_VERTEX,
        fragmentShader: CARD_FRAGMENT,
        uniforms: {
          ...this.shared,
          uMap: { value: tex },
          uTop: { value: new THREE.Color(product.top) },
          uBottom: { value: new THREE.Color(product.bottom) },
          uAspect: { value: 0.6 },
          uBlur: { value: 0 },
          uOpacity: { value: 0 },
        },
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      this.scene.add(mesh);
      this.cards.push({ mesh, mat, product });
    });

    this.renderer.compile(this.scene, this.camera);
    textures.forEach((tex) => this.renderer.initTexture(tex));
  }

  start() {
    this.started = 0;
    this.lastTs = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  step(delta: number) {
    this.targetOffset += delta;
  }

  get target() {
    return this.targetOffset;
  }

  onPointer = (e: PointerEvent) => {
    this.mouse.set(
      (e.clientX / window.innerWidth) * 2 - 1,
      (e.clientY / window.innerHeight) * 2 - 1
    );
  };

  resize = () => {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.renderer.setSize(this.width, this.height, false);
    const dpr = this.renderer.getPixelRatio();
    this.shared.uRes.value.set(this.width * dpr, this.height * dpr);
    this.camera.aspect = this.width / Math.max(1, this.height);
    this.camera.position.z =
      this.height / 2 / Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    this.camera.updateProjectionMatrix();
  };

  solveLayout(stageUnit: number) {
    const cam = this.camera.clone();
    cam.position.set(0, 0, this.camera.position.z);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld();

    const p = new THREE.Vector3();
    const edgeX = (idx: number, cx: number, side: number) => {
      const halfW = (POSE_FAN.h[idx] * POSE_FAN.aspect[idx] * stageUnit) / 2;
      const rot = POSE_FAN.rot[idx];
      p.set(
        cx * stageUnit + side * halfW * Math.cos(rot),
        POSE_FAN.y[idx] * stageUnit,
        -side * halfW * Math.sin(rot)
      ).project(cam);
      return (p.x * this.width) / 2;
    };

    const gapPx = GAP * stageUnit;
    for (const side of [1, -1]) {
      let prevEdge = edgeX(2, 0, side);
      for (const idx of [2 + side, 2 + 2 * side]) {
        const target = prevEdge + side * gapPx;
        let lo = -2;
        let hi = 2;
        for (let iter = 0; iter < 40; iter++) {
          const mid = (lo + hi) / 2;
          if (edgeX(idx, mid, -side) < target) lo = mid;
          else hi = mid;
        }
        this.aX[idx] = (lo + hi) / 2;
        prevEdge = edgeX(idx, this.aX[idx], side);
      }
    }
  }

  loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop);
    if (this.contextLost) return;

    const dt = Math.min((now - this.lastTs) / 1000, 1 / 20);
    this.lastTs = now;
    this.elapsed += dt;
    const tSinceStart = this.elapsed - this.started;
    this.shared.uTime.value = this.elapsed;

    let rawProgress = 0;
    let visible = true;
    if (this.track) {
      const rect = this.track.getBoundingClientRect();
      const maxScroll = rect.height - window.innerHeight;
      rawProgress = maxScroll > 0 ? clamp01(-rect.top / maxScroll) : 0;
      visible = rect.bottom > -100;
    }

    this.progress += (rawProgress - this.progress) * (1 - Math.exp(-dt * 12));
    this.offset += (this.targetOffset - this.offset) * (1 - Math.exp(-dt * 6.5));

    const p = this.progress;
    const timedIntro = easeOutCubic(smoothRange(tSinceStart, 0.1, 1.25));
    const intro = Math.max(timedIntro, clamp01(p * 12));
    const fanMid = easeInOutCubic(smoothRange(p, 0.01, 0.16));
    const fanOuter = easeInOutCubic(smoothRange(p, 0.14, 0.30));
    const paint = smoothRange(p, 0.34, 0.62);
    const flat = easeInOutCubic(smoothRange(p, 0.34, 0.58));
    const shop = easeInOutCubic(smoothRange(p, 0.66, 0.88));

    this.shared.uPaint.value = paint;

    if (shop === 0) {
      const nearestCenter = this.targetOffset + wrapSigned(2 - this.targetOffset, COUNT);
      if (nearestCenter !== this.targetOffset) {
        this.targetOffset = Math.round(nearestCenter);
      }
    }

    const w = this.width;
    const h = this.height;
    const unit = w < h ? Math.min(w, h * 0.62) : Math.min(w / 1.2, h);
    const key = `${w}x${h}`;
    if (key !== this.layoutKey) {
      this.layoutKey = key;
      this.solveLayout(unit);
    }

    this.mouseSmooth.lerp(this.mouse, 1 - Math.exp(-dt * 3.5));
    this.camera.position.x = this.mouseSmooth.x * 20;
    this.camera.position.y = -this.mouseSmooth.y * 12;
    this.camera.lookAt(0, 0, 0);

    for (let i = 0; i < this.cards.length; i++) {
      const { mesh, mat } = this.cards[i];
      const rel = wrapSigned(i - this.offset, COUNT);
      const dist = Math.abs(rel);
      const wingT = dist < 0.5 ? 1 : dist < 1.5 ? fanMid : fanOuter;

      let x = lerp(this.aX[2], sampleProfile(this.aX, rel), wingT);
      let y = lerp(POSE_FAN.y[2], sampleProfile(POSE_FAN.y, rel), wingT);
      let cardH = lerp(POSE_FAN.h[2] * 0.94, sampleProfile(POSE_FAN.h, rel), wingT);
      let rotY = lerp(0, sampleProfile(POSE_FAN.rot, rel), wingT);
      let z = lerp(-0.03 * dist, 0, wingT);
      const aspect = lerp(POSE_FAN.aspect[2], sampleProfile(POSE_FAN.aspect, rel), wingT);

      x = lerp(x, sampleProfile(POSE_FLAT.x, rel), flat);
      y = lerp(y, sampleProfile(POSE_FLAT.y, rel), flat);
      cardH = lerp(cardH, sampleProfile(POSE_FLAT.h, rel), flat);
      rotY = lerp(rotY, 0, flat);

      x = lerp(x, sampleProfile(POSE_CAROUSEL.x, rel), shop);
      y = lerp(y, sampleProfile(POSE_CAROUSEL.y, rel), shop);
      cardH = lerp(cardH, sampleProfile(POSE_CAROUSEL.h, rel), shop);
      z = lerp(z, sampleProfile(POSE_CAROUSEL.z, dist > 2 ? 2 : rel), shop);

      const blur = clamp01(sampleProfile(POSE_CAROUSEL.blur, Math.max(-2, Math.min(2, rel)))) * shop;
      y += Math.sin(this.elapsed * 0.9 + i * 1.7) * 0.004 * flat;

      let opacity = dist < 0.5 ? 1 : Math.min(1, wingT * 25);
      opacity *= 1 - smoothRange(dist, 2.05, 2.5);

      let rotX = 0;
      if (dist < 0.5) {
        y -= (1 - intro) * 0.95;
        cardH *= 0.88 + 0.12 * intro;
        rotX = (1 - intro) * -0.35;
        opacity *= smoothRange(intro, 0, 0.25);
      } else {
        opacity *= intro;
      }

      mesh.position.set(x * unit, y * unit, z * unit);
      mesh.rotation.set(rotX, rotY, 0);
      mesh.scale.set(cardH * unit * PA, cardH * unit, 1);
      mesh.renderOrder = 100 - Math.round(dist * 10);

      mat.uniforms.uAspect.value = aspect;
      mat.uniforms.uBlur.value = blur * 0.02;
      mat.uniforms.uOpacity.value = opacity;
    }

    if (visible) {
      this.renderer.render(this.scene, this.camera);
      this.onFrame?.({
        progress: p,
        intro,
        paint,
        shop,
        offset: this.offset,
        width: w,
        height: h,
      });
    }
  };

  dispose() {
    cancelAnimationFrame(this.raf);
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('pointermove', this.onPointer);
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mat = obj.material as THREE.ShaderMaterial;
        const map = mat.uniforms?.uMap?.value as THREE.Texture | undefined;
        map?.dispose();
        mat.dispose();
      }
    });
    this.renderer.dispose();
  }
}

const HEADLINE_LINES = ['Tailored for', 'the modern Spartan.'];
const MANIFESTO_TEXT =
  'SPARTA is menswear built on restraint — architectural knitwear, crisp double-pleat tailoring, and signature extrait perfumes crafted to carry effortlessly from studio to evening.';
const MANIFESTO_WORDS = MANIFESTO_TEXT.split(' ');
const TYPE_DELAY_MS = 320;
const TYPE_INTERVAL_MS = 45;

export const SpartaCrestIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
    <path
      d="M16 2.5L18.9 12.1L29.5 16L18.9 19.9L16 29.5L13.1 19.9L2.5 16L13.1 12.1L16 2.5Z"
      fill="currentColor"
    />
    <circle cx="16" cy="16" r="2.2" fill="#0b0b0b" />
  </svg>
);

interface HeroStage3DProps {
  cartCount: number;
  favouritesCount: number;
  onOpenSearch: () => void;
  onOpenFavourites: () => void;
  onOpenBag: () => void;
  onBackToStore: () => void;
  onInspectLook: (piece: DemoLookPiece) => void;
}

export const HeroStage3D: React.FC<HeroStage3DProps> = ({
  cartCount,
  favouritesCount,
  onOpenSearch,
  onOpenFavourites,
  onOpenBag,
  onBackToStore,
  onInspectLook,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const heroTextRef = useRef<HTMLDivElement | null>(null);
  const scrollCueRef = useRef<HTMLDivElement | null>(null);
  const arrowsRef = useRef<HTMLDivElement | null>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const engineRef = useRef<HeroStageEngine | null>(null);
  const isLightRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [typedCount, setTypedCount] = useState(0);

  useEffect(() => {
    if (!ready) return;
    let intervalId = 0;
    const timeoutId = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        setTypedCount((prev) => {
          if (prev + 1 >= MANIFESTO_WORDS.length) {
            window.clearInterval(intervalId);
            return MANIFESTO_WORDS.length;
          }
          return prev + 1;
        });
      }, TYPE_INTERVAL_MS);
    }, TYPE_DELAY_MS);
    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [ready]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const track = trackRef.current;
    if (!canvas || !track) return;

    const prevScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';

    const prevScrollRest = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    const lenis = new Lenis({ autoRaf: true, lerp: 0.095 });

    const isSoftGl = detectSoftwareWebGL();
    const engine = new HeroStageEngine(canvas, isSoftGl);
    engineRef.current = engine;
    engine.track = track;

    engine.onFrame = ({ progress, paint, shop, offset, width, height }) => {
      const container = trackRef.current;
      if (!container) return;

      const lightMode = paint > 0.84;
      if (lightMode !== isLightRef.current) {
        isLightRef.current = lightMode;
        container.dataset.light = lightMode ? '1' : '0';
      }

      if (heroTextRef.current) {
        heroTextRef.current.style.opacity = String(1 - smoothRange(paint, 0.55, 0.88));
      }

      if (scrollCueRef.current) {
        scrollCueRef.current.style.opacity = String(1 - smoothRange(progress, 0.02, 0.12));
      }

      const cardW = Math.max(width / 5.35, 150);
      const cardH = Math.min(cardW * 1.02, height * 0.3);

      slotRefs.current.forEach((slotEl, idx) => {
        if (!slotEl) return;
        const rel = wrapSigned(idx - offset, COUNT);
        const absRel = Math.abs(rel);
        const visible = absRel < width / cardW / 2 + 1 && shop > 0.001;
        slotEl.style.visibility = visible ? 'visible' : 'hidden';
        if (!visible) return;

        const rise = 1 - Math.pow(1 - clamp01(shop * 1.7 - 0.12 - absRel * 0.13), 3);
        const tx = width / 2 + rel * cardW - cardW / 2;
        const ty = (1 - rise) * (cardH + 40);
        slotEl.style.width = `${cardW}px`;
        slotEl.style.height = `${cardH}px`;
        slotEl.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
        slotEl.style.setProperty('--f', String(clamp01(1 - absRel)));
        slotEl.style.zIndex = absRel < 0.5 ? '2' : '1';
      });

      if (arrowsRef.current) {
        const aOpacity = smoothRange(shop, 0.55, 0.95);
        arrowsRef.current.style.opacity = String(aOpacity);
        arrowsRef.current.style.bottom = `${cardH + 24}px`;
        arrowsRef.current.style.transform = `translateY(${(1 - aOpacity) * 16}px)`;
        arrowsRef.current.style.pointerEvents = aOpacity > 0.75 ? 'auto' : 'none';
      }
    };

    let cancelled = false;

    Promise.all([engine.load(), document.fonts?.ready ?? Promise.resolve()]).then(() => {
      if (cancelled) return;
      setReady(true);
      engine.start();
    });

    const onKeyDown = (e: KeyboardEvent) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (rect && rect.bottom < window.innerHeight * 0.5) return;
      if (e.key === 'ArrowLeft') engine.step(-1);
      if (e.key === 'ArrowRight') engine.step(1);
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      cancelled = true;
      window.removeEventListener('keydown', onKeyDown);
      document.documentElement.style.scrollBehavior = prevScrollBehavior;
      window.history.scrollRestoration = prevScrollRest;
      lenis.destroy();
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleSelectSlot = (idx: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    const stepDelta = ((Math.round(wrapSigned(idx - engine.target, COUNT)) % COUNT) + 7) % COUNT - 2;
    if (stepDelta !== 0) {
      engine.step(stepDelta);
    } else {
      onInspectLook(HERO_LOOKS[idx % COUNT]);
    }
  };

  const finishedTyping = typedCount >= MANIFESTO_WORDS.length;

  return (
    <div ref={trackRef} data-light="0" data-ready={ready ? '1' : '0'} className="relative h-[440vh]">
      <div className="sticky top-0 h-svh w-full overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />

        {/* Adaptive 3-Zone Floating Header */}
        <header className="header pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-7">
          <a
            href="#demo"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="reveal-down pointer-events-auto flex items-center gap-2.5 text-white transition-colors duration-500"
            style={{ '--d': '0.05s' } as React.CSSProperties}
          >
            <SpartaCrestIcon className="logo-mark h-7 w-7 sm:h-8 sm:w-8 transition-colors duration-500" />
            <span className="logo font-logo text-[1.9rem] leading-none tracking-[-0.02em] sm:text-[2.3rem] transition-colors duration-500">
              SPARTA
            </span>
          </a>

          <nav className="pointer-events-auto flex items-center" aria-label="Primary">
            {/* Mobile Hamburger Dropdown */}
            <div className="relative sm:hidden">
              <button
                type="button"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
                aria-controls="sparta-demo-mmenu"
                onClick={() => setMenuOpen((o) => !o)}
                className="hbtn reveal-down grid h-11 w-11 place-items-center rounded-full"
                style={{ '--d': '0.15s' } as React.CSSProperties}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-[18px] w-[18px]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  {menuOpen ? (
                    <path d="M6 6l12 12M18 6 6 18" />
                  ) : (
                    <path d="M4 7.5h16M4 12h16M4 16.5h16" />
                  )}
                </svg>
              </button>

              <div id="sparta-demo-mmenu" className="mmenu" hidden={!menuOpen}>
                <button
                  type="button"
                  className="mmenu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenSearch();
                  }}
                >
                  <span className="font-ui-demo text-[15px] font-light">Search Archive</span>
                </button>
                <button
                  type="button"
                  className="mmenu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenFavourites();
                  }}
                >
                  <span className="font-ui-demo text-[15px] font-light">
                    Saved Pieces ({favouritesCount})
                  </span>
                </button>
                <button
                  type="button"
                  className="mmenu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenBag();
                  }}
                >
                  <span className="font-ui-demo text-[15px] font-light">
                    Shopping Bag ({cartCount})
                  </span>
                </button>
                <button
                  type="button"
                  className="mmenu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    onBackToStore();
                  }}
                >
                  <span className="font-ui-demo text-[15px] font-light">Official Store</span>
                </button>
              </div>
            </div>

            {/* Desktop Circular Action Pills */}
            <div className="hidden items-center gap-3 sm:flex">
              <button
                type="button"
                aria-label="Search"
                onClick={onOpenSearch}
                className="hbtn reveal-down grid h-[52px] w-[52px] place-items-center rounded-full cursor-pointer"
                style={{ '--d': '0.15s' } as React.CSSProperties}
              >
                <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="M16 16l4.5 4.5" strokeLinecap="round" />
                </svg>
              </button>

              <button
                type="button"
                aria-label="Favourites"
                onClick={onOpenFavourites}
                className="hbtn reveal-down relative grid h-[52px] w-[52px] place-items-center rounded-full cursor-pointer"
                style={{ '--d': '0.22s' } as React.CSSProperties}
              >
                <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <path d="M12 20.5s-7.5-4.5-9.2-9.1C1.6 8 3.7 4.7 7 4.7c2 0 3.5 1.1 5 3 1.5-1.9 3-3 5-3 3.3 0 5.4 3.3 4.2 6.7-1.7 4.6-9.2 9.1-9.2 9.1Z" />
                </svg>
                {favouritesCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-5 w-5 place-items-center rounded-full bg-white text-[10px] font-semibold text-black">
                    {favouritesCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                aria-label="Bag"
                onClick={onOpenBag}
                className="hbtn reveal-down relative grid h-[52px] w-[52px] place-items-center rounded-full cursor-pointer"
                style={{ '--d': '0.29s' } as React.CSSProperties}
              >
                <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <path d="M5 8h14l-1.2 12.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 8Z" />
                  <path d="M8.5 8V6a3.5 3.5 0 0 1 7 0v2" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-5 w-5 place-items-center rounded-full bg-white text-[10px] font-semibold text-black">
                    {cartCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                aria-label="Official Store"
                onClick={onBackToStore}
                className="hbtn hbtn-pill reveal-down flex h-[52px] items-center gap-3 rounded-full p-1 pr-6 cursor-pointer"
                style={{ '--d': '0.36s' } as React.CSSProperties}
              >
                <span className="pill-icon grid h-11 w-11 place-items-center rounded-full text-white">
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M7 17L17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="font-ui-demo text-[15px] font-light">Official Store</span>
              </button>
            </div>
          </nav>
        </header>

        {/* Kinetic Hero Statement & Typed Manifesto */}
        <div
          ref={heroTextRef}
          className="hero-text pointer-events-none absolute inset-x-0 top-[96px] z-20 flex flex-col-reverse gap-5 px-5 text-white mix-blend-difference sm:top-[142px] sm:px-8 md:flex-row md:items-start md:justify-between"
        >
          <p
            className="max-w-[34rem] text-[12px] leading-[1.4] italic opacity-90 sm:text-[13.5px]"
            aria-label={MANIFESTO_TEXT}
          >
            {MANIFESTO_WORDS.map((word, idx) => (
              <span
                key={idx}
                aria-hidden="true"
                className={`typed-word ${idx < typedCount ? 'is-typed' : ''}`}
              >
                {word}
                {idx === typedCount - 1 && (
                  <span className={`caret ${finishedTyping ? 'caret-idle' : ''}`} />
                )}
                {idx < MANIFESTO_WORDS.length - 1 ? ' ' : ''}
              </span>
            ))}
          </p>

          <h1 className="font-display-demo text-[2rem] leading-[1.08] tracking-[0.02em] uppercase sm:text-[2.6rem] md:text-right lg:text-[3.1rem]">
            {HEADLINE_LINES.map((line, lineIdx) => (
              <span key={line} className="block overflow-hidden pb-1">
                {line.split(' ').map((word, wordIdx, arr) => (
                  <span key={wordIdx} className="inline-block overflow-hidden align-bottom">
                    <span
                      className="reveal-up inline-block"
                      style={
                        {
                          '--d': `${0.2 + lineIdx * 0.18 + wordIdx * 0.06}s`,
                        } as React.CSSProperties
                      }
                    >
                      {word}
                      {wordIdx < arr.length - 1 ? '\u00A0' : ''}
                    </span>
                  </span>
                ))}
              </span>
            ))}
          </h1>
        </div>

        {/* Scroll Prompt Cue */}
        <div
          ref={scrollCueRef}
          className="pointer-events-none absolute bottom-5 left-1/2 z-20 -translate-x-1/2 text-center text-white/60 transition-opacity"
        >
          <span className="font-ui-demo block text-[10px] tracking-[0.34em] uppercase">
            Scroll to unfold 3D runway
          </span>
        </div>

        {/* Depth Carousel Navigation Arrows */}
        <div ref={arrowsRef} className="arrows absolute right-5 z-20 flex gap-4 sm:right-8 sm:gap-5">
          {([-1, 1] as const).map((dir) => (
            <button
              key={dir}
              type="button"
              onClick={() => engineRef.current?.step(dir)}
              aria-label={dir < 0 ? 'Previous look' : 'Next look'}
              className="grid h-9 w-[3.2rem] cursor-pointer place-items-center rounded-full border border-black/80 text-black transition-colors hover:bg-black hover:text-white"
            >
              <svg viewBox="0 0 32 12" className="h-3 w-7" fill="none" stroke="currentColor" strokeWidth="1.2">
                {dir < 0 ? (
                  <path d="M31 6H1m5-5L1 6l5 5" />
                ) : (
                  <path d="M1 6h30m-5-5 5 5-5 5" />
                )}
              </svg>
            </button>
          ))}
        </div>

        {/* Bottom Floating Selector Strip */}
        <div className="strip absolute inset-x-0 bottom-0 z-20" aria-label="Look selector">
          {HERO_LOOKS.map((item, idx) => (
            <div
              key={item.id}
              ref={(el) => {
                slotRefs.current[idx] = el;
              }}
              className="strip-slot absolute bottom-0 left-0 will-change-transform"
              style={{ '--f': 0 } as React.CSSProperties}
            >
              <button
                type="button"
                onClick={() => handleSelectSlot(idx)}
                className="strip-card group block h-full w-full cursor-pointer overflow-hidden bg-white text-left"
                aria-label={`${item.name}, ৳${item.price}`}
              >
                <div
                  className="relative h-[72%] overflow-hidden"
                  style={{ background: `linear-gradient(to bottom, ${item.top}, ${item.bottom})` }}
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    draggable={false}
                    className="strip-img absolute left-1/2 top-[2%] h-[185%] w-auto max-w-none -translate-x-1/2 select-none object-cover object-top"
                  />
                  <svg
                    viewBox="0 0 24 24"
                    className="absolute left-3 top-3 h-[17px] w-[17px] text-white drop-shadow"
                    fill="currentColor"
                  >
                    <path d="M12 20.6s-7.6-4.6-9.3-9.2C1.5 8 3.6 4.6 7 4.6c2 0 3.5 1.1 5 3 1.5-1.9 3-3 5-3 3.4 0 5.5 3.4 4.3 6.8-1.7 4.6-9.3 9.2-9.3 9.2Z" />
                  </svg>
                </div>
                <div className="strip-info flex h-[28%] flex-col justify-center px-3 sm:px-3.5">
                  <div className="flex items-baseline justify-between gap-2 italic">
                    <span className="truncate text-[12px] sm:text-[13.5px]">{item.name}</span>
                    <span className="shrink-0 text-[14px] font-bold sm:text-[17px]">
                      ৳{item.price.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <span className="mt-0.5 text-[10px] tracking-wide sm:text-[11px]">
                    ★ {item.rating.toFixed(1)} · {item.category}
                  </span>
                </div>
              </button>
            </div>
          ))}
        </div>

        {/* Initial Stage Curtain */}
        <div className={`loader ${ready ? 'loader-done' : ''}`}>
          <span className="font-logo text-2xl tracking-[0.34em] text-white/75">SPARTA</span>
        </div>
      </div>
    </div>
  );
};
