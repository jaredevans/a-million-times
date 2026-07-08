# A Million Times Web Recreation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A browser recreation of *A Million Times*: a 24×12 grid of 288 canvas-rendered analog clocks whose hands form digits showing the current local time, sweeping clockwise for 10 seconds before each minute to resolve into the next minute exactly on the tick.

**Architecture:** The display is a pure function of wall-clock time — every frame computes `pose(now)` (288 clocks × 2 hand angles) from scratch and draws it; there is no accumulated animation state. Pure logic lives in `src/core/` (fully unit-tested); canvas drawing lives in `src/render/`; `src/main.ts` wires the rAF loop.

**Tech Stack:** Vite (vanilla-ts), TypeScript strict, Vitest. Zero runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-07-08-million-times-design.md`

## Global Constraints

- Zero runtime dependencies. devDependencies only: `typescript`, `vite`, `vitest`.
- TypeScript `strict: true`; project must pass `npm run build` (`tsc && vite build`) at every commit.
- Angles are degrees, `0°` = 12 o'clock, increasing clockwise, normalized to `[0, 360)`.
- Neutral ("off") pose: both hands at `225°`.
- Grid: 24 cols × 12 rows = 288 clocks, row-major indexing (`index = row * 24 + col`).
- Digit blocks: 4 cols × 6 rows, at grid columns `[2, 7, 13, 18]`, starting at grid row `3`.
- Timeline per minute M: hold on `[M, M+50s)`, transition on `[M+50s, M+60s)` to minute M+1's pose.
- Hand travel: `mod360(target − start) + 360` (clockwise, exactly one extra revolution), eased with easeInOutCubic.
- Intro sweep: 3 s from neutral pose on load; skipped when load's second-of-minute > 47; loading mid-transition joins the transition in flight.
- Time format: 12-hour, no AM/PM, blank leading digit (hours 1–9); midnight and noon display 12:00; local time via `Date`.
- End every commit message with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

## File Structure

```
package.json, tsconfig.json, .gitignore, index.html
src/
  core/
    types.ts      HandAngles, DigitGlyph, GridPose
    angles.ts     mod360, easeInOutCubic, travel, interpolateHand
    font.ts       NEUTRAL, DIGIT_GLYPHS (0–9), BLANK_GLYPH
    layout.ts     COLS/ROWS/CLOCK_COUNT, DIGIT_COLS/DIGIT_ROW, NEUTRAL_POSE, timeToDigits, poseForTime
    timeline.ts   poseAt(nowMs, loadMs), interpolatePose, timing constants
  render/
    sprite.ts     createFaceSprite (cached clock-face bitmap)
    renderer.ts   Geometry, computeGeometry, drawFrame
  main.ts         canvas setup, resize, rAF loop
tests/
  angles.test.ts, font.test.ts, layout.test.ts, timeline.test.ts
```

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `index.html`
- Create: `src/main.ts` (stub, replaced in Task 6)

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a building Vite + TypeScript + Vitest project. `npm run build` and `npm run dev` work. `index.html` is final (never touched again) and exposes `<canvas id="stage">`.

Scaffold manually (do NOT use `npm create vite` — it prompts interactively and the directory is non-empty).

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "million-times",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "^5.8.0",
    "vite": "^7.0.0",
    "vitest": "^3.2.0"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["vite/client"],
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: Write `.gitignore`**

```
node_modules/
dist/
```

- [ ] **Step 4: Write `index.html`** (final version — includes all page styling)

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>A Million Times</title>
    <style>
      html, body { margin: 0; height: 100%; overflow: hidden; background: #d8d3ca; }
      canvas { display: block; width: 100vw; height: 100vh; }
    </style>
  </head>
  <body>
    <canvas id="stage"></canvas>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 5: Write stub `src/main.ts`**

```ts
console.log('A Million Times — scaffold');
```

- [ ] **Step 6: Install and verify build**

Run: `npm install`
Expected: installs typescript, vite, vitest with no errors.

Run: `npm run build`
Expected: `tsc` passes, `vite build` emits `dist/` with no errors.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json .gitignore index.html src/main.ts
git commit -m "feat: scaffold vite + typescript + vitest project

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Angle math (`src/core/angles.ts`)

**Files:**
- Create: `src/core/angles.ts`
- Test: `tests/angles.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (all exported from `src/core/angles.ts`):
  - `mod360(deg: number): number` — normalize to `[0, 360)`
  - `easeInOutCubic(p: number): number`
  - `travel(start: number, target: number): number` — clockwise degrees incl. one extra revolution, range `[360, 720)`
  - `interpolateHand(start: number, target: number, p: number): number` — eased angle at progress p, clamped, normalized

