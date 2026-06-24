/* ------------------------------------------------------------------ *
 * Winston — Volos's gold AI assistant.
 *
 * A self-contained widget: a gold particle-sphere orb launcher (canvas)
 * pinned bottom-right that opens a chat panel. Winston is the studio's
 * AI secretary — he explains what Volos builds, qualifies a prospect, and
 * (server-side) emails Vlad a PDF brief when a lead is genuine. Visually a
 * sibling of the dental demo's "Robin", recoloured to the site's gold.
 *
 * Zero deps, no framework — mounts itself into <body> and talks to the
 * Winston API (Claude + Resend + PDF) over fetch.
 * ------------------------------------------------------------------ */

/** Backend base URL (Vercel). */
const WINSTON_API = "https://winston-api.vercel.app";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const GREETING =
  "Hi, I'm Winston — Volos's AI assistant. We build AI assistants and automation with the newest technology. What are you looking to build?\n\nYou can write to me in any language — I'll reply in yours.";

export function initWinston(): void {
  if (typeof document === "undefined" || document.querySelector(".winston")) return;

  const root = document.createElement("div");
  root.className = "winston";
  root.innerHTML = `
    <div class="winston-backdrop" aria-hidden="true" hidden></div>
    <button class="winston-orb" type="button" aria-label="Chat with Winston, the Volos AI assistant" aria-expanded="false">
      <canvas class="winston-orb-canvas" aria-hidden="true"></canvas>
    </button>
    <section class="winston-panel" role="dialog" aria-label="Winston — Volos AI assistant" aria-modal="false" hidden>
      <header class="winston-head">
        <span class="winston-head-orb"><canvas class="winston-head-canvas" aria-hidden="true"></canvas></span>
        <span class="winston-head-id">
          <span class="winston-name">Winston</span>
          <span class="winston-role">Volos AI assistant</span>
        </span>
        <button class="winston-close" type="button" aria-label="Close">&times;</button>
      </header>
      <div class="winston-msgs" role="log" aria-live="polite"></div>
      <form class="winston-form" autocomplete="off">
        <input class="winston-input" type="text" name="m" placeholder="Tell Winston what you need…" aria-label="Message Winston" maxlength="2000" />
        <button class="winston-send" type="submit" aria-label="Send">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </button>
      </form>
    </section>`;
  document.body.appendChild(root);

  const orbBtn = root.querySelector<HTMLButtonElement>(".winston-orb")!;
  const backdrop = root.querySelector<HTMLElement>(".winston-backdrop")!;
  const panel = root.querySelector<HTMLElement>(".winston-panel")!;
  const closeBtn = root.querySelector<HTMLButtonElement>(".winston-close")!;
  const msgsEl = root.querySelector<HTMLElement>(".winston-msgs")!;
  const form = root.querySelector<HTMLFormElement>(".winston-form")!;
  const input = root.querySelector<HTMLInputElement>(".winston-input")!;

  const messages: Msg[] = [];
  let started = false;
  let sending = false;

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // While Winston is generating a reply, the orb pulses (clear "thinking" cue).
  const isThinking = () => sending;
  mountOrb(root.querySelector<HTMLCanvasElement>(".winston-orb-canvas")!, reduced, 1.0, isThinking);
  mountOrb(root.querySelector<HTMLCanvasElement>(".winston-head-canvas")!, reduced, 0.85, isThinking);

  function render(): void {
    msgsEl.innerHTML = "";
    // Greeting is display-only — kept OUT of `messages` so the API conversation
    // always starts with a user turn (Anthropic requires the first message to be
    // role "user").
    const greet = document.createElement("div");
    greet.className = "winston-msg is-assistant";
    greet.textContent = GREETING;
    msgsEl.appendChild(greet);
    for (const m of messages) {
      const row = document.createElement("div");
      row.className = `winston-msg is-${m.role}`;
      row.textContent = m.content;
      msgsEl.appendChild(row);
    }
    if (sending) {
      const t = document.createElement("div");
      t.className = "winston-msg is-assistant winston-typing";
      t.innerHTML = "<span></span><span></span><span></span>";
      msgsEl.appendChild(t);
    }
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function open(): void {
    backdrop.hidden = false;
    panel.hidden = false;
    orbBtn.setAttribute("aria-expanded", "true");
    root.classList.add("is-open");
    if (!started) {
      started = true;
      render();
    }
    // The header orb's canvas re-measures itself via its ResizeObserver when the
    // panel becomes visible — no global resize needed.
    setTimeout(() => input.focus(), 60);
  }
  function close(): void {
    backdrop.hidden = true;
    panel.hidden = true;
    orbBtn.setAttribute("aria-expanded", "false");
    root.classList.remove("is-open");
    orbBtn.focus();
  }

  orbBtn.addEventListener("click", () => (panel.hidden ? open() : close()));
  closeBtn.addEventListener("click", close);
  backdrop.addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) close();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || sending) return;
    input.value = "";
    messages.push({ role: "user", content: text });
    sending = true;
    render();
    try {
      const res = await fetch(`${WINSTON_API}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      const data = (await res.json()) as { reply?: string; leadSubmitted?: boolean };
      sending = false;
      messages.push({
        role: "assistant",
        content:
          data.reply ||
          "Sorry — I had trouble there. You can reach Vlad directly at volossoftware@icloud.com.",
      });
      render();
      if (data.leadSubmitted) root.classList.add("winston-lead-done");
    } catch {
      sending = false;
      messages.push({
        role: "assistant",
        content:
          "I couldn't reach the studio just now. Please email volossoftware@icloud.com and Vlad will get straight back to you.",
      });
      render();
    }
  });
}

/* ---- the gold particle-sphere orb (self-contained canvas) ----------
 * Rotating fibonacci sphere of gold dots. Two extra behaviours:
 *  • "school of fish" — dots near the cursor flee from it and ease back;
 *  • "thinking pulse" — while isThinking() is true the sphere breathes
 *    (gentle scale + brighter glow), a clear cue the AI is replying.
 */
const TAU = Math.PI * 2;
function mountOrb(
  canvas: HTMLCanvasElement,
  reduced: boolean,
  speed: number,
  isThinking: () => boolean,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const N = 120;
  const pts: Array<{ x: number; y: number; z: number; ox: number; oy: number }> = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const t = golden * i;
    pts.push({ x: Math.cos(t) * r, y, z: Math.sin(t) * r, ox: 0, oy: 0 });
  }
  let ang = 0;
  let phase = 0;
  let raf = 0;

  // Cursor tracking (canvas-local) for the flee effect.
  let rect = canvas.getBoundingClientRect();
  const pointer = { x: 0, y: 0, active: false };
  const refreshRect = () => {
    rect = canvas.getBoundingClientRect();
  };
  window.addEventListener(
    "pointermove",
    (e) => {
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    },
    { passive: true },
  );
  window.addEventListener("pointerleave", () => (pointer.active = false));
  window.addEventListener("scroll", refreshRect, { passive: true });

  function size(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const s = canvas.clientWidth || 56;
    canvas.width = Math.round(s * dpr);
    canvas.height = Math.round(s * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    refreshRect();
  }

  function draw(): void {
    const s = canvas.clientWidth || 56;
    const cx = s / 2;
    const cy = s / 2;
    // Thinking pulse: 0 at rest, breathing 0..1 while replying.
    const pf = isThinking() ? 0.5 + 0.5 * Math.sin(phase) : 0;
    const R = s * 0.4 * (1 + pf * 0.07);
    const fleeR = R * 1.5;
    ctx!.clearRect(0, 0, s, s);
    const glow = ctx!.createRadialGradient(cx, cy, 0, cx, cy, R * 1.6);
    glow.addColorStop(0, `rgba(226,201,136,${0.3 + pf * 0.35})`);
    glow.addColorStop(1, "rgba(226,201,136,0)");
    ctx!.fillStyle = glow;
    ctx!.beginPath();
    ctx!.arc(cx, cy, R * 1.6, 0, TAU);
    ctx!.fill();
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    for (const p of pts) {
      const x = p.x * ca - p.z * sa;
      const z = p.x * sa + p.z * ca;
      const depth = (z + 1) / 2;
      const sx = cx + x * R;
      const sy = cy + p.y * R;
      // Flee: push away from the cursor, ease back when it leaves.
      let tx = 0;
      let ty = 0;
      if (pointer.active) {
        const ddx = sx - pointer.x;
        const ddy = sy - pointer.y;
        const dist = Math.hypot(ddx, ddy);
        if (dist < fleeR && dist > 0.01) {
          const f = (1 - dist / fleeR) * R * 0.7;
          tx = (ddx / dist) * f;
          ty = (ddy / dist) * f;
        }
      }
      p.ox += (tx - p.ox) * 0.18;
      p.oy += (ty - p.oy) * 0.18;
      ctx!.globalAlpha = 0.22 + depth * 0.68;
      ctx!.fillStyle = depth > 0.55 ? "#e2c988" : "#c9a86a";
      ctx!.beginPath();
      ctx!.arc(sx + p.ox, sy + p.oy, 0.6 + depth * 1.7, 0, TAU);
      ctx!.fill();
    }
    ctx!.globalAlpha = 1;
  }

  function loop(): void {
    ang += 0.006 * speed;
    phase += 0.09;
    draw();
    raf = requestAnimationFrame(loop);
  }

  size();
  // Re-measure when the canvas itself resizes (window resize, or the panel
  // becoming visible) — targeted, so we never poke the whole site's layout.
  const ro = new ResizeObserver(() => {
    size();
    if (reduced) draw();
  });
  ro.observe(canvas);
  if (reduced) {
    draw();
    return;
  }
  loop();
  document.addEventListener("visibilitychange", () => {
    cancelAnimationFrame(raf);
    if (!document.hidden) loop();
  });
}

export default initWinston;
