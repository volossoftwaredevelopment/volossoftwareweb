# Volos Software Development — studio site

Marketing site for **Volos Software Development**, a studio building bespoke
yachting software. The studio behind [Naucodex](https://nauticecosystem.com).

Austere dark + gold minimal design ("Quiet Instrument"), with a unified
cursor-reactive animation system: a soft gold glow that follows the pointer,
a gyroscopic hero tilt, magnetic links, and an ambient gold constellation —
all driven by one shared pointer state and a single `requestAnimationFrame`
loop, with full `prefers-reduced-motion` and touch fallbacks.

## Stack

- **Vite** (vanilla TypeScript) — static build, no runtime backend.
- Self-hosted variable fonts: **Bodoni Moda** (display) + **Space Grotesk** (UI).
- Contact via `mailto:` (no server). Swap to a Formspree `<form action>` later
  if a structured form is wanted — still static.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # -> dist/
npm run preview  # serve the production build
```

## Deploy

Pushed to `main` → built and published to **GitHub Pages** by
`.github/workflows/deploy.yml`. `vite.config.ts` uses `base: './'` so the
build works under the project-page sub-path (and unchanged on a future custom
domain / Vercel).

## Design spec

The locked direction, palette, type scale, and animation parameters live in
[`DESIGN-SPEC.md`](./DESIGN-SPEC.md).

---

Vladyslav Mavrodimaki · volossoftware@icloud.com · +30 699 324 4210