- [ ] **Step 1: Write the failing test — `tests/angles.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { easeInOutCubic, interpolateHand, mod360, travel } from '../src/core/angles';

describe('mod360', () => {
  it('normalizes into [0, 360)', () => {
    expect(mod360(0)).toBe(0);
    expect(mod360(360)).toBe(0);
    expect(mod360(370)).toBe(10);
    expect(mod360(-90)).toBe(270);
    expect(mod360(725)).toBe(5);
  });
});

describe('easeInOutCubic', () => {
  it('anchors endpoints and midpoint', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 10);
  });

  it('is monotonically increasing', () => {
    for (let i = 0; i < 100; i++) {
      expect(easeInOutCubic((i + 1) / 100)).toBeGreaterThan(easeInOutCubic(i / 100));
    }
  });
});

describe('travel', () => {
  it('always includes one extra full revolution', () => {
    expect(travel(0, 90)).toBe(450);
    expect(travel(90, 0)).toBe(630);
    expect(travel(180, 180)).toBe(360);
    expect(travel(225, 0)).toBe(495);
  });

  it('stays within [360, 720)', () => {
    for (let s = 0; s < 360; s += 15) {
      for (let t = 0; t < 360; t += 15) {
        const tr = travel(s, t);
        expect(tr).toBeGreaterThanOrEqual(360);
        expect(tr).toBeLessThan(720);
      }
    }
  });
});

describe('interpolateHand', () => {
  it('returns start at p=0 and target at p=1', () => {
    expect(interpolateHand(30, 120, 0)).toBe(30);
    expect(interpolateHand(30, 120, 1)).toBe(120);
  });

  it('passes the halfway point of its travel at p=0.5', () => {
    expect(interpolateHand(0, 0, 0.5)).toBeCloseTo(180, 10);
    expect(interpolateHand(225, 225, 0.5)).toBeCloseTo(45, 10);
  });

  it('clamps out-of-range progress', () => {
    expect(interpolateHand(30, 120, -0.5)).toBe(30);
    expect(interpolateHand(30, 120, 1.5)).toBe(120);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/angles.test.ts`
Expected: FAIL — cannot resolve `../src/core/angles`.

- [ ] **Step 3: Write `src/core/angles.ts`**

```ts
export function mod360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export function easeInOutCubic(p: number): number {
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}

export function travel(start: number, target: number): number {
  return mod360(target - start) + 360;
}

export function interpolateHand(start: number, target: number, p: number): number {
  if (p <= 0) return mod360(start);
  if (p >= 1) return mod360(target);
  return mod360(start + travel(start, target) * easeInOutCubic(p));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/angles.test.ts`
Expected: PASS — 4 test groups, all green.

- [ ] **Step 5: Commit**

```bash
git add src/core/angles.ts tests/angles.test.ts
git commit -m "feat: clockwise angle interpolation with easing

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Shared types and digit font (`src/core/types.ts`, `src/core/font.ts`)

**Files:**
- Create: `src/core/types.ts`
- Create: `src/core/font.ts`
- Test: `tests/font.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `src/core/types.ts`: `HandAngles = readonly [number, number]`, `DigitGlyph = readonly HandAngles[]` (24 entries, 4 cols × 6 rows row-major), `GridPose = readonly HandAngles[]` (288 entries).
  - `src/core/font.ts`: `NEUTRAL: HandAngles` (`[225, 225]`), `DIGIT_GLYPHS: readonly DigitGlyph[]` (index = digit 0–9), `BLANK_GLYPH: DigitGlyph` (all neutral).

