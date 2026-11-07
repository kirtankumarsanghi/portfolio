# KIRTAN.DEV — portfolio of Kirtan Kumar Sanghi

A single-page, scroll-driven portfolio: backend engineering, applied ML, full-stack.
Every asset is original and generated in code — the inflated balloon lettering, the fluid trail, the
stickers, the UI mock-ups, the warp field, the audio and the résumé PDF. No third-party media or branding.

**Sections:** Hero → About → Work (domain explorer) → Warp / Philosophy → Skills → Education & Certifications → Contact.
All copy comes from the résumé or the GitHub API. Nothing is invented: repos without an override show their
real name, description, language and topics plus the label **DETAILS COMING SOON**.

## Stack

- Vite + React + TypeScript, Tailwind CSS v4
- three.js via `@react-three/fiber`, `drei`, `@react-three/postprocessing` (bloom + custom Bayer dither pass)
- GSAP + ScrollTrigger (scrubs, line-mask reveals, page-curl), Lenis smooth scroll (duration 1.2)
- Framer Motion (pointer furniture, magnetic buttons, project detail transitions)
- A hand-written WebGL Navier-Stokes fluid solver for the "liquid light" pointer trail
- Howler for optional sound — the UI tick and ambient hum are generated as WAV in code
- Self-hosted display face: **Unbounded** variable (latin subset, 100–900) via the FontFace API

## Run

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # → dist/index.html (single self-contained file)
npm run preview
```

## Keeping the repo list current

`scripts/sync-repos.ts` pulls `https://api.github.com/users/kirtankumarsanghi/repos` and rewrites
`src/data/repos.snapshot.json`. It never fails a build — on any error the committed snapshot is kept.

```bash
npx tsx scripts/sync-repos.ts
```

To run it on every deploy, add to `package.json` (not done here, to keep the file untouched):

```json
"scripts": {
  "sync:repos": "tsx scripts/sync-repos.ts",
  "prebuild": "npm run sync:repos"
}
```

Set `GITHUB_TOKEN` (read-only, `public_repo`) in Vercel to lift the API rate limit from 60/hr to 5000/hr.
Repos with no entry in `projects.overrides.ts` are filed under **PLAYGROUND** and reported by the script.

## Deploy (Vercel)

```bash
npm i -g vercel
vercel            # preview
vercel --prod     # production
```

Or import the repo in the dashboard: framework **Vite**, build `npm run build`, output `dist`. No env vars
required. The HUD temperature calls the free Open-Meteo API for Hyderabad (matching the `GMT+5:30 IN` clock)
and falls back to a static value if the request is blocked.

## Editing content

| File | What lives there |
| --- | --- |
| `src/data/domains.ts` | the domain list — name, chip label, description, accent colour, glyph |
| `src/data/projects.overrides.ts` | everything the API can't know: domain, tags, year, role, accent, tagline, problem, approach, impact, stack, metrics, status |
| `src/data/repos.snapshot.json` | generated GitHub data (name, description, language, topics, url, stars, pushed_at, fork) |
| `src/data/site.ts` | hero, about, warp, skills, education and closing copy |
| `src/lib/fluid.ts` | `FLUID_CONFIG` — the trail's resolution, dissipation, curl, splat radius and force |
| `src/components/ClickFX.tsx` | `CLICK_FX` flags — ring / burst / fluid / sticker-spawn (spawn is OFF by default) |

A project appears in its primary `domain` **and** in every domain listed in `tags`.

## Optional assets (drop-in, auto-detected)

| File | Effect |
| --- | --- |
| `public/models/name.glb` | Replaces the procedural balloon name. Blender: text → mesh → Remesh → Inflate (cloth pressure or displace by distance-from-edge) → Subdivision 3 → shade smooth. Auto-fitted to ~85% of the viewport width. |
| `public/me.jpg` | Replaces the neutral placeholder in the About portrait. |
| `public/projects/<repo-slug>.png` | Replaces the generated mock panel for that project (e.g. `nirixon.png`, `unbiased-ai.png`). |

## Text, click & sticker system (v6)

