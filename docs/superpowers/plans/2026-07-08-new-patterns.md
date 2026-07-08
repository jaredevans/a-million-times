# Five New Patterns + Ripple Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Grow the choreography catalog from 8 to 13 patterns (metronome, moiré, kaleidoscope, frame, murmuration) and rename the existing `kaleidoscope` to `ripple`.

**Architecture:** Each pattern is a pure function `(col, row, t) -> [handA, handB]` appended to `CATALOG` in `src/core/choreography.ts`. The spec (`docs/superpowers/specs/2026-07-08-new-patterns-design.md`) contains reference implementations — copy them verbatim. Every catalog-length change re-pins the three hash-mapping anchor tests; exact values for every intermediate length are given below.

**Tech Stack:** TypeScript, Vitest, Vite. No new dependencies.

## Global Constraints

- Patterns are pure functions of `(col, row, t)`; pseudo-randomness ONLY via the existing `hash()`. Never call `Date.now()` or `Math.random()`.
- Angles in degrees, output in [0, 360) via `mod360`.
- `toBeCloseTo(value, 2)` is the anchor-test precision convention.
- After every task: `npx tsc --noEmit` clean AND `npx vitest run` fully green, then commit.
- NEVER touch the dev server on port 5173. If a served build is needed, use `npx vite preview --port 4173`.
- Branch: `feature/new-patterns` (already created; spec committed).

---

### Task 1: Ripple rename + pattern bar wrap

**Files:**
- Modify: `src/core/choreography.ts` (const `kaleidoscope` → `ripple`, `PATTERN_NAMES` entry)
- Modify: `tests/choreography.test.ts` (destructured name, comment, new label test)
- Modify: `index.html` (pattern-bar CSS)

**Interfaces:**
- Consumes: existing `CATALOG`, `PATTERN_NAMES` exports.
- Produces: `PATTERN_NAMES[5] === 'Ripple'`; slot 5 of `CATALOG` is the const now named `ripple` (behavior unchanged). Later tasks destructure it as `ripple`.

- [ ] **Step 1: Write the failing test**

In `tests/choreography.test.ts`, inside `describe('catalog', ...)`, after the `'names every piece'` test, add:

```ts
  it('labels the water-drop pattern Ripple', () => {
    expect(PATTERN_NAMES[5]).toBe('Ripple');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/choreography.test.ts`
Expected: FAIL — `expected 'Kaleidoscope' to be 'Ripple'`

- [ ] **Step 3: Implement the rename**

In `src/core/choreography.ts`:
- Rename the const `kaleidoscope` to `ripple` (declaration and its entry in `CATALOG`). The doc comment (`/** Concentric rings that ripple outwards like a water drop. */`) already describes it — leave it.
- In `PATTERN_NAMES`, change `'Kaleidoscope'` to `'Ripple'`.

In `tests/choreography.test.ts`:
- In the `'pins each piece to exact known values'` test, change the destructuring name `kaleidoscope` to `ripple` and update its two usages (`kaleidoscope(0, 0, 0)` → `ripple(0, 0, 0)`, the `(12, 5, 5)`/`(0, 0, 5)` lines likewise). Change the comment `// Kaleidoscope hands now trace a 3D water ripple` to `// Ripple hands trace a 3D water wave`.

- [ ] **Step 4: Add the pattern-bar wrap CSS**

In `index.html`, in the `#pattern-bar` rule, after the line `gap: 6px;` add:

```css
        flex-wrap: wrap;
        justify-content: center;
        max-width: calc(100vw - 32px);
```

- [ ] **Step 5: Verify green**

Run: `npx tsc --noEmit && npx vitest run`
Expected: tsc silent; 56 tests + 1 new = 57 passed.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "refactor: rename kaleidoscope pattern to ripple, wrap pattern bar"
```

---

### Task 2: Metronome

**Files:**
- Modify: `src/core/choreography.ts` (new const before `CATALOG`; append to `CATALOG` and `PATTERN_NAMES`)
- Modify: `tests/choreography.test.ts`

**Interfaces:**
- Consumes: `mod360`, `easeInOutCubic` (from `./angles`, already imported), `hash`, type `Choreography`.
- Produces: `const metronome: Choreography` at `CATALOG[8]`; `PATTERN_NAMES[8] === 'Metronome'`.

- [ ] **Step 1: Write the failing tests**

In `tests/choreography.test.ts`:

Change the catalog-size test to:

```ts
  it('has nine pieces', () => {
    expect(CATALOG).toHaveLength(9);
  });
