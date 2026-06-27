import './style.css'
import { initWinston } from './winston'

/* ===========================================================================
   Volos — cursor-reactive animation system.
   One pointer state · one rAF loop · many subscriber modules.
   Frame-rate-independent damping, sleeps when settled, honours
   prefers-reduced-motion and coarse-pointer (touch) devices.
   ========================================================================= */

document.documentElement.classList.add('js');

/* ---- shared maths -------------------------------------------------------- */
const damp = (cur: number, target: number, lambda: number, dt: number): number =>
  cur + (target - cur) * (1 - Math.exp(-lambda * dt));

interface Pointer {
  tx: number; ty: number; // raw target (client coords)
  x: number; y: number;   // smoothed
  vx: number; vy: number; // smoothed-delta velocity
  speed: number;          // smoothed pointer speed
  nx: number; ny: number; // normalised [-1,1] from viewport centre
  active: boolean;
  w: number; h: number;
}

interface Module {
  update(p: Pointer, dt: number): boolean; // true => still animating
  reset?(): void;
}

const pointer: Pointer = {
  tx: window.innerWidth / 2, ty: window.innerHeight / 2,
  x: window.innerWidth / 2, y: window.innerHeight / 2,
  vx: 0, vy: 0, speed: 0, nx: 0, ny: 0,
  active: false,
  w: window.innerWidth, h: window.innerHeight,
};

/* ---- the single rAF loop ------------------------------------------------- */
const modules: Module[] = [];
let rafId = 0;
let last = 0;
let running = false;
let forceRun = false; // touch drift keeps the loop awake

function frame(now: number): void {
  if (!last) last = now;
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 1 / 30) dt = 1 / 30; // clamp so tab-switches never lurch

  const px = pointer.x;
  const py = pointer.y;
  pointer.x = damp(pointer.x, pointer.tx, 8, dt);
  pointer.y = damp(pointer.y, pointer.ty, 8, dt);
  pointer.vx = pointer.x - px;
  pointer.vy = pointer.y - py;
  pointer.speed = damp(pointer.speed, Math.hypot(pointer.vx, pointer.vy), 10, dt);
  pointer.nx = pointer.w ? (pointer.x / pointer.w) * 2 - 1 : 0;
  pointer.ny = pointer.h ? (pointer.y / pointer.h) * 2 - 1 : 0;

  let busy = false;
  for (const m of modules) {
    if (m.update(pointer, dt)) busy = true;
  }

  const reached =
    Math.abs(pointer.x - pointer.tx) < 0.1 &&
    Math.abs(pointer.y - pointer.ty) < 0.1 &&
    pointer.speed < 0.03;

  if (!forceRun && !busy && reached) {
    running = false;
    return;
  }
  rafId = requestAnimationFrame(frame);
}

function wake(): void {
  if (running) return;
  running = true;
  last = 0;
  rafId = requestAnimationFrame(frame);
}

/* ---- rect cache refreshers (no getBoundingClientRect inside the loop) ---- */
const rectRefreshers: Array<() => void> = [];
let scrollScheduled = false;
function onScrollRefresh(): void {
  if (scrollScheduled) return;
  scrollScheduled = true;
  requestAnimationFrame(() => {
    scrollScheduled = false;
    for (const r of rectRefreshers) r();
  });
}

/* ===========================================================================
   Modules
   ========================================================================= */

/* Gold glow — soft radial light pool, lags the cursor, swells with speed. */
function createGlow(el: HTMLElement): Module {
  let gx = pointer.x;
  let gy = pointer.y;
  let op = 0;
  return {
    update(p, dt) {
      gx = damp(gx, p.tx, 7, dt);
      gy = damp(gy, p.ty, 7, dt);
      const targetOp = p.active ? Math.min(1, 0.55 + p.speed * 0.06) : 0;
      op = damp(op, targetOp, p.active ? 6 : 4, dt);
      el.style.transform = `translate3d(${gx.toFixed(1)}px, ${gy.toFixed(1)}px, 0)`;
      el.style.opacity = op.toFixed(3);
      return (
        Math.abs(gx - p.tx) > 0.5 ||
        Math.abs(gy - p.ty) > 0.5 ||
        Math.abs(op - targetOp) > 0.004
      );
    },
    reset() {
      el.style.opacity = '0';
    },
  };
}

/* Hero gyroscope — rotateX/Y + parallax toward the pointer (depth via CSS
   translateZ on the children). Driven directly by the smoothed pointer. */