Font design (from spec): strokes run through clock centers. Mid-stroke = hands opposed 180°; corner = hands at 90°; endpoint = both hands toward the single neighbor; junction clocks (a T has 3 directions but only 2 hands) keep their 2 most shape-defining directions; off-stroke = neutral. Directions: N=0 (up), E=90 (right), S=180 (down), W=270 (left). The seven-segment-style middle bar sits at glyph row 2 (slightly above center, typographically standard).

- [ ] **Step 1: Write the failing test — `tests/font.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { BLANK_GLYPH, DIGIT_GLYPHS, NEUTRAL } from '../src/core/font';

describe('digit glyphs', () => {
  it('defines ten digits of 24 clocks each', () => {
    expect(DIGIT_GLYPHS).toHaveLength(10);
    for (const glyph of DIGIT_GLYPHS) expect(glyph).toHaveLength(24);
  });

  it('keeps every angle normalized to [0, 360)', () => {
    for (const glyph of [...DIGIT_GLYPHS, BLANK_GLYPH]) {
      for (const [a, b] of glyph) {
        expect(a).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThan(360);
        expect(b).toBeGreaterThanOrEqual(0);
        expect(b).toBeLessThan(360);
      }
    }
  });

  it('renders blank as all-neutral', () => {
    expect(BLANK_GLYPH).toHaveLength(24);
    for (const pose of BLANK_GLYPH) expect(pose).toEqual(NEUTRAL);
  });

  it('spot-checks strokes', () => {
    expect(DIGIT_GLYPHS[0][0]).toEqual([90, 180]);   // 0: top-left corner turns E+S
    expect(DIGIT_GLYPHS[0][5]).toEqual(NEUTRAL);     // 0: interior clock is off
    expect(DIGIT_GLYPHS[1][2]).toEqual([180, 180]);  // 1: top endpoint points down
    expect(DIGIT_GLYPHS[1][22]).toEqual([0, 0]);     // 1: bottom endpoint points up
    expect(DIGIT_GLYPHS[7][3]).toEqual([180, 270]);  // 7: top-right corner turns S+W
    expect(DIGIT_GLYPHS[8][9]).toEqual([270, 90]);   // 8: middle bar is horizontal
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/font.test.ts`
Expected: FAIL — cannot resolve `../src/core/font`.

- [ ] **Step 3: Write `src/core/types.ts`**

```ts
/** Two hand angles in degrees: 0 = 12 o'clock, increasing clockwise, in [0, 360). */
export type HandAngles = readonly [number, number];

/** One digit block: 24 clocks, 4 cols x 6 rows, row-major. */
export type DigitGlyph = readonly HandAngles[];

/** Full grid: 288 clocks, 24 cols x 12 rows, row-major. */
export type GridPose = readonly HandAngles[];
```

- [ ] **Step 4: Write `src/core/font.ts`** (copy exactly — glyph tables are the product of the stroke rules above)