```

In `'pins each piece to exact known values'`, extend the destructuring:

```ts
    const [wave, spiral, grass, bloom, cascade, ripple, earthquake, bubbles, metronome] = CATALOG;
```

and append at the end of that test:

```ts
    // Metronome ticks 6 deg per second; (0,0) has phase 0 (hash(0) = 0)
    expect(metronome(0, 0, 10)).toEqual([60, 60]);    // resting on tick 10
    expect(metronome(0, 0, 10.5)).toEqual([66, 66]);  // snap to tick 11 finished
```

In `'pins the hash-to-piece mapping'`, replace the three expectations (hash values are unchanged; the modulus is now 9):

```ts
    expect(pickChoreography(0)).toBe(CATALOG[0]); // hash(0) % 9 = 0
    expect(pickChoreography(1)).toBe(CATALOG[7]); // hash(1) % 9 = 7
    expect(pickChoreography(4)).toBe(CATALOG[1]); // hash(4) % 9 = 1
```

In `'plays every piece within a window of consecutive minutes'`, change `expect(seen.size).toBe(8);` to `expect(seen.size).toBe(9);`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/choreography.test.ts`
Expected: FAIL — length 8 ≠ 9 and `metronome is not a function`.

- [ ] **Step 3: Implement (verbatim from spec)**

In `src/core/choreography.ts`, after the `bubbles` const and before `CATALOG`:

```ts
/** Every clock ticks like a second hand, staggered so ticks rain across the wall. */
const metronome: Choreography = (col, row, t) => {
  // Diagonal cascade with a touch of per-clock jitter (0-0.4s)
  const phase = (col * 0.13 + row * 0.21 + (hash(col + row * 24) % 100) / 250) % 1;
  const tp = t + phase;
  const tick = Math.floor(tp);
  const p = Math.min(1, (tp - tick) / 0.15); // the snap takes 0.15s
  const a = mod360((tick + easeInOutCubic(p)) * 6);
  return [a, a];
};
```

Append `metronome` to `CATALOG` and `'Metronome'` to `PATTERN_NAMES`.

- [ ] **Step 4: Verify green**

Run: `npx tsc --noEmit && npx vitest run`
Expected: all tests pass (57).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: metronome pattern - staggered second-hand ticks"
```

---

### Task 3: Moiré

**Files:**
- Modify: `src/core/choreography.ts`, `tests/choreography.test.ts`

**Interfaces:**
- Consumes: `mod360`, type `Choreography`.
- Produces: `const moire: Choreography` at `CATALOG[9]`; `PATTERN_NAMES[9] === 'Moiré'`.

- [ ] **Step 1: Write the failing tests**

Catalog-size test: `it('has ten pieces', ...)` with `toHaveLength(10)`.

Destructuring gains `moire`:

```ts
    const [wave, spiral, grass, bloom, cascade, ripple, earthquake, bubbles, metronome, moire] = CATALOG;
```

Append anchors:

```ts
    // Moire: orientation follows the difference of distances to two sources
    expect(moire(0, 0, 0)[0]).toBeCloseTo(306.4857, 2);
    expect(moire(0, 0, 0)[1]).toBeCloseTo(126.4857, 2);
    expect(moire(20, 3, 5)[0]).toBeCloseTo(309.9527, 2);
```

Mapping pins for length 10:

```ts
    expect(pickChoreography(0)).toBe(CATALOG[0]); // hash(0) % 10 = 0
    expect(pickChoreography(1)).toBe(CATALOG[5]); // hash(1) % 10 = 5
    expect(pickChoreography(4)).toBe(CATALOG[5]); // hash(4) % 10 = 5
