# Volos Software Development — Build Spec ("Quiet Instrument")

Premium dark + gold, austere minimal one-page studio site. Static Vite (vanilla
TS) → GitHub Pages **project page**. `base: './'` in vite.config — every asset
path relative. Fonts self-hosted (OFL). Contact = mailto/Formspree, no server.

> Borrows Naucodex's *craft* (easing, stagger, hairline language, generous
> rhythm) — **not** its fonts or warm palette. This site is black + gray with
> gold as a rationed jewel (≤3% of any viewport).

## 1. Direction
Near-black canvas, vast negative space, one Bodoni Moda serif statement per
screen, Space Grotesk for everything functional. Gold appears in exactly three
roles site-wide: **(1)** the logomark, **(2)** hairline rules + eyebrow ticks,
**(3)** the single primary CTA. The feel: a marine chronometer / private-bank
statement — expensive through restraint.

## 2. Fonts (self-hosted woff2 in `/src/fonts`, variable)
- **Display — Bodoni Moda** 500/600. Headlines only, tight tracking, never italic.
- **Body/UI — Space Grotesk** 300/400/500. Eyebrows/nav/labels = 500 UPPERCASE
  tracking +0.18em (the key "expensive" tell).

## 3. Color tokens (CSS vars, single dark theme)
```
--bg #0A0A0B   --bg-elevated #111113   --surface #16161A   --surface-2 #1C1C21
--line #2A2A30 (neutral hairline)   --line-gold #6E5A2E (gold rule at rest → --gold on hover)
--text-hi #F4F4F2  --text #C9C9CE  --text-mid #8A8A93  --text-low #5A5A62
--gold #C9A86A (UI/text jewel, AAA ~9:1)  --gold-soft #B9985A  --gold-bright #E2C988
--gold-light #D6B25E (LIGHT EMISSION ONLY: glow + constellation, additive)
struck-metal: linear-gradient(135deg,#E2C988 0%,#C9A86A 45%,#A07E42 100%)  ← logomark + CTA fill only
```
`#C9A86A` for anything read against the page (text/UI/CTA — AAA). `#D6B25E` only
where gold is *emitted* additively (mix-blend screen/lighter).

## 4. Type scale
```
hero  clamp(3.25rem,8vw,8rem) Bodoni 500 lh1.02 -0.02em
h1    clamp(2.5rem,5vw,4.5rem) Bodoni 500 lh1.05
h2    clamp(1.9rem,3vw,2.75rem) Bodoni 600 lh1.08
h3    1.5rem Space Grotesk 500
lede  clamp(1.15rem,2vw,1.5rem) Space Grotesk 300 lh1.5
body  1.0625rem Space Grotesk 400 lh1.65 +0.01em
eyebrow 0.75rem Space Grotesk 500 UPPER +0.18em
```

## 5. Spacing & shape
8px base. Section rhythm clamp(96px → 192px). Max-width 1200px, side pad 20/32px,
text measure ~46–62ch. **Radius 0 by default** (austere); the one CTA is a sharp
0-radius rect, not a pill. Hairlines 1px `--line`; gold rule only under eyebrows,
beneath the CTA, and a thin top-of-page accent. Eyebrows prefixed by a 24px gold tick.

## 6. Sections (single page, in order)
**hero → what-we-build (#work) → projects/Naucodex (#projects) → why (#studio) →
contact (#contact).** One focal idea per screen, 60%+ of hero empty.

## 7. Animation architecture (the craft layer — see `src/main.ts`)
One pointer state, one rAF loop, many subscriber modules. `pointermove`
(passive) only records a target; the loop interpolates. Frame-rate-independent
damping: `damp(cur,target,λ,dt) = cur + (target-cur)*(1 - exp(-λ·dt))`,
`dt` clamped to 1/30s. Loop sleeps when settled, re-arms on next move; pauses on
`visibilitychange`. Rects cached (no `getBoundingClientRect` in the loop).

Module params (final):
- **Gold glow** — fixed div, soft `radial-gradient` (no blur — the gradient is
  the softness), `mix-blend:screen`, size 60vmax, follow λ7, idle opacity 0,
  intensity `min(1, 0.55 + speed*0.06)`, colour `#D6B25E`.
- **Hero gyro tilt** — `perspective:1100px` on `.hero`; `rx=-ny*5°, ry=nx*5°`,
  parallax `nx/ny*12px`; depth via CSS `translateZ` on the children (title 45px,
  lede 20px).
- **Magnetic** (CTA + nav + brand + Naucodex link) — radius 90, strength 0.4,
  grab λ16 / release λ10, falloff `1-d/r`; inner label leads ×1.3.
- **Constellation** — one canvas, DPR≤2, 110 pts, base α0.08, influence 160px,
  brighten +0.6, nudge ≤6px, `#D6B25E`, composite `lighter`.
- **Entry reveals** — IntersectionObserver rootMargin `-60px`, once; 0.7s,
  stagger 0.09s; easing `cubic-bezier(0.2,0.7,0.2,1)`.

## 8. Accessibility & device fallbacks
- `prefers-reduced-motion: reduce` (live-reactive): glow + constellation hidden,
  tilt/magnetic off, reveals instant, ornamental animation neutralised.
- Pointer modules gated on `(hover:hover) and (pointer:fine)`. Touch: a calm
  autonomous-drift constellation, no glow/tilt/magnetic, no continuous rAF.
- Contrast: text-hi 18:1, body 11:1, gold-on-bg 9:1 (AAA); text-mid 5.6:1 (AA).
- Real `<a>`/`<button>`, visible gold focus ring, skip-link.

## 9. GitHub Pages / static constraints
`base:'./'`; all paths relative. No runtime API. Naucodex link absolute
(`target=_blank rel=noopener`). CTA `mailto:`. `.nojekyll` shipped. One
`index.html`, no routing.

## 10. Identity
Studio: **Volos Software Development** · Owner: **Vladyslav Mavrodimaki** ·
Email: **volossoftware@icloud.com** · Phone: **+30 699 324 4210** · Flagship:
**Naucodex → https://nauticecosystem.com**.
