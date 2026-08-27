/**
 * Canvas UI "Ripple", vendored from https://canvasui.dev/docs and stripped to
 * its framework-agnostic core. As with asciiSweep.ts, only the upstream
 * wrapper is React; createRipple() takes plain DOM elements and imports
 * nothing, so the site keeps shipping zero framework.
 *
 * ONE SUBSTANTIVE CHANGE from upstream, marked MEDIA MODE below.
 *
 * Upstream only ever fills its content texture through the experimental
 * html-in-canvas API (drawElementImage), and the shader bails out early when
 * that texture is absent:
 *
 *     uniform float uHasContent;
 *     if (uHasContent < 0.5) { ...glints only... return; }
 *
 * So in any browser without chrome://flags/#canvas-draw-element, stock Ripple
 * draws faint white rings and bends nothing at all. There is no DOM-rasterising
 * fallback here, unlike the ASCII Sweep component.
 *
 * When the thing being rippled is a single same-origin image, none of that
 * machinery is needed: an HTMLImageElement can be handed straight to
 * texImage2D in every browser. Media mode does exactly that, so the refraction
 * works everywhere instead of only behind a flag.
 */

export type RippleTrigger = 'click' | 'hover' | 'none';

export interface RippleOptions {
  /** Height of the waves (0 to 3). */
  amplitude?: number;
  /** How fast the rings travel outward. 1 is normal speed. */
  speed?: number;
  /** Distance between wave crests in CSS pixels. */
  wavelength?: number;
  /** Number of crests in each wave train (1 to 8). */
  rings?: number;
  /** How quickly the waves lose energy (higher dies faster). */
  decay?: number;
  /** How strongly the waves bend the content, in CSS pixels. */
  refraction?: number;
  /** Chromatic dispersion splitting colors along the wave slopes (0 to 1). */
  dispersion?: number;
  /** Intensity of the light glints on the wave crests (0 to 2). */
  shine?: number;
  /** What spawns ripples. */
  trigger?: RippleTrigger;
  /** Seconds between ambient ripples at random positions. 0 disables them. */
  interval?: number;
}

export interface RippleElements {
  /** Canvas with layoutsubtree that hosts the HTML content. Omit in media mode. */
  source?: HTMLCanvasElement;
  /** The element that receives pointer input and defines the rippled box. */
  content: HTMLElement;
  /** Canvas the WebGL effect renders to. */
  output: HTMLCanvasElement;
  /**
   * MEDIA MODE. An already-loaded image (or canvas/video) to use as the
   * content texture directly, skipping html-in-canvas entirely. Must be
   * same-origin or CORS-clean.
   */
  media?: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement;
}

export interface RippleInstance {
  /** Update effect options live. */
  setOptions: (options: RippleOptions) => void;
  /** Spawn a ripple at a position in CSS pixels relative to the element. */
  splash: (x: number, y: number, strength?: number) => void;
  /** Re-upload the media texture. Call when the image swaps or finishes loading. */
  refresh: () => void;
  /** Re-read canvas size. Call when the element is resized. */
  resize: () => void;
  /** Stop the loop and release all GPU resources. */
  destroy: () => void;
}

const DEFAULTS: Required<RippleOptions> = {
  amplitude: 0.5,
  speed: 0.65,
  wavelength: 80,
  rings: 2,
  decay: 1,
  refraction: 100,
  dispersion: 0.5,
  shine: 0.5,
  trigger: 'click',
  interval: 0,
};

const MAX_RIPPLES = 12;
const BASE_SPEED = 340;

type PaintableCanvas = HTMLCanvasElement & {
  onpaint?: (() => void) | null;
  requestPaint?: () => void;
};

type ElementImageContext = CanvasRenderingContext2D & {
  drawElementImage?: (element: Element, x: number, y: number) => void;
};

const VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main () {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uContent;
uniform vec2 uResolution;
uniform vec4 uRipples[12];
uniform int uCount;
uniform float uSpeed;
uniform float uWavelength;
uniform float uWidth;
uniform float uDecay;
uniform float uRefraction;
uniform float uDispersion;
uniform float uShine;
uniform float uHasContent;
uniform float uMaxX;

vec4 page (vec2 p) {
  p.x = clamp(p.x, 0.0005, uMaxX - 0.0005);
  p.y = clamp(p.y, 0.0005, 0.9995);
  return texture(uContent, p);
}

void main () {
  vec2 pUv = vec2(vUv.x, 1.0 - vUv.y);
  vec2 frag = pUv * uResolution;

  vec2 grad = vec2(0.0);
  float k = 6.28318530718 / uWavelength;
  float w2 = uWidth * uWidth;

  for (int i = 0; i < 12; i++) {
    if (i >= uCount) break;
    vec4 rp = uRipples[i];
    vec2 dv = frag - rp.xy;
    float r = length(dv);
    float front = uSpeed * rp.z;
    float s = r - front;
    float env = exp(-s * s / w2) * exp(-uDecay * rp.z) * rp.w;
    env *= smoothstep(0.0, 0.08, rp.z);
    env *= inversesqrt(1.0 + front / max(uWavelength, 1.0) * 0.2);
    if (env < 0.0015) continue;
    float dh = (k * cos(s * k) - 2.0 * s / w2 * sin(s * k)) * env;
    grad += dv / max(r, 1.0) * dh * uWavelength * 0.16;
  }

  float g = dot(grad, vec2(-0.55, -0.8));
  float glint = pow(clamp(g * 2.2, 0.0, 1.0), 2.0) * uShine;
  float shade = pow(clamp(-g * 1.6, 0.0, 1.0), 2.0) * uShine * 0.3;

  if (uHasContent < 0.5) {
    float a = clamp(glint * 0.9 + shade * 0.5, 0.0, 0.85);
    outColor = vec4(vec3(glint * 0.9), a);
    return;
  }

  vec2 offs = grad * uRefraction / uResolution;
  vec3 col;
  if (uDispersion > 0.001) {
    float d = uDispersion * 0.35;
    col = vec3(
      page(pUv + offs * (1.0 + d)).r,
      page(pUv + offs).g,
      page(pUv + offs * (1.0 - d)).b
    );
  } else {
    col = page(pUv + offs).rgb;
  }
  col += glint;
  col *= 1.0 - shade;
  outColor = vec4(col, 1.0);
}`;

export function supportsHtmlInCanvas(): boolean {
  if (typeof document === 'undefined') return false;
  const probe = document.createElement('canvas') as PaintableCanvas;
  const ctx = probe.getContext('2d') as ElementImageContext | null;
  return Boolean(
    ctx &&
      typeof ctx.drawElementImage === 'function' &&
      typeof probe.requestPaint === 'function',
  );
}

export function createRipple(
  elements: RippleElements,
  options: RippleOptions = {},
): RippleInstance | null {
  const config = { ...DEFAULTS, ...options };
  const { source, content, output, media } = elements;

  const gl = output.getContext('webgl2', {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    premultipliedAlpha: true,
  });
  if (!gl || gl.isContextLost()) return null;

  /** MEDIA MODE: a supplied image wins over the html-in-canvas path. */
  const mediaMode = Boolean(media);

  const sourceCtx = source
    ? (source.getContext('2d') as ElementImageContext | null)
    : null;
  const paintable = source as PaintableCanvas | undefined;
  const htmlInCanvas =
    !mediaMode &&
    Boolean(
      sourceCtx &&
        typeof sourceCtx.drawElementImage === 'function' &&
        paintable &&
        typeof paintable.requestPaint === 'function',
    );

  // Whether the shader has a real content texture to refract at all.
  const hasContent = mediaMode || htmlInCanvas;

  let contentDirty = mediaMode;
  let wake = () => {};

  if (htmlInCanvas) {
    paintable!.onpaint = () => {
      try {
        sourceCtx!.reset();
        sourceCtx!.drawElementImage!(content, 0, 0);
        contentDirty = true;
        wake();
      } catch {}
    };
  }

  function compile(type: number, text: string): WebGLShader {
    const shader = gl!.createShader(type)!;
    gl!.shaderSource(shader, text);
    gl!.compileShader(shader);
    if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
      console.error('Ripple shader error:', gl!.getShaderInfoLog(shader));
    }
    return shader;
  }

  const vertexShader = compile(gl.VERTEX_SHADER, VERT);
  const fragmentShader = compile(gl.FRAGMENT_SHADER, FRAG);
  const program = gl.createProgram()!;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  const uniforms: Record<string, WebGLUniformLocation> = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i)!;
    uniforms[info.name.replace('[0]', '')] = gl.getUniformLocation(program, info.name)!;
  }

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const contentTexture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, contentTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([0, 0, 0, 0]),
  );

  let contentMaxX = 1;

  function syncCanvasSize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(output.clientWidth * dpr));
    const height = Math.max(1, Math.round(output.clientHeight * dpr));
    if (output.width !== width || output.height !== height) {
      output.width = width;
      output.height = height;
    }
    contentMaxX = Math.min(
      1,
      Math.max(0.05, content.clientWidth / Math.max(output.clientWidth, 1)),
    );
    if (htmlInCanvas && source) {
      const cssWidth = Math.max(1, Math.round(source.clientWidth));
      const cssHeight = Math.max(1, Math.round(source.clientHeight));
      if (source.width !== cssWidth * dpr || source.height !== cssHeight * dpr) {
        source.width = cssWidth * dpr;
        source.height = cssHeight * dpr;
      }
      paintable!.requestPaint!();
    }
  }

  syncCanvasSize();

  function mediaReady(): boolean {
    if (!media) return false;
    if (media instanceof HTMLImageElement) {
      return media.complete && media.naturalWidth > 0;
    }
    if (media instanceof HTMLVideoElement) return media.readyState >= 2;
    return media.width > 0 && media.height > 0;
  }

  function uploadContent() {
    if (!contentDirty) return;

    // MEDIA MODE: hand the element straight to the GPU. Works in every
    // browser, no html-in-canvas and no hand-rolled DOM rasterising.
    if (mediaMode) {
      if (!mediaReady()) return;
      contentDirty = false;
      try {
        gl!.bindTexture(gl!.TEXTURE_2D, contentTexture);
        gl!.texImage2D(
          gl!.TEXTURE_2D,
          0,
          gl!.RGBA,
          gl!.RGBA,
          gl!.UNSIGNED_BYTE,
          media!,
        );
      } catch (error) {
        // A cross-origin image without CORS headers taints the upload.
        console.warn('Ripple could not upload its media texture:', error);
      }
      return;
    }

    if (!htmlInCanvas || !source) return;
    contentDirty = false;
    gl!.bindTexture(gl!.TEXTURE_2D, contentTexture);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, source);
  }

  type Wave = { x: number; y: number; age: number; amp: number };
  const ripples: Wave[] = [];
  const rippleData = new Float32Array(MAX_RIPPLES * 4);

  function splash(x: number, y: number, strength = 1) {
    if (reducedMotion) return;
    if (ripples.length >= MAX_RIPPLES) ripples.shift();
    ripples.push({ x, y, age: 0, amp: strength });
    start();
  }

  function pruneRipples(delta: number) {
    const diag = Math.hypot(output.clientWidth, output.clientHeight);
    const speedPx = BASE_SPEED * Math.max(config.speed, 0.05);
    const width = config.wavelength * Math.max(config.rings, 1) * 0.5;
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.age += delta;
      const gone =
        rp.age * speedPx > diag + width * 3 ||
        Math.exp(-Math.max(config.decay, 0.05) * rp.age) * rp.amp < 0.012;
      if (gone) ripples.splice(i, 1);
    }
  }

  function render() {
    uploadContent();
    const dpr = output.width / Math.max(output.clientWidth, 1);
    gl!.useProgram(program);
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, contentTexture);
    gl!.uniform1i(uniforms.uContent, 0);
    gl!.uniform2f(uniforms.uResolution, output.width, output.height);
    for (let i = 0; i < MAX_RIPPLES; i++) {
      const rp = ripples[i];
      rippleData[i * 4] = rp ? rp.x * dpr : 0;
      rippleData[i * 4 + 1] = rp ? rp.y * dpr : 0;
      rippleData[i * 4 + 2] = rp ? rp.age : 0;
      rippleData[i * 4 + 3] = rp ? rp.amp * Math.max(config.amplitude, 0) : 0;
    }
    gl!.uniform4fv(uniforms.uRipples, rippleData);
    gl!.uniform1i(uniforms.uCount, ripples.length);
    gl!.uniform1f(uniforms.uSpeed, BASE_SPEED * Math.max(config.speed, 0.05) * dpr);
    gl!.uniform1f(uniforms.uWavelength, Math.max(config.wavelength, 4) * dpr);
    gl!.uniform1f(
      uniforms.uWidth,
      Math.max(config.wavelength, 4) * Math.max(config.rings, 1) * 0.5 * dpr,
    );
    gl!.uniform1f(uniforms.uDecay, Math.max(config.decay, 0.05));
    gl!.uniform1f(uniforms.uRefraction, Math.max(config.refraction, 0) * dpr);
    gl!.uniform1f(uniforms.uDispersion, Math.max(config.dispersion, 0));
    gl!.uniform1f(uniforms.uShine, Math.max(config.shine, 0));
    gl!.uniform1f(uniforms.uHasContent, hasContent ? 1 : 0);
    gl!.uniform1f(uniforms.uMaxX, contentMaxX);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    gl!.viewport(0, 0, output.width, output.height);
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
  }

  function renderIdle() {
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    gl!.viewport(0, 0, output.width, output.height);
    // In media mode the real element is still in the DOM underneath, so the
    // canvas clears to nothing at rest and the untouched original shows
    // through. Only html-in-canvas keeps painting, because there the canvas
    // *is* the only copy of the content.
    if (htmlInCanvas) {
      render();
    } else {
      gl!.clearColor(0, 0, 0, 0);
      gl!.clear(gl!.COLOR_BUFFER_BIT);
    }
  }

  let raf = 0;
  let lastTime = performance.now();
  let destroyed = false;
  let running = false;
  let visible = true;
  let ambientTimer = 0;

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = motionQuery.matches;

  function spawnAmbient() {
    const w = output.clientWidth;
    const h = output.clientHeight;
    if (w < 10 || h < 10) return;
    splash(
      w * (0.15 + Math.random() * 0.7),
      h * (0.15 + Math.random() * 0.7),
      0.6 + Math.random() * 0.5,
    );
  }

  function frame(now: number) {
    if (destroyed) return;
    if (!visible) {
      running = false;
      return;
    }
    const delta = Math.min(Math.max((now - lastTime) / 1000, 0), 1 / 30);
    lastTime = now;
    if (!reducedMotion) {
      pruneRipples(delta);
      if (config.interval > 0) {
        ambientTimer += delta;
        if (ambientTimer >= config.interval) {
          ambientTimer = 0;
          spawnAmbient();
        }
      }
    }
    if (ripples.length > 0) {
      render();
    } else {
      // Upload a pending media texture even while idle, so the first click
      // does not have to wait a frame for the image to reach the GPU.
      if (mediaMode) uploadContent();
      renderIdle();
      if (!contentDirty && (config.interval <= 0 || reducedMotion)) {
        running = false;
        return;
      }
    }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (destroyed || running || !visible) return;
    running = true;
    lastTime = performance.now();
    raf = requestAnimationFrame(frame);
  }

  wake = start;
  start();

  function localPoint(event: PointerEvent): [number, number] {
    const rect = output.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  }

  let hoverX = -1e5;
  let hoverY = -1e5;

  function onPointerDown(event: PointerEvent) {
    if (config.trigger === 'none') return;
    const [x, y] = localPoint(event);
    splash(x, y, 1);
  }

  function onPointerMove(event: PointerEvent) {
    if (config.trigger !== 'hover') return;
    const [x, y] = localPoint(event);
    if (Math.hypot(x - hoverX, y - hoverY) < 56) return;
    hoverX = x;
    hoverY = y;
    splash(x, y, 0.3);
  }

  content.addEventListener('pointerdown', onPointerDown, { passive: true });
  content.addEventListener('pointermove', onPointerMove, { passive: true });

  function onMotionChange() {
    reducedMotion = motionQuery.matches;
    if (reducedMotion) ripples.length = 0;
    start();
  }
  motionQuery.addEventListener('change', onMotionChange);

  const observer = new ResizeObserver(() => {
    syncCanvasSize();
    start();
  });
  observer.observe(output);
  observer.observe(content);

  const intersection = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1]?.isIntersecting ?? true;
    if (visible) start();
  });
  intersection.observe(output);

  // The texture has to be re-uploaded once a lazily decoded image arrives.
  function onMediaLoad() {
    contentDirty = true;
    start();
  }
  if (mediaMode && media instanceof HTMLImageElement) {
    media.addEventListener('load', onMediaLoad);
  }

  return {
    setOptions(next) {
      if (
        !Object.entries(next).some(
          ([key, value]) => config[key as keyof RippleOptions] !== value,
        )
      ) {
        return;
      }
      Object.assign(config, next);
      start();
    },
    splash,
    refresh() {
      contentDirty = true;
      start();
    },
    resize() {
      syncCanvasSize();
      contentDirty = true;
      start();
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      content.removeEventListener('pointerdown', onPointerDown);
      content.removeEventListener('pointermove', onPointerMove);
      if (mediaMode && media instanceof HTMLImageElement) {
        media.removeEventListener('load', onMediaLoad);
      }
      observer.disconnect();
      intersection.disconnect();
      motionQuery.removeEventListener('change', onMotionChange);
      gl!.deleteTexture(contentTexture);
      gl!.deleteProgram(program);
      gl!.deleteShader(vertexShader);
      gl!.deleteShader(fragmentShader);
      gl!.deleteBuffer(quad);
      if (htmlInCanvas && paintable) paintable.onpaint = null;
    },
  };
}
