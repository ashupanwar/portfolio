# Portfolio — dim room, desk, phone

A 3D portfolio: a dimly lit room with a desk, a lamp lighting the scene, and an
iPhone lying on the desk. Visitors swipe up to unlock the phone and browse the
content as apps (Projects, Experience, Skills, Contact).

## Running

```bash
npm install
npm run dev
```

Dev-only URL flags:

| Flag | Effect |
|---|---|
| `?debug` | Orbit controls instead of the camera rig (the two both write `camera.position`, so only one can be live) |
| `?shot=phone` | Start at a named framing from `SHOTS`, to inspect a destination without sitting through the move |

## Asset pipeline

Raw Sketchfab downloads live in `assets-src/` (git-ignored). `public/models/`
holds the optimized GLBs that ship, and is regenerated with:

```bash
npm run assets
```

The pipeline prunes nodes we never render, fixes broken material flags, resizes
and re-encodes textures to WebP, and Draco-compresses geometry — taking the
three source models from **43.8 MB to 3.4 MB**.

Two constraints worth knowing before editing `scripts/prepare-assets.mjs`:

- `prune()` must keep leaves. Empty leaf nodes are how these models mark anchor
  points — the lamp's `Spot` empty is what the entire lighting rig hangs off,
  and pruning it silently kills the light with no error.
- `dropNodes` matches by **prefix** and throws if it matches nothing. Exporters
  append suffixes (`Lighting_Table-Lamps_Cute_01_1`), so exact matching quietly
  ships megabytes of geometry you meant to delete.

## Scene notes

Every placement value is in `src/scene/layout.ts`, derived from measured model
bounds rather than guessed. The models disagree about units:

| Model | Gotcha |
|---|---|
| Desk | Metres. Work surface is at **y = 0.759** (mesh `Object_4`). |
| Lamp | Its root already converts centimetres, so it arrives ~6.5 cm tall; `scale: 0.062` gives a realistic 40 cm lamp. The rig's rest pose is kept as authored. |
| iPhone | Metres, but ~16% oversized vs a real 14 Pro; `scale: 0.86` corrects it. Screen faces +Z, so it needs −90° about X to lie face-up. |

**The phone's screen is a single baked texture** — one mesh, one material, no
separable screen. The UI is drawn on our own plane floated at `z = 0.0089`,
just proud of the baked one, whose emissive map the asset pipeline strips.

The spotlight is portalled *into* the rig's `Spot` anchor rather than positioned
from it, so posing the lamp arm moves the light with it. Its shadow camera near
plane must stay small — the default 0.5 puts the entire lit area in front of the
near plane and the light pool disappears.

## Camera

`useCamera.goTo(shot)` tweens a **module-level** `cameraValues` object; `CameraRig`
is a stateless applier that just writes those values onto the camera each frame.
The animated values deliberately do not live in component state: `CameraRig` can
remount at any time (StrictMode, HMR), and when they lived in a `useRef` every
remount reset them mid-move and the camera visibly snapped back.

Two things that cost real debugging time:

- The `<Canvas>` needs an explicit `frameloop="always"`. Without it the loop ran
  a single frame and stopped, so no `useFrame` work happened and nothing animated.
- Shot framing uses an `up` vector, not a roll angle. `PHONE_UP` is the phone's
  own local +Y pushed through its rotation, which lands the screen exactly square
  in the top-down shot and cannot degenerate the way a dead-vertical `lookAt` does.

## Roadmap

| Phase | Status |
|---|---|
| 0 — Repo, asset pipeline, credits | ✅ done |
| 1 — Lit room, models placed, look-dev | ✅ done |
| 2 — Hotspot + camera move to the phone | ✅ done |
| 3 — Screen mesh + uikit UI, raycast + swipe proven | next |
| 4 — OS shell: lock screen, unlock, home grid, app transitions | |
| 5 — App content wired to resume data | |
| 6 — Intro sequence, camera choreography, loader | |
| 7 — Quality tiers, touch, a11y/SEO layer, WebGL fallback | |
| 8 — Deploy, Lighthouse pass | |

Phase 7 matters more than it looks: a canvas-only site is invisible to search
engines and screen readers, since uikit text never enters the DOM. The same
content ships as semantic HTML, visually hidden but focusable.

## Credits

The 3D models are CC-BY and **require** attribution. See [CREDITS.md](CREDITS.md).
