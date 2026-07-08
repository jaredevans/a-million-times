# Five New Patterns + Ripple Rename — Design

Date: 2026-07-08
Status: approved (user, in conversation)

## Goal

Grow the choreography catalog from 8 to 13 patterns and rename the existing
`kaleidoscope` to `ripple` (freeing the name for a genuinely symmetric
pattern). All five newcomers join the automatic hash rotation immediately;
the pattern bar remains the preview mechanism.

New patterns fill the catalog's identified gaps: nothing symmetric, nothing
discrete, nothing directional, and nothing that winks at the wall being made
of clocks.

## Constraints (unchanged project invariants)

- A choreography is a pure function `(col, row, t) -> [handA, handB]`,
  degrees in [0, 360), deterministic; pseudo-randomness only via `hash()`.
- Grid: COLS=24, ROWS=12, center (11.5, 5.5). Performance window t ∈ [0, 38].
- Smoothness: no visible line rotation above ~30°/frame at 60fps except
  deliberate motion. Visible metric for fused-line patterns is orientation
  mod 180 (see 2026-07-08 ledger, bubbles fix).
- Helpers available: `mod360`, `angleToward(dx, dy)` (0 = up, clockwise,
  y down), `easeInOutCubic`, `hash`.

## Rename: kaleidoscope → ripple

Rename the const, the `PATTERN_NAMES` entry ('Kaleidoscope' → 'Ripple' at
index 5), the test destructuring, and reword the doc comment ("water drop"
stays accurate). Zero behavior change; existing anchor values unchanged.

## Catalog integration

- `CATALOG`: existing 8 in slots 0–7, then `metronome, moire, kaleidoscope,
  frame, murmuration` in slots 8–12.
- `PATTERN_NAMES` appends 'Metronome', 'Moiré', 'Kaleidoscope', 'Frame',
  'Murmuration'.
- The three hash-mapping pins in tests change from `% 8` to `% 13` values;
  compute the new expected indices with a scratch script and re-pin.
- The "has eight pieces" test becomes "has thirteen pieces" (length 13).

## The five patterns

Reference implementations below are the spec. Constants are defaults; the
implementer may tune them if the smoothness harness or visual check demands,
recording any change in the plan/ledger.

### 1. Metronome — ticking seconds (fused needle `[a, a]`)

Every clock rests at a 6°-quantized position and snaps one step per second
with a fast eased tick, like a real second hand. A diagonal phase gradient
plus small per-clock hash jitter staggers ticks into a rain-on-a-roof
cascade.

```ts
const metronome: Choreography = (col, row, t) => {
  // Diagonal cascade with a touch of per-clock jitter (0–0.4s)
  const phase = (col * 0.13 + row * 0.21 + (hash(col + row * 24) % 100) / 250) % 1;
  const tp = t + phase;
  const tick = Math.floor(tp);
  const p = Math.min(1, (tp - tick) / 0.15); // the snap takes 0.15s
  const a = mod360((tick + easeInOutCubic(p)) * 6);
  return [a, a];
};
```

Designed motion: 6° per tick — far below the smoothness threshold.

### 2. Moiré — two-source interference (line `[a, a+180]`)

Line orientation is proportional to the *difference of distances* to two
slowly drifting sources: iso-orientation cells lie on hyperbolas (the
physical two-slit interference pattern). Fringes sweep as t advances and
morph as the sources drift.

```ts
const moire: Choreography = (col, row, t) => {
  const s1x = 8 + 2.5 * Math.sin(0.31 * t), s1y = 5.5 + 2 * Math.cos(0.23 * t);
  const s2x = 15 + 2.5 * Math.sin(0.27 * t + 2), s2y = 5.5 + 2 * Math.cos(0.19 * t + 1);
  const d1 = Math.hypot(col - s1x, row - s1y);
  const d2 = Math.hypot(col - s2x, row - s2y);
  const a = mod360((d1 - d2) * 55 + t * 15);
  return [a, mod360(a + 180)];
};
```

55°/unit ⇒ fringe bands ~3.3 clocks wide; 15°/s base sweep keeps still cells
slowly rotating.

### 3. Kaleidoscope — 4-fold mirror symmetry (line `[a, a+180]`)