function createTilt(el: HTMLElement): Module {
  const MAX = 5; // degrees
  const PARA = 12; // px
  return {
    update(p) {
      const rx = (-p.ny * MAX).toFixed(2);
      const ry = (p.nx * MAX).toFixed(2);
      const tx = (p.nx * PARA).toFixed(2);
      const ty = (p.ny * PARA).toFixed(2);
      el.style.transform = `translate3d(${tx}px, ${ty}px, 0) rotateX(${rx}deg) rotateY(${ry}deg)`;
      return false; // the loop's pointer-settle check governs sleep
    },
    reset() {
      el.style.transform = '';
    },
  };
}

/* Magnetic — element eases toward the cursor within a radius; the inner
   label leads by 1.3×. Grab fast, release soft. */
function createMagnetic(el: HTMLElement): Module {
  const RADIUS = 90;
  const STRENGTH = 0.4;
  const inner = el.querySelector<HTMLElement>(':scope > span');
  let cx = 0;
  let cy = 0;
  const refresh = () => {
    const r = el.getBoundingClientRect();
    cx = r.left + r.width / 2;
    cy = r.top + r.height / 2;
  };
  refresh();
  rectRefreshers.push(refresh);
  let ox = 0;
  let oy = 0;
  return {
    update(p, dt) {
      const dx = p.tx - cx;
      const dy = p.ty - cy;
      const dist = Math.hypot(dx, dy);
      let targetX = 0;
      let targetY = 0;
      if (p.active && dist < RADIUS) {
        const fall = 1 - dist / RADIUS;
        targetX = dx * STRENGTH * fall;
        targetY = dy * STRENGTH * fall;
      }
      const lambda = targetX || targetY ? 16 : 10;
      ox = damp(ox, targetX, lambda, dt);
      oy = damp(oy, targetY, lambda, dt);
      el.style.transform = `translate3d(${ox.toFixed(2)}px, ${oy.toFixed(2)}px, 0)`;
      if (inner) {
        inner.style.transform = `translate3d(${(ox * 0.3).toFixed(2)}px, ${(oy * 0.3).toFixed(2)}px, 0)`;
      }
      return Math.abs(ox - targetX) > 0.05 || Math.abs(oy - targetY) > 0.05;
    },
    reset() {
      el.style.transform = '';
      if (inner) inner.style.transform = '';
    },
  };
}

/* Gold constellation — sparse dot field that brightens and nudges away from
   the cursor. One canvas, DPR≤2, additive 'lighter' blend, no per-frame alloc. */
function createConstellation(canvas: HTMLCanvasElement, drift: boolean): Module {
  const ctx = canvas.getContext('2d', { alpha: true })!;
  const COUNT = 110;
  const BASE = 0.08;
  const INFLUENCE = 160;
  const INF2 = INFLUENCE * INFLUENCE;
  const NUDGE = 6;

  const bx = new Float32Array(COUNT);
  const by = new Float32Array(COUNT);
  const ox = new Float32Array(COUNT);
  const oy = new Float32Array(COUNT);
  const br = new Float32Array(COUNT).fill(BASE);

  let W = 0;
  let H = 0;
  let dpr = 1;
  let t = 0;

  function place(): void {
    for (let i = 0; i < COUNT; i++) {
      bx[i] = Math.random() * W;
      by[i] = Math.random() * H;
    }
  }
  function resize(): void {
    W = window.innerWidth;
    H = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    place();
  }
  resize();
  rectRefreshers.push(resize);

  function render(cxp: number, cyp: number): boolean {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    let moving = false;
    for (let i = 0; i < COUNT; i++) {
      const dx = bx[i] - cxp;
      const dy = by[i] - cyp;
      const d2 = dx * dx + dy * dy;
      let tBr = BASE;
      let tOx = 0;
      let tOy = 0;
      if (d2 < INF2) {
        const f = 1 - d2 / INF2;
        tBr = BASE + f * 0.6;
        const d = Math.sqrt(d2) || 1;
        tOx = (dx / d) * f * NUDGE;
        tOy = (dy / d) * f * NUDGE;
      }
      br[i] += (tBr - br[i]) * 0.12;
      ox[i] += (tOx - ox[i]) * 0.12;
      oy[i] += (tOy - oy[i]) * 0.12;
      if (Math.abs(tBr - br[i]) > 0.002 || Math.abs(tOx - ox[i]) > 0.05) moving = true;
      ctx.fillStyle = `rgba(214,178,94,${br[i].toFixed(3)})`;
      ctx.fillRect(bx[i] + ox[i], by[i] + oy[i], 2, 2);
    }
    return moving;
  }

  // initial static frame so the field is present before any movement
  render(-9999, -9999);

  return {
    update(p, dt) {
      if (drift) {
        // touch / no-pointer: gentle autonomous Lissajous "virtual cursor"
        t += dt;
        const vx = W * (0.5 + 0.42 * Math.sin(t * 0.21));
        const vy = H * (0.5 + 0.36 * Math.sin(t * 0.27 + 1.3));
        render(vx, vy);
        return true;
      }
      return render(p.x, p.y);
    },
  };
}