```

Coverage test: `expect(seen.size).toBe(10);`

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/choreography.test.ts` — Expected: FAIL (length, `moire` undefined).

- [ ] **Step 3: Implement (verbatim from spec)**

```ts
/** Two-source interference: line orientation tracks the difference of distances, so fringes sweep along hyperbolas. */
const moire: Choreography = (col, row, t) => {
  const s1x = 8 + 2.5 * Math.sin(0.31 * t), s1y = 5.5 + 2 * Math.cos(0.23 * t);
  const s2x = 15 + 2.5 * Math.sin(0.27 * t + 2), s2y = 5.5 + 2 * Math.cos(0.19 * t + 1);
  const d1 = Math.hypot(col - s1x, row - s1y);
  const d2 = Math.hypot(col - s2x, row - s2y);
  const a = mod360((d1 - d2) * 55 + t * 15);
  return [a, mod360(a + 180)];
};
```

Append `moire` to `CATALOG` and `'Moiré'` to `PATTERN_NAMES`.

- [ ] **Step 4: Verify green** — `npx tsc --noEmit && npx vitest run`, all pass.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: moire pattern - two-source interference fringes"
```

---

### Task 4: Kaleidoscope (4-fold mirror)

**Files:**
- Modify: `src/core/choreography.ts`, `tests/choreography.test.ts`

**Interfaces:**
- Consumes: `mod360`, `angleToward`, type `Choreography`.
- Produces: `const kaleidoscope: Choreography` at `CATALOG[10]`; `PATTERN_NAMES[10] === 'Kaleidoscope'`. (Distinct from `ripple`, the former holder of this name.)

- [ ] **Step 1: Write the failing tests**

Catalog-size test: `it('has eleven pieces', ...)`, `toHaveLength(11)`.

Destructuring gains `kaleidoscope` (slot 10):

```ts
    const [wave, spiral, grass, bloom, cascade, ripple, earthquake, bubbles, metronome, moire, kaleidoscope] = CATALOG;
```

Append anchors — one exact pin plus both mirror symmetries:

```ts
    // Kaleidoscope: 4-fold mirror. (20,2) is (3,2) mirrored across the vertical
    // axis (angle negated); (3,9) across the horizontal (angle -> 180 - a).
    expect(kaleidoscope(3, 2, 7)[0]).toBeCloseTo(326.1804, 2);
    expect(kaleidoscope(3, 2, 7)[1]).toBeCloseTo(146.1804, 2);
    expect(kaleidoscope(20, 2, 7)[0]).toBeCloseTo(33.8196, 2);  // 360 - 326.1804
    expect(kaleidoscope(3, 9, 7)[0]).toBeCloseTo(213.8196, 2);  // 180 - 326.1804 (mod 360)
```

Mapping pins for length 11:

```ts
    expect(pickChoreography(0)).toBe(CATALOG[0]); // hash(0) % 11 = 0
    expect(pickChoreography(1)).toBe(CATALOG[1]); // hash(1) % 11 = 1
    expect(pickChoreography(4)).toBe(CATALOG[4]); // hash(4) % 11 = 4
```

Coverage test: `expect(seen.size).toBe(11);`

- [ ] **Step 2: Run tests to verify they fail** — Expected: FAIL (`kaleidoscope` undefined).

- [ ] **Step 3: Implement (verbatim from spec)**

```ts
/** A vortex orbiting one quadrant, mirrored 4-fold into true kaleidoscope symmetry. */
const kaleidoscope: Choreography = (col, row, t) => {
  const mx = col <= 11.5 ? col : 23 - col;
  const my = row <= 5.5 ? row : 11 - row;
  const cx = 5.75 + 3 * Math.sin(0.4 * t);   // vortex orbits inside the quadrant
  const cy = 2.75 + 1.6 * Math.cos(0.55 * t);
  const dx = cx - mx, dy = cy - my;
  const dist = Math.hypot(dx, dy);
  let a = mod360(angleToward(dx, dy) + 90 + dist * 22 + t * 10); // tangent + twist
  if (col > 11.5) a = mod360(-a);       // mirror across the vertical axis
  if (row > 5.5) a = mod360(180 - a);   // mirror across the horizontal axis
  return [a, mod360(a + 180)];
};
```

Append `kaleidoscope` to `CATALOG` and `'Kaleidoscope'` to `PATTERN_NAMES`.

- [ ] **Step 4: Verify green** — `npx tsc --noEmit && npx vitest run`, all pass.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: kaleidoscope pattern - 4-fold mirrored vortex"
```