- **Global text rule:** display text (`.display`, hero/closing canvases, section headings) has `user-select: none` and never moves because of a click or hover — no jelly, wobble, tilt or magnetic translation on text.
- **Hero click → die-cut stickers:** clicking empty hero space spawns one sticker from a 14-design library (star, 8-ball, graffiti scribble, pink `2026` tag, pen nib, smiley, pixel heart, lightning bolt, engraved coin, cursor arrow, cassette, flower, dice, OK hand) with no immediate repeats, pointer velocity inheritance, soft viewport bounces, disc-disc collisions, drag-and-throw, and a cap of 24 total stickers (oldest dissolves via a 0.6s Bayer pixel mask; `ESC` or double-click clears all). Background clicks emit a 6-pixel lime burst (0.4s).
- **Connected cursive name:** `"kirtan kumar"` / `"sanghi"` built as continuous handwriting splines (`src/scenes/cursiveName.ts`), inflated into solid opaque tubes (`transmission: 0`, stroke diameter ≈ 27% of x-height) with hemispherical caps, rotated −5° in the 14–56vh band (`src/assets/models/name.glb` overrides it automatically if dropped in).
- **Glow trail tuning:** radius 70–130px, max alpha 0.18, `rgba(70,170,255,A) → rgba(40,100,255,0.4A) → rgba(30,70,255,0)`, `'screen'` composite, 16px blur, 0.05/frame fade (~1s), layered under the 3D canvas.
- **Text animations:**
  - *Scramble decode* (`src/components/Scramble.tsx`): width-locked character spans decode left→right from lime `#c6ff00` symbols (`~30fps`) to white `#fff` over ~1.4s when the closing section reaches ~35% view (replays on re-entry), and on hover-in for contact lines.
  - *Character wave* (`src/sections/Warp.tsx`): warp phrases appear character by character in reading order (`#7d7d7d`, opacity 0 → `#fff`, opacity 1) with zero blur or vertical offset, and exit in reverse order.
  - *Nav spinner & links* (`src/components/HUD.tsx`, `src/index.css`): `SOUND[x]` cycles `- \ | /` every 150ms and pauses on hover; `.link-line` grows a 1px left→right underline in 0.25s with no text shift.
- **Closing layering:** the front headline (`~6.5vw`) sits at `z-4` completely in front of the 3D `CODE / & CARE` letters (`~65%` viewport height at `z-2`), with a faint ghost copy at `z-1` behind them for depth.

## Transition system (v5)

One `TransitionManager` (`src/lib/transitions.ts`) owns a single fixed pixel-grid canvas and the easing
vocabulary (`expo.out` in, `power3.inOut` wipes, 0.9–1.4s). Cells are 28px (20px mobile); each carries a
position-biased random threshold, so wipe edges are stepped, never straight, and every edge flashes lime.

| | Transition | How |
| --- | --- | --- |
| T1 | Intro → Hero | counter, then a radial pixel reveal; the name pops in (elastic), headline mask-reveals |
| T2 | Hero → About | hero pinned 100vh; About rises over it with a pixel-stair edge; name dithers out (Bayer), stickers dither via a matching CSS mask, blue → #0b0c0d |
| T3 | About → Work | copy masks out upward; domain rows rise with a .05s stagger |
| T4 | Domain → projects | rows collapse upward (.04s); the domain title FLIPs into the sticky header; cards curl in as pairs |
| T5 | Card → detail | page expands from the card's rect; lime path draws; title letters rise (.02s); PREV/NEXT run a pixel wipe in the next accent |
| T6 | Work → Warp | arrow portal anchored at the pointer's last position, with lime sparkles and a glowing edge |
| T7 | Warp words | letter-by-letter grey → white |
| T8 | Warp → Skills | arrow-hole wipe to black while streaks stretch into speed lines; rows rise, chips cascade |
| T9 | Skills → Education | lime cell-edge sweeps down; items slide in from the left |
| T10 | Education → Closing | radial blue pixel flood from bottom-centre; letters jelly-pop from .7; words slide in from opposite sides |
| T11 | Hash routes | every route change plays its transition; back/forward reverse them |

## What happens on the page