/* ===========================================================================
   Always-on (works without the pointer system / under reduced motion)
   ========================================================================= */
function initReveals(): void {
  const els = Array.from(document.querySelectorAll('.reveal'));
  if (!('IntersectionObserver' in window)) {
    els.forEach((e) => e.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0 },
  );
  // Anything already on screen at load reveals immediately (its stagger delay
  // still plays) — this kills the hero "flash of empty" and any above-the-fold
  // ghosting where content stayed invisible until a scroll nudged it in.
  const vh = window.innerHeight;
  els.forEach((e) => {
    if ((e as HTMLElement).getBoundingClientRect().top < vh * 0.92) {
      e.classList.add('is-in');
    } else {
      io.observe(e);
    }
  });
}

function initNav(): void {
  const head = document.querySelector('.site-head');
  if (!head) return;
  const onScroll = () => head.classList.toggle('is-scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ===========================================================================
   Pointer system (desktop, motion allowed) — set up / tear down
   ========================================================================= */
let teardownPointer: (() => void) | null = null;

function setupPointerSystem(): void {
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const glowEl = document.querySelector<HTMLElement>('.glow');
  const canvas = document.querySelector<HTMLCanvasElement>('.constellation');

  if (!fine) {
    // touch: a calm autonomous constellation, no glow/tilt/magnetic
    if (canvas) {
      modules.push(createConstellation(canvas, true));
      forceRun = true;
      wake();
    }
    teardownPointer = () => {
      forceRun = false;
      cancelAnimationFrame(rafId);
      running = false;
    };
    return;
  }

  if (glowEl) modules.push(createGlow(glowEl));

  const heroContent = document.querySelector<HTMLElement>('.hero-content');
  if (heroContent) modules.push(createTilt(heroContent));

  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    modules.push(createMagnetic(el));
  });

  if (canvas) modules.push(createConstellation(canvas, false));

  const onMove = (e: PointerEvent) => {
    pointer.tx = e.clientX;
    pointer.ty = e.clientY;
    pointer.active = true;
    wake();
  };
  const onLeave = () => {
    pointer.active = false;
    pointer.tx = pointer.w / 2;
    pointer.ty = pointer.h / 2;
    wake();
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerleave', onLeave);
  window.addEventListener('blur', onLeave);
  window.addEventListener('scroll', onScrollRefresh, { passive: true });

  // prime one frame so the constellation/glow are live immediately
  wake();

  teardownPointer = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerleave', onLeave);
    window.removeEventListener('blur', onLeave);
    window.removeEventListener('scroll', onScrollRefresh);
    cancelAnimationFrame(rafId);
    running = false;
    forceRun = false;
    for (const m of modules) m.reset?.();
    modules.length = 0;
    rectRefreshers.length = 0;
  };
}

/* ===========================================================================
   Boot
   ========================================================================= */
function onResize(): void {
  pointer.w = window.innerWidth;
  pointer.h = window.innerHeight;
  for (const r of rectRefreshers) r();
  wake();
}

/* Cookie notice — shows once until "Got it" is clicked. Essential cookies only,
 * so this is a simple acknowledgement (no per-category toggles needed). */
function initCookie(): void {
  const el = document.getElementById('cookie');
  if (!el) return;
  let consented = false;
  try {
    consented = localStorage.getItem('volos-cookie-consent') === '1';
  } catch {
    consented = true; // storage blocked → don't nag
  }
  if (consented) return;
  el.hidden = false;
  document.getElementById('cookie-ok')?.addEventListener('click', () => {
    try {
      localStorage.setItem('volos-cookie-consent', '1');
    } catch {
      /* ignore */
    }
    el.hidden = true;
  });
}

function boot(): void {
  initReveals();
  initNav();
  initCookie();
  initWinston();
  window.addEventListener('resize', onResize, { passive: true });

  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  if (!reduce.matches) setupPointerSystem();

  // react to live changes of the motion preference
  reduce.addEventListener('change', (e) => {
    if (e.matches) {
      teardownPointer?.();
      teardownPointer = null;
    } else if (!teardownPointer) {
      setupPointerSystem();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
      running = false;
    } else if (modules.length) {
      wake();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