Fold every cell into the upper-left quadrant, evaluate a compact orbiting
vortex there, then reflect the angle back: mirror across the vertical axis
maps θ → −θ, across the horizontal axis θ → 180 − θ. True bilateral
symmetry both ways; fold seams at the center lines are visible creases,
as in a real kaleidoscope.

```ts
const kaleidoscope: Choreography = (col, row, t) => {
  const mx = col <= 11.5 ? col : 23 - col;
  const my = row <= 5.5 ? row : 11 - row;
  const cx = 5.75 + 3 * Math.sin(0.4 * t);   // vortex orbits inside the quadrant
  const cy = 2.75 + 1.6 * Math.cos(0.55 * t);
  const dx = cx - mx, dy = cy - my;
  const dist = Math.hypot(dx, dy);
  let a = mod360(angleToward(dx, dy) + 90 + dist * 22 + t * 10); // tangent + twist
  if (col > 11.5) a = mod360(-a);
  if (row > 5.5) a = mod360(180 - a);
  return [a, mod360(a + 180)];
};
```

### 4. Frame — expanding concentric rectangles (line `[a, a+180]`)

The field rests as 45° diagonal lines (`[45, 225]`; hand B sits at the
neutral angle). Square rings measured in Chebyshev distance sweep outward;
as a ring passes, cells rotate by shortest axial rotation to the local
rectangle-edge tangent — vertical on left/right flanks (0°), horizontal on
top/bottom (90°). The 90° crease along the grid diagonals is the rectangle
corner and reads as intentional.

```ts
const frame: Choreography = (col, row, t) => {
  const dx = col - 11.5, dy = row - 5.5;
  const cheb = Math.max(Math.abs(dx), Math.abs(dy));
  const edge = Math.abs(dx) > Math.abs(dy) ? 0 : 90;
  const SPEED = 3.5, GAP = 6; // ring every ~1.7s, ~2 rings visible
  const m = ((cheb - t * SPEED) % GAP + GAP) % GAP;
  const ringDist = Math.min(m, GAP - m);
  const p = easeInOutCubic(Math.exp(-ringDist * ringDist * 1.2));
  const shortDiff = mod360(edge - 45 + 90) % 180 - 90; // ±45 by construction
  const a = mod360(45 + shortDiff * p);
  return [a, mod360(a + 180)];
};
```

Ring passage rotates a cell ±45° over ~0.6s — well under the threshold.

### 5. Murmuration — flocking birds (fused needle `[a, a]`)

Five invisible birds fly loosely-aligned Lissajous paths (similar
frequencies, hash-offset phases ⇒ they travel as a flock). Each clock's
needle points along the Gaussian-weighted vector blend of nearby bird
headings (velocity directions). The ambient far-field is the flock's own
mean heading plus a gentle spatial wobble — it can never oppose the flock,
which eliminates vector-cancellation snaps (an independent drift base was
measured at 80 frames >30°/frame; this design measures 6, max 89°, from
late-window bird dispersal — accepted).

```ts
const murmuration: Choreography = (col, row, t) => {
  let vx = 0, vy = 0, total = 0, gx = 0, gy = 0;
  for (let i = 0; i < 5; i++) {
    const fx = 0.24 + (hash(i * 7) % 10) * 0.006;
    const fy = 0.31 + (hash(i * 11) % 10) * 0.006;
    const px = (hash(i * 13) % 100) / 100;
    const py = (hash(i * 17) % 100) / 100;
    const bx = 11.5 + 9 * Math.sin(fx * t + px);
    const by = 5.5 + 4.5 * Math.sin(fy * t + py);
    const hx = 9 * fx * Math.cos(fx * t + px);   // path velocity = heading
    const hy = 4.5 * fy * Math.cos(fy * t + py);
    const hm = Math.hypot(hx, hy);
    if (hm === 0) continue;
    gx += hx / hm;                    // global mean heading accumulator
    gy += hy / hm;
    const d = Math.hypot(col - bx, row - by);
    const w = Math.exp(-d * d / 16); // influence radius ~4 clocks
    vx += (w * hx) / hm;
    vy += (w * hy) / hm;
    total += w;
  }
  // Ambient field: the flock's mean heading with a gentle spatial wobble,
  // so the far field leans where the flock flies and never opposes it.
  const wobble = Math.sin(col * 0.4 + row * 0.3 + t * 0.7) * 20;
  const baseA = mod360(angleToward(gx, gy) + wobble);
  const bw = Math.max(0, 1 - total);
  const baseRad = (baseA * Math.PI) / 180;
  vx += bw * Math.sin(baseRad);
  vy += bw * -Math.cos(baseRad);
  const a = vx === 0 && vy === 0 ? baseA : angleToward(vx, vy);
  return [a, a];
};
```