**Pointer.** The small native arrow is used throughout — no oversized custom cursor. Over interactive
elements a small lime pill (`OPEN ↗`, `OPEN CASE STUDY ↗`) follows the pointer, and nav items get a 1px
boxed outline. On dark sections a 6px lime pixel trails the pointer with lag. In the blue hero and closing
scenes a soft cyan glow trail (`GlowTrail.tsx`, Canvas2D, blur 14px, screen blend) follows the pointer and
fades in ~1.3s — time-based, so the lifetime is the same on 30/60/120Hz displays. Add `?debug=glow` to the URL
to draw a solid magenta blob at the pointer and prove the canvas is on screen. The WebGL fluid solver
(`src/lib/fluid.ts`) is kept as the optional upgrade. Clicking the background fires a 1px white ring, a burst
of lime pixels and "+" marks, and one strong fluid splat — all behind `CLICK_FX` flags.

**Hero.** "kirtan kumar / sanghi" as inflated gel letters over two lines, rotated −5°, filling ~85% of the
viewport width in its upper 60%, behind the 4.8vw headline. Letters wobble with spring physics when the
cursor nears or the background is clicked. The 3D canvas mounts only after the boot screen clears, so first
paint is never blocked by the marching-cubes build. On scroll the name and stickers dissolve through an
8×8 Bayer ordered-dither pass (pixel size 3→10px, colour shifting to dark blue, then alpha 0) while the
background cross-fades to `#0b0c0d` and About curtains up at 0.5× parallax.

**Work — domain explorer, three levels.** Level 1 lists the domains in display type with live counts, a
chip filter bar, a lime pixel that snaps to the hovered row and a fan of three mini thumbnails. Level 2
collapses into the chosen domain with a breadcrumb and shows the projects as staggered page-curl cards.
Level 3 expands a card into a full-screen page in the project's accent colour with a lime pixel path drawn
across, then the meta grid, problem, approach, impact and metrics. Routing is plain hash —
`#work`, `#work/ai-ml`, `#work/ai-ml/nirixon` — so links are shareable and the back button works.

**Warp.** An arrow portal reveals ~1200 instanced streaks (cyan, magenta, violet, white) through a
cursor-arrow mask that grows from 8vmin past the viewport; three flattened lime rings pulse outward with a
lime centre pixel; the phrases reveal letter by letter from grey to pure white; the exit wipes diagonally
with an arrow-shaped hole. **Closing** — inflated "CODE / & CARE" behind the split headline, words weaving
in front of and behind the letters through two clipped copies, with the fluid trail active.

## Performance, accessibility, reduced motion

- 3D canvases are lazy-loaded behind `Suspense`, mounted only when on screen, DPR capped at 2, and set to
  `frameloop="never"` when off screen. Balloon geometry is polygonised once per unique character and cached.
- The fluid solver drops its own resolution if it cannot hold ~50fps, and pauses off screen.
- Skip link, focusable nav/chips/domains/cards, `aria-modal` detail page that closes with Escape,
  `aria-hidden` decorative layers, labels on icon-only controls, keyboard-operable filter bar.
- `prefers-reduced-motion` disables Lenis, bloom, the dither pass, the fluid trail, the pointer follower,
  the click FX, the sticker physics and every scrub. The hero and closing fall back to a static CSS name,
  the warp to a static streak field with its first phrase in pure white, and all reveals resolve instantly.
- Verified at 390, 1440 and 1920 px: `scrollWidth` equals the viewport, no clipped headlines (all display
  type uses `clamp()` and stays within bounds), no overlapping sections, no console errors.

## Measured during QA

| Check | Result |
| --- | --- |
| Boot screen clears | ~4.6s worst case (failsafe at 4.2s), was 27s before the 3D mount was deferred |
| Hero at scroll 0 | 93.6% blue pixels, 0.1% dark; headline 28.6% pure white at z-index 30 above the canvas |
| Dither dissolve at +300px | letter band blue 195 → 152, white 0.8% → 0%, max luminance 255 → 224 |
| Domain → project → detail | hash, breadcrumb, meta grid and accent page all verified; back button closes the overlay |
| Warp word peak | 17.8–20% pure white in the word band |
| Closing | 83–90% blue with 7–8% white highlights |
| Display font | `Unbounded Variable @800` on every large heading at 390 / 1440 / 1920 |

Lighthouse was not available in the sandbox; the proxies above (1.83MB single-file build, 572KB gzip, at
most two live WebGL contexts, deferred geometry, cached glyph meshes) are what I could measure.