---

### Task 5: Frame

**Files:**
- Modify: `src/core/choreography.ts`, `tests/choreography.test.ts`

**Interfaces:**
- Consumes: `mod360`, `easeInOutCubic`, type `Choreography`.
- Produces: `const frame: Choreography` at `CATALOG[11]`; `PATTERN_NAMES[11] === 'Frame'`.

- [ ] **Step 1: Write the failing tests**

Catalog-size test: `it('has twelve pieces', ...)`, `toHaveLength(12)`.

Destructuring gains `frame` (slot 11):

```ts
    const [wave, spiral, grass, bloom, cascade, ripple, earthquake, bubbles, metronome, moire, kaleidoscope, frame] = CATALOG;
```

Append anchors:

```ts
    // Frame: at t=0 a ring sits at the center; (11,5) is on a top/bottom edge
    // (rotates toward 90 deg), (23,5) on a side edge (rotates toward 0), both
    // 0.5 from the ring so they share the same blend amount, mirrored about 45.
    expect(frame(11, 5, 0)[0]).toBeCloseTo(86.8661, 2);
    expect(frame(11, 5, 0)[1]).toBeCloseTo(266.8661, 2);
    expect(frame(23, 5, 0)[0]).toBeCloseTo(3.1339, 2);
```

Mapping pins for length 12:

```ts
    expect(pickChoreography(0)).toBe(CATALOG[0]); // hash(0) % 12 = 0
    expect(pickChoreography(1)).toBe(CATALOG[7]); // hash(1) % 12 = 7
    expect(pickChoreography(4)).toBe(CATALOG[1]); // hash(4) % 12 = 1
```

Coverage test: `expect(seen.size).toBe(12);`

- [ ] **Step 2: Run tests to verify they fail** — Expected: FAIL (`frame` undefined).

- [ ] **Step 3: Implement (verbatim from spec)**

```ts
/** Expanding concentric rectangles: rings sweep outward, aligning cells to the frame edge as they pass. */
const frame: Choreography = (col, row, t) => {
  const dx = col - 11.5, dy = row - 5.5;
  const cheb = Math.max(Math.abs(dx), Math.abs(dy));
  const edge = Math.abs(dx) > Math.abs(dy) ? 0 : 90;
  const SPEED = 3.5, GAP = 6; // ring every ~1.7s, ~2 rings visible
  const m = ((cheb - t * SPEED) % GAP + GAP) % GAP;
  const ringDist = Math.min(m, GAP - m);
  const p = easeInOutCubic(Math.exp(-ringDist * ringDist * 1.2));
  const shortDiff = mod360(edge - 45 + 90) % 180 - 90; // +/-45 by construction
  const a = mod360(45 + shortDiff * p);
  return [a, mod360(a + 180)];
};
```

Append `frame` to `CATALOG` and `'Frame'` to `PATTERN_NAMES`.

- [ ] **Step 4: Verify green** — `npx tsc --noEmit && npx vitest run`, all pass.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: frame pattern - expanding concentric rectangles"
```

---

### Task 6: Murmuration

**Files:**
- Modify: `src/core/choreography.ts`, `tests/choreography.test.ts`

**Interfaces:**
- Consumes: `mod360`, `angleToward`, `hash`, type `Choreography`.
- Produces: `const murmuration: Choreography` at `CATALOG[12]`; `PATTERN_NAMES[12] === 'Murmuration'`. Final catalog length 13.

- [ ] **Step 1: Write the failing tests**

Catalog-size test becomes final: `it('has thirteen pieces', ...)`, `toHaveLength(13)`.

Destructuring gains `murmuration` (slot 12):

```ts
    const [wave, spiral, grass, bloom, cascade, ripple, earthquake, bubbles, metronome, moire, kaleidoscope, frame, murmuration] = CATALOG;