```ts
import type { DigitGlyph, HandAngles } from './types';

const N = 0;
const E = 90;
const S = 180;
const W = 270;

export const NEUTRAL: HandAngles = [225, 225];

const __ = NEUTRAL;
const H: HandAngles = [W, E]; // horizontal line through center
const V: HandAngles = [N, S]; // vertical line through center
const p = (a: number, b: number): HandAngles => [a, b];

const GLYPH_0: DigitGlyph = [
  p(E, S), H,  H,  p(S, W),
  V,       __, __, V,
  V,       __, __, V,
  V,       __, __, V,
  V,       __, __, V,
  p(N, E), H,  H,  p(N, W),
];

const GLYPH_1: DigitGlyph = [
  __, __, p(S, S), __,
  __, __, V,       __,
  __, __, V,       __,
  __, __, V,       __,
  __, __, V,       __,
  __, __, p(N, N), __,
];

const GLYPH_2: DigitGlyph = [
  p(E, E), H,  H,  p(S, W),
  __,      __, __, V,
  p(E, S), H,  H,  p(N, W),
  V,       __, __, __,
  V,       __, __, __,
  p(N, E), H,  H,  p(W, W),
];

const GLYPH_3: DigitGlyph = [
  p(E, E), H,       H,  p(S, W),
  __,      __,      __, V,
  __,      p(E, E), H,  p(N, W),
  __,      __,      __, V,
  __,      __,      __, V,
  p(E, E), H,       H,  p(N, W),
];

const GLYPH_4: DigitGlyph = [
  p(S, S), __, __, p(S, S),
  V,       __, __, V,
  p(N, E), H,  H,  p(N, W),
  __,      __, __, V,
  __,      __, __, V,
  __,      __, __, p(N, N),
];

const GLYPH_5: DigitGlyph = [
  p(E, S), H,  H,  p(W, W),
  V,       __, __, __,
  p(N, E), H,  H,  p(S, W),
  __,      __, __, V,
  __,      __, __, V,
  p(E, E), H,  H,  p(N, W),
];

const GLYPH_6: DigitGlyph = [
  p(E, S), H,  H,  p(W, W),
  V,       __, __, __,
  p(E, S), H,  H,  p(S, W),
  V,       __, __, V,
  V,       __, __, V,
  p(N, E), H,  H,  p(N, W),
];

const GLYPH_7: DigitGlyph = [
  p(E, E), H,  H,  p(S, W),
  __,      __, __, V,
  __,      __, __, V,
  __,      __, __, V,
  __,      __, __, V,
  __,      __, __, p(N, N),
];

const GLYPH_8: DigitGlyph = [
  p(E, S), H,  H,  p(S, W),
  V,       __, __, V,
  V,       H,  H,  V,
  V,       __, __, V,
  V,       __, __, V,
  p(N, E), H,  H,  p(N, W),
];

const GLYPH_9: DigitGlyph = [
  p(E, S), H,  H,  p(S, W),
  V,       __, __, V,
  p(N, E), H,  H,  p(N, W),
  __,      __, __, V,
  __,      __, __, V,
  p(E, E), H,  H,  p(N, W),
];

export const BLANK_GLYPH: DigitGlyph = Array.from({ length: 24 }, () => NEUTRAL);

export const DIGIT_GLYPHS: readonly DigitGlyph[] = [
  GLYPH_0, GLYPH_1, GLYPH_2, GLYPH_3, GLYPH_4,
  GLYPH_5, GLYPH_6, GLYPH_7, GLYPH_8, GLYPH_9,
];
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/font.test.ts`
Expected: PASS — 4 tests green.

- [ ] **Step 6: Commit**

```bash
git add src/core/types.ts src/core/font.ts tests/font.test.ts
git commit -m "feat: digit glyph font on 4x6 clock blocks

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Grid layout (`src/core/layout.ts`)

**Files:**
- Create: `src/core/layout.ts`
- Test: `tests/layout.test.ts`

**Interfaces:**
- Consumes: `NEUTRAL`, `DIGIT_GLYPHS`, `BLANK_GLYPH` from `./font`; `GridPose`, `HandAngles` from `./types`.
- Produces (from `src/core/layout.ts`):
  - `COLS = 24`, `ROWS = 12`, `CLOCK_COUNT = 288`
  - `DIGIT_COLS = [2, 7, 13, 18] as const`, `DIGIT_ROW = 3`
  - `NEUTRAL_POSE: GridPose`
  - `timeToDigits(hours24: number, minutes: number): (number | null)[]` — 4 slots, `null` = blank
  - `poseForTime(hours24: number, minutes: number): GridPose`

Column arithmetic (locked by spec): `2 margin | 4 digit | 1 gap | 4 digit | 2 gap | 4 digit | 1 gap | 4 digit | 2 margin` = 24. Rows: `3 margin | 6 digit | 3 margin` = 12.

- [ ] **Step 1: Write the failing test — `tests/layout.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { DIGIT_GLYPHS, NEUTRAL } from '../src/core/font';
import {
  CLOCK_COUNT, COLS, DIGIT_COLS, DIGIT_ROW, NEUTRAL_POSE, poseForTime, timeToDigits,
} from '../src/core/layout';