## UI changes (index.html / main.ts)

- Pattern bar: add `flex-wrap: wrap`, `justify-content: center`, and
  `max-width: calc(100vw - 32px)` so 15 buttons (12H + Auto + 13 patterns)
  never overflow narrow windows.
- Centering changed from `left: 50% + translateX(-50%)` to inset centering
  (`left/right: 0; width: fit-content; margin-inline: auto`): the transform
  idiom caps a fixed element's shrink-to-fit width at half the viewport,
  which made flex-wrap stack the buttons into a half-width column.
- No other UI changes; buttons are generated from `PATTERN_NAMES`.

## Testing

- Anchor pin per new pattern: exact `toBeCloseTo` values at a chosen
  `(col, row, t)`, computed from the implementation via scratch script
  (same style as the existing suite).
- Re-pin the three hash-mapping tests for length 13.
- Piece-count test → 13; `PATTERN_NAMES` length test already dynamic.
- The finite/normalized sweep test and the "plays every piece in 1000
  minutes" test iterate CATALOG and adapt automatically; verify the
  1000-minute window still covers all 13 (re-pin count).
- Smoothness gate before merge: run each new pattern through the
  frame-delta harness (axial metric for line patterns, circular for
  needle patterns). Measured baselines for the reference implementations
  (60fps, full grid, t ∈ [0, 38]): metronome max 1.79°/frame (0 events
  >30°), moiré 1.46° (0), kaleidoscope 53.32° (8 events — vortex
  fly-overs, accepted; shipped spiral measures 176°), frame 6.81° (0),
  murmuration 89.05° (6 events — late-window bird dispersal, accepted).
  Any implementation deviating from these numbers indicates a transcription
  error.

## Post-merge tuning (2026-07-08, user feedback: "too dead")

The moiré and kaleidoscope reference implementations above show the original
constants; both were retuned for liveliness after merge — the code is the
source of truth:

- **Moiré:** sources orbit at ~4x speed/amplitude, fringe density breathes
  27–63°/unit (`k = 45 + 18·sin(0.35t)`), sweep oscillates 15–65°/s.
  Measured: max 1.46 → 7.03°/frame, mean 30 → 89°/s, still 0 events >30°.
- **Kaleidoscope:** twist breathes deeply (`14 + 14·sin(0.6t)` — arms
  straighten into radial spokes and recoil), a ripple radiates through the
  mandala (`sin(dist·1.2 − 3t)·25`), spin oscillates 10–80°/s; vortex orbit
  kept at original speed (faster orbits tripled fly-over snaps — measured
  and rejected). Measured: mean → 71°/s (~4x), snap profile unchanged
  (8 events, max 53°). Anchor pins updated in tests accordingly.

**Bent hands (user feedback):** moiré, kaleidoscope, and frame now bend
their hands independently spiral-style — hand A points along the flow
field, hand B re-samples it 0.8 units back along the stroke and flips
180° — so adjacent clocks chain into curved strokes instead of straight
segments. Two seam fixes were required: kaleidoscope bends in folded
quadrant space and mirrors both hands afterward (per-cell reflections keep
hand B continuous in time and symmetry exact), and frame blends its edge
tangent over a ~0.9-unit wedge at the diagonals (rounded corners), making
the field spatially continuous. Measured (both-hand metric): moiré max
19°/frame 0 events >30°; frame max 12.8° 0 events; kaleidoscope 48 events
— in family with the user's spiral (41) and ripple (48) by the same
metric. Hand-A formulas unchanged; hand-B anchors re-pinned.

## Non-goals

- No changes to the existing eight patterns beyond the ripple rename.
- No interlude, timeline, or renderer changes.
- No promotion/culling mechanism — removing a pattern later is an array edit.

## Process

Branch `feature/new-patterns`; one commit per pattern (plus one for
rename/UI/test scaffolding); final whole-branch review, then merge to main
(user's standing review-then-merge flow).