```

Append anchors:

```ts
    // Murmuration: needles follow the flock's blended heading
    expect(murmuration(12, 6, 3)[0]).toBeCloseTo(125.5828, 2);
    expect(murmuration(12, 6, 3)[1]).toBeCloseTo(125.5828, 2);
    expect(murmuration(2, 10, 20)[0]).toBeCloseTo(135.1201, 2);
```

Mapping pins for length 13 (final):

```ts
    expect(pickChoreography(0)).toBe(CATALOG[0]);  // hash(0) % 13 = 0
    expect(pickChoreography(1)).toBe(CATALOG[11]); // hash(1) % 13 = 11
    expect(pickChoreography(4)).toBe(CATALOG[5]);  // hash(4) % 13 = 5
```

Coverage test: `expect(seen.size).toBe(13);` (all 13 appear within 66 minutes; 1000 is ample.)

- [ ] **Step 2: Run tests to verify they fail** — Expected: FAIL (`murmuration` undefined).

- [ ] **Step 3: Implement (verbatim from spec — note the ambient field is the flock's mean heading, NOT an independent drift)**

```ts
/** Five invisible birds on loosely-aligned Lissajous paths; needles point along the flock's blended heading. */
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

Append `murmuration` to `CATALOG` and `'Murmuration'` to `PATTERN_NAMES`.

- [ ] **Step 4: Verify green** — `npx tsc --noEmit && npx vitest run`, all pass.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: murmuration pattern - flocking needle field"
```

---

### Task 7: Smoothness gate + live check

**Files:** none modified (verification only; scratch script outside the repo).

**Interfaces:**
- Consumes: final `CATALOG` (13 entries, new patterns at indices 8-12).

- [ ] **Step 1: Run the smoothness harness**

Write this to the session scratchpad (NOT the repo) as `gate.ts` and run `npx vite-node <path>/gate.ts` from the repo root:

```ts
import { CATALOG } from '/Users/jared/github_projects/million-times/src/core/choreography';

const circ = (a: number, b: number): number => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
const axial = (a: number, b: number): number => { const d = Math.abs(a - b) % 180; return d > 90 ? 180 - d : d; };
const cases: Array<[number, string, (a: number, b: number) => number]> = [
  [8, 'metronome', circ], [9, 'moire', axial], [10, 'kaleidoscope', axial],
  [11, 'frame', axial], [12, 'murmuration', circ],
];
for (const [idx, name, metric] of cases) {
  const fn = CATALOG[idx];
  let max = 0, over30 = 0;
  for (let row = 0; row < 12; row++) for (let col = 0; col < 24; col++) {
    let prev = fn(col, row, 0);
    for (let f = 1; f <= 38 * 60; f++) {
      const cur = fn(col, row, f / 60);
      const d = metric(cur[0], prev[0]);
      if (d > 30) over30++;
      if (d > max) max = d;
      prev = cur;
    }
  }
  console.log(`${name}: max ${max.toFixed(2)} deg/frame, >30 deg events: ${over30}`);
}
```

Expected output (deterministic — any deviation is a transcription error in a pattern):

```
metronome: max 1.79 deg/frame, >30 deg events: 0
moire: max 1.46 deg/frame, >30 deg events: 0
kaleidoscope: max 53.32 deg/frame, >30 deg events: 8
frame: max 6.81 deg/frame, >30 deg events: 0
murmuration: max 89.05 deg/frame, >30 deg events: 6
```

(Kaleidoscope's 8 and murmuration's 6 events are accepted per spec.)

- [ ] **Step 2: Full suite + typecheck**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean, all tests green.

- [ ] **Step 3: Live check of the pattern bar**

Run `npx vite preview --port 4173` (NEVER port 5173), open the page, confirm: 15 buttons render, the bar wraps instead of overflowing at ~700px width, each new pattern button (Metronome, Moiré, Kaleidoscope, Frame, Murmuration) plays its pattern, and Auto restores rotation. Stop the preview server afterward.

No commit for this task unless a fix was required.