describe('timeToDigits', () => {
  it('maps midnight and noon to 12:00', () => {
    expect(timeToDigits(0, 0)).toEqual([1, 2, 0, 0]);
    expect(timeToDigits(12, 0)).toEqual([1, 2, 0, 0]);
  });

  it('blanks the leading digit for single-digit hours', () => {
    expect(timeToDigits(9, 5)).toEqual([null, 9, 0, 5]);
    expect(timeToDigits(13, 59)).toEqual([null, 1, 5, 9]);
  });

  it('keeps the leading 1 for double-digit hours', () => {
    expect(timeToDigits(22, 30)).toEqual([1, 0, 3, 0]);
    expect(timeToDigits(11, 11)).toEqual([1, 1, 1, 1]);
  });
});

describe('poseForTime', () => {
  it('produces one pose per clock', () => {
    expect(poseForTime(12, 0)).toHaveLength(CLOCK_COUNT);
    expect(NEUTRAL_POSE).toHaveLength(CLOCK_COUNT);
  });

  it('keeps margins and gaps neutral', () => {
    const pose = poseForTime(12, 34);
    expect(pose[0]).toEqual(NEUTRAL);                    // top-left margin
    expect(pose[DIGIT_ROW * COLS + 0]).toEqual(NEUTRAL); // left margin beside digits
    expect(pose[DIGIT_ROW * COLS + 6]).toEqual(NEUTRAL); // gap between hour digits
    expect(pose[CLOCK_COUNT - 1]).toEqual(NEUTRAL);      // bottom-right margin
  });

  it('stamps each glyph at its slot origin', () => {
    const pose = poseForTime(12, 34); // digits [1, 2, 3, 4]
    expect(pose[DIGIT_ROW * COLS + DIGIT_COLS[0]]).toEqual(DIGIT_GLYPHS[1][0]);
    expect(pose[DIGIT_ROW * COLS + DIGIT_COLS[1]]).toEqual(DIGIT_GLYPHS[2][0]);
    expect(pose[DIGIT_ROW * COLS + DIGIT_COLS[2]]).toEqual(DIGIT_GLYPHS[3][0]);
    expect(pose[DIGIT_ROW * COLS + DIGIT_COLS[3]]).toEqual(DIGIT_GLYPHS[4][0]);
  });

  it('renders a blank leading digit as neutral clocks', () => {
    const pose = poseForTime(9, 5);
    for (let gr = 0; gr < 6; gr++) {
      for (let gc = 0; gc < 4; gc++) {
        expect(pose[(DIGIT_ROW + gr) * COLS + DIGIT_COLS[0] + gc]).toEqual(NEUTRAL);
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/layout.test.ts`
Expected: FAIL — cannot resolve `../src/core/layout`.

- [ ] **Step 3: Write `src/core/layout.ts`**

```ts
import { BLANK_GLYPH, DIGIT_GLYPHS, NEUTRAL } from './font';
import type { GridPose, HandAngles } from './types';

export const COLS = 24;
export const ROWS = 12;
export const CLOCK_COUNT = COLS * ROWS;

/** Grid column where each of the 4 digit blocks starts. */
export const DIGIT_COLS = [2, 7, 13, 18] as const;
/** Grid row where every digit block starts. */
export const DIGIT_ROW = 3;

const GLYPH_COLS = 4;
const GLYPH_ROWS = 6;

export const NEUTRAL_POSE: GridPose = Array.from({ length: CLOCK_COUNT }, () => NEUTRAL);

/** 12-hour digit slots [H1, H2, M1, M2]; null = blank leading digit. */
export function timeToDigits(hours24: number, minutes: number): (number | null)[] {
  const h12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return [h12 >= 10 ? 1 : null, h12 % 10, Math.floor(minutes / 10), minutes % 10];
}

export function poseForTime(hours24: number, minutes: number): GridPose {
  const pose: HandAngles[] = Array.from({ length: CLOCK_COUNT }, () => NEUTRAL);
  timeToDigits(hours24, minutes).forEach((digit, slot) => {
    const glyph = digit === null ? BLANK_GLYPH : DIGIT_GLYPHS[digit];
    for (let gr = 0; gr < GLYPH_ROWS; gr++) {
      for (let gc = 0; gc < GLYPH_COLS; gc++) {
        pose[(DIGIT_ROW + gr) * COLS + DIGIT_COLS[slot] + gc] = glyph[gr * GLYPH_COLS + gc];
      }
    }
  });
  return pose;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/layout.test.ts`
Expected: PASS — 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/core/layout.ts tests/layout.test.ts
git commit -m "feat: compose digit glyphs into the 24x12 grid pose

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Timeline (`src/core/timeline.ts`)

**Files:**
- Create: `src/core/timeline.ts`
- Test: `tests/timeline.test.ts`

**Interfaces:**
- Consumes: `interpolateHand` from `./angles`; `NEUTRAL_POSE`, `poseForTime` from `./layout`; `GridPose` from `./types`.
- Produces (from `src/core/timeline.ts`):
  - `TRANSITION_START_S = 50`, `TRANSITION_DURATION_S = 10`, `INTRO_MS = 3000`, `INTRO_CUTOFF_S = 47`
  - `interpolatePose(from: GridPose, to: GridPose, p: number): GridPose`
  - `poseAt(nowMs: number, loadMs: number): GridPose` — the single entry point the renderer calls each frame

- [ ] **Step 1: Write the failing test — `tests/timeline.test.ts`**

Tests use the local-time `Date` constructor so they pass in any timezone. Margin clock 0 is always neutral (225°); halfway through any 360° sweep it reads `mod360(225 + 180) = 45`.

```ts
import { describe, expect, it } from 'vitest';
import { poseForTime } from '../src/core/layout';
import { poseAt } from '../src/core/timeline';

const at = (h: number, m: number, s: number, ms = 0): number =>
  new Date(2026, 0, 15, h, m, s, ms).getTime();

describe('poseAt', () => {
  it('holds the current pose between transitions', () => {
    const load = at(10, 20, 0);
    expect(poseAt(at(10, 30, 25), load)).toEqual(poseForTime(10, 30));
    expect(poseAt(at(10, 30, 49, 999), load)).toEqual(poseForTime(10, 30));
  });

  it('matches the hold pose exactly when the transition starts', () => {
    expect(poseAt(at(10, 30, 50), at(10, 20, 0))).toEqual(poseForTime(10, 30));
  });

  it('lands on the next pose exactly on the minute', () => {
    expect(poseAt(at(10, 31, 0), at(10, 20, 0))).toEqual(poseForTime(10, 31));
  });

  it('sweeps a neutral clock through +180deg at the transition midpoint', () => {
    const pose = poseAt(at(10, 30, 55), at(10, 20, 0));
    expect(pose[0][0]).toBeCloseTo(45, 10);
    expect(pose[0][1]).toBeCloseTo(45, 10);
  });

  it('crosses the hour boundary', () => {
    expect(poseAt(at(11, 0, 0), at(10, 20, 0))).toEqual(poseForTime(11, 0));
  });

  it('runs the intro sweep from neutral after load', () => {
    const load = at(10, 30, 10);
    const midIntro = poseAt(load + 1500, load);
    expect(midIntro[0][0]).toBeCloseTo(45, 10);
    expect(poseAt(load + 3000, load)).toEqual(poseForTime(10, 30));
  });

  it('skips the intro when fewer than 3s remain before the transition', () => {
    const load = at(10, 30, 48);
    expect(poseAt(load + 100, load)).toEqual(poseForTime(10, 30));
  });

  it('joins an in-flight transition when loaded mid-transition', () => {
    const load = at(10, 30, 55);
    const pose = poseAt(load, load);
    expect(pose[0][0]).toBeCloseTo(45, 10);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/timeline.test.ts`
Expected: FAIL — cannot resolve `../src/core/timeline`.

- [ ] **Step 3: Write `src/core/timeline.ts`**

```ts
import { interpolateHand } from './angles';
import { NEUTRAL_POSE, poseForTime } from './layout';
import type { GridPose } from './types';

export const TRANSITION_START_S = 50;
export const TRANSITION_DURATION_S = 10;
export const INTRO_MS = 3000;
export const INTRO_CUTOFF_S = 47;

export function interpolatePose(from: GridPose, to: GridPose, p: number): GridPose {
  return from.map(
    ([a, b], i) => [interpolateHand(a, to[i][0], p), interpolateHand(b, to[i][1], p)] as const,
  );
}

/** The whole display is a pure function of wall-clock time. */
export function poseAt(nowMs: number, loadMs: number): GridPose {
  const now = new Date(nowMs);
  const sec = now.getSeconds() + now.getMilliseconds() / 1000;
  const current = poseForTime(now.getHours(), now.getMinutes());

  if (sec >= TRANSITION_START_S) {
    const next = new Date(nowMs + 60_000);
    const target = poseForTime(next.getHours(), next.getMinutes());
    return interpolatePose(current, target, (sec - TRANSITION_START_S) / TRANSITION_DURATION_S);
  }

  const load = new Date(loadMs);
  const loadSec = load.getSeconds() + load.getMilliseconds() / 1000;
  const sinceLoad = nowMs - loadMs;
  if (sinceLoad < INTRO_MS && loadSec <= INTRO_CUTOFF_S) {
    return interpolatePose(NEUTRAL_POSE, current, sinceLoad / INTRO_MS);
  }

  return current;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/timeline.test.ts`
Expected: PASS — 8 tests green.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS — angles, font, layout, timeline all green.

- [ ] **Step 6: Commit**

```bash
git add src/core/timeline.ts tests/timeline.test.ts
git commit -m "feat: pure-function-of-time pose timeline with intro sweep

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Canvas rendering and app wiring (`src/render/`, `src/main.ts`)

**Files:**
- Create: `src/render/sprite.ts`
- Create: `src/render/renderer.ts`
- Modify: `src/main.ts` (replace the Task 1 stub entirely)

**Interfaces:**
- Consumes: `poseAt` from `./core/timeline`; `COLS`, `ROWS` from `./core/layout`; `GridPose` from `./core/types`.
- Produces:
  - `sprite.ts`: `createFaceSprite(faceDiameter: number, dpr: number): HTMLCanvasElement` — pre-rendered face + bezel + shadow, canvas is square with 18% padding per side for the shadow.
  - `renderer.ts`: `interface Geometry { cell: number; originX: number; originY: number; clockRadius: number }`, `computeGeometry(width: number, height: number): Geometry`, `drawFrame(ctx: CanvasRenderingContext2D, pose: GridPose, geom: Geometry, sprite: HTMLCanvasElement, dpr: number, width: number, height: number): void` (width/height in CSS px).

Rendering is verified visually, not unit-tested (per spec). Palette: background `#d8d3ca`, face `#f7f5f0`, bezel `#dcd6cb`, hands/hub `#1c1b1a`.

- [ ] **Step 1: Write `src/render/sprite.ts`**

```ts
/** Pre-render the static clock face (shadow + face + bezel) once; blitted 288x per frame. */
export function createFaceSprite(faceDiameter: number, dpr: number): HTMLCanvasElement {
  const pad = faceDiameter * 0.18;
  const sizeCss = faceDiameter + pad * 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(sizeCss * dpr));
  canvas.height = canvas.width;

  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  const c = sizeCss / 2;
  const r = faceDiameter / 2;

  ctx.shadowColor = 'rgba(60, 50, 40, 0.28)';
  ctx.shadowBlur = faceDiameter * 0.09;
  ctx.shadowOffsetY = faceDiameter * 0.035;
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.fillStyle = '#f7f5f0';
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.beginPath();
  ctx.arc(c, c, r - faceDiameter * 0.015, 0, Math.PI * 2);
  ctx.strokeStyle = '#dcd6cb';
  ctx.lineWidth = faceDiameter * 0.03;
  ctx.stroke();

  return canvas;
}
```

- [ ] **Step 2: Write `src/render/renderer.ts`**

```ts
import { COLS, ROWS } from '../core/layout';
import type { GridPose } from '../core/types';

export interface Geometry {
  cell: number;
  originX: number;
  originY: number;
  clockRadius: number;
}

export function computeGeometry(width: number, height: number): Geometry {
  const cell = Math.min(width / (COLS + 1), height / (ROWS + 1));
  return {
    cell,
    originX: (width - cell * COLS) / 2,
    originY: (height - cell * ROWS) / 2,
    clockRadius: cell * 0.47,
  };
}

function drawHand(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  angleDeg: number,
  len: number,
  width: number,
): void {
  const rad = (angleDeg * Math.PI) / 180;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.sin(rad) * len, cy - Math.cos(rad) * len);
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#1c1b1a';
  ctx.stroke();
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  pose: GridPose,
  geom: Geometry,
  sprite: HTMLCanvasElement,
  dpr: number,
  width: number,
  height: number,
): void {
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.fillStyle = '#d8d3ca';
  ctx.fillRect(0, 0, width, height);

  const spriteCss = sprite.width / dpr;
  const handLen = geom.clockRadius * 0.9;
  const handWidth = Math.max(1.5, geom.clockRadius * 0.11);

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cx = geom.originX + (col + 0.5) * geom.cell;
      const cy = geom.originY + (row + 0.5) * geom.cell;
      ctx.drawImage(sprite, cx - spriteCss / 2, cy - spriteCss / 2, spriteCss, spriteCss);

      const [a, b] = pose[row * COLS + col];
      drawHand(ctx, cx, cy, a, handLen, handWidth);
      drawHand(ctx, cx, cy, b, handLen, handWidth);

      ctx.beginPath();
      ctx.arc(cx, cy, handWidth * 0.75, 0, Math.PI * 2);
      ctx.fillStyle = '#1c1b1a';
      ctx.fill();
    }
  }
  ctx.restore();
}
```

- [ ] **Step 3: Replace `src/main.ts`**

```ts
import { poseAt } from './core/timeline';
import { computeGeometry, drawFrame, type Geometry } from './render/renderer';
import { createFaceSprite } from './render/sprite';

const canvas = document.querySelector<HTMLCanvasElement>('#stage')!;
const ctx = canvas.getContext('2d');

if (!ctx) {
  document.body.textContent = 'This page requires HTML canvas support.';
} else {
  const loadMs = Date.now();
  let dpr = 1;
  let geom!: Geometry;
  let sprite!: HTMLCanvasElement;

  const resize = (): void => {
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    geom = computeGeometry(window.innerWidth, window.innerHeight);
    sprite = createFaceSprite(geom.clockRadius * 2, dpr);
  };

  window.addEventListener('resize', resize);
  resize();

  const frame = (): void => {
    drawFrame(ctx, poseAt(Date.now(), loadMs), geom, sprite, dpr, window.innerWidth, window.innerHeight);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
```

- [ ] **Step 4: Verify build and tests**

Run: `npm run build`
Expected: `tsc` and `vite build` pass with no errors.

Run: `npm test`
Expected: all suites still green.

- [ ] **Step 5: Visual check**

Run: `npm run dev` (background), open `http://localhost:5173` — with browser tools if available, otherwise ask the human to look.

Confirm:
1. A 24×12 grid of white clocks on a warm-gray wall, all clocks visible, none clipped.
2. On load: a 3-second sweep from all-diagonal (7:30) into the current time.
3. The current time is legible as four digits (or three with a blank leading digit), matching the actual local time; unused clocks rest at the 7:30 diagonal.
4. Resize the window: grid re-centers and rescales, stays 2:1.

- [ ] **Step 6: Commit**

```bash
git add src/render/sprite.ts src/render/renderer.ts src/main.ts
git commit -m "feat: canvas renderer with cached face sprite and rAF loop

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: End-to-end verification

**Files:**
- No new files. Fix anything found; commit fixes if any.

**Interfaces:**
- Consumes: the complete app.
- Produces: verified working software.

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: 4 test files, all tests pass.

- [ ] **Step 2: Production build**

Run: `npm run build && npm run preview` (preview in background)
Expected: build clean; `http://localhost:4173` serves the app identically to dev.

- [ ] **Step 3: Watch a full transition**

With the page open, wait for second :50 of the current minute (check a real clock). Confirm:
1. At :50 every hand — including margin clocks — begins sweeping clockwise.
2. Motion eases in, cruises, eases out; no hand jumps or reverses.
3. At :00 exactly, the grid is frozen on the new minute's digits and holds.
4. Let it run past an hour-digit change if convenient (e.g. x:59 → next hour) and confirm the hour digits update.

If anything fails: diagnose using superpowers:systematic-debugging, fix, re-run `npm test` and `npm run build`, and commit the fix with an explanatory message.

- [ ] **Step 4: Final commit (only if fixes were made)**

```bash
git add -A
git commit -m "fix: <describe what was fixed>

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
