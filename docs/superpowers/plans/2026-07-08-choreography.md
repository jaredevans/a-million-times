# A Million Times Phase 2: Choreography — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Between the legible hold and the :50 gather, the 288-clock grid runs one deterministic choreographed piece per minute (wave, unison, scissors, bloom, or cascade), dissolving out of the digits and gathering back into the next minute's time.

**Architecture:** Choreographies are pure functions `(col, row, t) → HandAngles`; the timeline gains hold/dissolve/choreography segments while remaining a pure function of wall-clock time. One new core module (`choreography.ts`), one modified (`timeline.ts`); renderer, layout, font, angles, and main.ts untouched.

**Tech Stack:** Existing Vite + TypeScript strict + Vitest project. Zero new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-08-choreography-design.md`

## Global Constraints

- Zero runtime dependencies; TypeScript strict; `npm run build` (`tsc && vite build`) must pass at every commit.
- Angles in degrees, `0°` = 12 o'clock, clockwise, normalized `[0, 360)` (apply `mod360`).
- Minute timeline (second-of-minute `sec`): hold `[0, 12)` = frozen digits; dissolve `[12, 14)` = blend digits → live choreography; choreography `[14, 50)`; gather `[50, 60)` = v1 transition starting from the choreography at exactly `sec = 50`.
- Choreography clock starts at :12: `t = sec − 12`, so `t ∈ [0, 38)`; the gather freezes it at `t = 38`.
- New constants: `HOLD_S = 12`, `DISSOLVE_S = 2`. Existing `TRANSITION_START_S = 50`, `TRANSITION_DURATION_S = 10`, `INTRO_MS = 3000`, `INTRO_CUTOFF_S` (derived) unchanged.
- Selection: `CATALOG[hash(minuteIndex) % CATALOG.length]` with `minuteIndex = Math.floor(nowMs / 60_000)` and the exact lowbias32-style hash from the spec.
- Intro sweep rule unchanged from v1 (3 s from `NEUTRAL_POSE` toward the current — possibly moving — pose; skipped when load's second-of-minute > 47; never applied during the gather).
- Grid: 24 cols × 12 rows, row-major (`index = row * 24 + col`).
- End every commit message with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

## File Structure

```
src/core/choreography.ts    (new)      Choreography type, angleToward, hash, 5 pieces, CATALOG, pickChoreography
src/core/timeline.ts        (modify)   HOLD_S/DISSOLVE_S, choreographyPose(), segment branches in poseAt()
tests/choreography.test.ts  (new)
tests/timeline.test.ts      (rewrite)  v1 mid-minute assertions deliberately replaced per spec
```

---

### Task 1: Choreography catalog (`src/core/choreography.ts`)

**Files:**
- Create: `src/core/choreography.ts`
- Test: `tests/choreography.test.ts`

**Interfaces:**
- Consumes: `mod360(deg: number): number` from `src/core/angles.ts`; `HandAngles` from `src/core/types.ts`.
- Produces (all exported from `src/core/choreography.ts`):
  - `type Choreography = (col: number, row: number, t: number) => HandAngles`
  - `angleToward(dx: number, dy: number): number` — grid-space vector (x right, y down) → hand angle
  - `hash(n: number): number` — deterministic uint32 hash
  - `CATALOG: readonly Choreography[]` — exactly 5 pieces, order: wave, unison, scissors, bloom, cascade
  - `pickChoreography(minuteIndex: number): Choreography`

- [ ] **Step 1: Write the failing test — `tests/choreography.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { angleToward, CATALOG, pickChoreography } from '../src/core/choreography';

describe('angleToward', () => {
  it('maps cardinal grid directions to hand angles', () => {
    expect(angleToward(0, -1)).toBe(0);   // up
    expect(angleToward(1, 0)).toBe(90);   // right
    expect(angleToward(0, 1)).toBe(180);  // down
    expect(angleToward(-1, 0)).toBe(270); // left
  });
});

describe('catalog', () => {
  it('has five pieces', () => {
    expect(CATALOG).toHaveLength(5);
  });

  it('returns normalized finite angles across the grid and time range', () => {
    for (const piece of CATALOG) {
      for (let col = 0; col < 24; col += 3) {
        for (let row = 0; row < 12; row += 3) {
          for (let t = 0; t < 38; t += 1.7) {
            const [a, b] = piece(col, row, t);
            for (const angle of [a, b]) {
              expect(Number.isFinite(angle)).toBe(true);
              expect(angle).toBeGreaterThanOrEqual(0);
              expect(angle).toBeLessThan(360);
            }
          }
        }
      }
    }
  });
});

describe('pickChoreography', () => {
  it('is deterministic per minute', () => {
    expect(pickChoreography(12345)).toBe(pickChoreography(12345));
    expect(pickChoreography(0)).toBe(pickChoreography(0));
  });

  it('plays every piece within a window of consecutive minutes', () => {
    const seen = new Set<unknown>();
    for (let m = 0; m < 1000; m++) seen.add(pickChoreography(m));
    expect(seen.size).toBe(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/choreography.test.ts`
Expected: FAIL — cannot resolve `../src/core/choreography`.

- [ ] **Step 3: Write `src/core/choreography.ts`**

```ts
import { mod360 } from './angles';
import type { HandAngles } from './types';

/** t = seconds since the choreography clock started at :12 (0 <= t < 38). */
export type Choreography = (col: number, row: number, t: number) => HandAngles;

/** Grid-space direction (x right, y down) to hand angle (0 = up, clockwise). */
export function angleToward(dx: number, dy: number): number {
  return mod360(90 - (Math.atan2(-dy, dx) * 180) / Math.PI);
}

/** lowbias32-style integer hash, pinned by the spec. */
export function hash(n: number): number {
  let h = n >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** Fused needle, traveling ripple across the wall. */
const wave: Choreography = (col, row, t) => {
  const a = mod360(t * 24 + (col + row / 2) * 18);
  return [a, a];
};

/** Full parallel lines rotating as one. */
const unison: Choreography = (_col, _row, t) => {
  const a = mod360(t * 12);
  return [a, mod360(a + 180)];
};

/** Synchronized counter-rotation: the grid pulses between lines and chevrons. */
const scissors: Choreography = (_col, _row, t) => {
  return [mod360(90 + t * 30), mod360(90 - t * 30)];
};

/** Full lines aimed at an attractor drifting on a slow Lissajous path. */
const bloom: Choreography = (col, row, t) => {
  const cx = 11.5 + 8 * Math.sin(0.2 * t);
  const cy = 5.5 + 3.5 * Math.cos(0.13 * t);
  const theta = angleToward(cx - col, cy - row);
  return [theta, mod360(theta + 180)];
};

/** Rows spin up one after another, a domino sweep down the wall. */
const cascade: Choreography = (_col, row, t) => {
  const a = mod360(180 + Math.max(0, t * 40 - row * 30));
  return [a, a];
};

export const CATALOG: readonly Choreography[] = [wave, unison, scissors, bloom, cascade];

export function pickChoreography(minuteIndex: number): Choreography {
  return CATALOG[hash(minuteIndex) % CATALOG.length];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/choreography.test.ts`
Expected: PASS — 5 tests green.

- [ ] **Step 5: Run the full suite and typecheck**

Run: `npm test`
Expected: all existing suites still green (this task touches nothing they use).

Run: `npx tsc`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/core/choreography.ts tests/choreography.test.ts
git commit -m "feat: choreography catalog with deterministic minute selection

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Timeline segments (`src/core/timeline.ts` + test rewrite)

**Files:**
- Modify: `src/core/timeline.ts` (full replacement below)
- Rewrite: `tests/timeline.test.ts` (full replacement below — v1 mid-minute assertions are deliberately replaced per the spec's "Updated v1 timeline tests" section)

**Interfaces:**
- Consumes: `pickChoreography(minuteIndex: number): Choreography` from `./choreography` (Task 1); `interpolateHand` from `./angles`; `COLS`, `ROWS`, `NEUTRAL_POSE`, `poseForTime` from `./layout`; `GridPose`, `HandAngles` from `./types`.
- Produces: existing exports unchanged in signature (`poseAt`, `interpolatePose`, all v1 constants) plus new exports `HOLD_S = 12`, `DISSOLVE_S = 2`, and `choreographyPose(minuteIndex: number, t: number): GridPose`. `src/main.ts` consumes only `poseAt` and needs no changes.

- [ ] **Step 1: Rewrite the test file — `tests/timeline.test.ts`** (replace entire contents)

Float-exactness note: every timestamp below is chosen so `sec − 12`, `(sec − 12) / 2`, and `(sec − 50) / 10` are exact in binary floating point (whole and half seconds), so `toEqual` deep-equality against independently-constructed expected poses is exact, not approximate.

```ts
import { describe, expect, it } from 'vitest';
import { NEUTRAL_POSE, poseForTime } from '../src/core/layout';
import { choreographyPose, interpolatePose, poseAt } from '../src/core/timeline';

const at = (h: number, m: number, s: number, ms = 0): number =>
  new Date(2026, 0, 15, h, m, s, ms).getTime();

const minuteIndexOf = (t: number): number => Math.floor(t / 60_000);

const LOAD = at(10, 20, 0); // long before every "now" below: intro never active

describe('poseAt', () => {
  it('holds the digit pose during the hold window', () => {
    expect(poseAt(at(10, 30, 5), LOAD)).toEqual(poseForTime(10, 30));
    expect(poseAt(at(10, 30, 11, 999), LOAD)).toEqual(poseForTime(10, 30));
  });

  it('blends digits toward the live choreography during the dissolve', () => {
    const now = at(10, 30, 13);
    const expected = interpolatePose(
      poseForTime(10, 30),
      choreographyPose(minuteIndexOf(now), 1),
      0.5,
    );
    expect(poseAt(now, LOAD)).toEqual(expected);
  });

  it('reaches the live choreography exactly when the dissolve ends', () => {
    const now = at(10, 30, 14);
    expect(poseAt(now, LOAD)).toEqual(choreographyPose(minuteIndexOf(now), 2));
  });

  it('plays the choreography during the performance window', () => {
    const now = at(10, 30, 25);
    expect(poseAt(now, LOAD)).toEqual(choreographyPose(minuteIndexOf(now), 13));
  });

  it('starts the gather from the choreography pose at :50', () => {
    const now = at(10, 30, 50);
    expect(poseAt(now, LOAD)).toEqual(choreographyPose(minuteIndexOf(now), 38));
  });

  it('sweeps from the choreography to the next digits at the gather midpoint', () => {
    const now = at(10, 30, 55);
    const expected = interpolatePose(
      choreographyPose(minuteIndexOf(now), 38),
      poseForTime(10, 31),
      0.5,
    );
    expect(poseAt(now, LOAD)).toEqual(expected);
  });

  it('lands on the next pose exactly on the minute', () => {
    expect(poseAt(at(10, 31, 0), LOAD)).toEqual(poseForTime(10, 31));
  });

  it('crosses the hour boundary', () => {
    expect(poseAt(at(11, 0, 0), LOAD)).toEqual(poseForTime(11, 0));
  });

  it('runs the intro sweep from neutral after load', () => {
    const load = at(10, 30, 5);
    const midIntro = poseAt(load + 1500, load);
    expect(midIntro[0][0]).toBeCloseTo(45, 10); // neutral margin clock halfway: 225 + 180
    expect(poseAt(load + 3000, load)).toEqual(poseForTime(10, 30));
  });

  it('blends the intro toward the moving pose when it overlaps the dissolve', () => {
    const load = at(10, 30, 11);
    const now = load + 1500; // :12.5 — mid-dissolve
    const dissolve = interpolatePose(
      poseForTime(10, 30),
      choreographyPose(minuteIndexOf(now), 0.5),
      0.25,
    );
    expect(poseAt(now, load)).toEqual(interpolatePose(NEUTRAL_POSE, dissolve, 0.5));
    expect(poseAt(load + 3000, load)).toEqual(choreographyPose(minuteIndexOf(load + 3000), 2));
  });

  it('runs the intro at exactly the 47s cutoff toward the live choreography', () => {
    const load = at(10, 30, 47);
    const now = load + 1500; // :48.5
    const expected = interpolatePose(
      NEUTRAL_POSE,
      choreographyPose(minuteIndexOf(now), 36.5),
      0.5,
    );
    expect(poseAt(now, load)).toEqual(expected);
  });

  it('skips the intro when fewer than 3s remain before the gather', () => {
    const load = at(10, 30, 48);
    expect(poseAt(load, load)).toEqual(choreographyPose(minuteIndexOf(load), 36));
  });

  it('joins an in-flight gather when loaded mid-transition', () => {
    const load = at(10, 30, 55);
    const expected = interpolatePose(
      choreographyPose(minuteIndexOf(load), 38),
      poseForTime(10, 31),
      0.5,
    );
    expect(poseAt(load, load)).toEqual(expected);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/timeline.test.ts`
Expected: FAIL — `choreographyPose` is not exported from `../src/core/timeline` (and behavioral assertions fail against v1 logic).

- [ ] **Step 3: Replace `src/core/timeline.ts`** (entire contents)

```ts
import { interpolateHand } from './angles';
import { pickChoreography } from './choreography';
import { COLS, NEUTRAL_POSE, poseForTime, ROWS } from './layout';
import type { GridPose, HandAngles } from './types';

export const HOLD_S = 12;
export const DISSOLVE_S = 2;
export const TRANSITION_START_S = 50;
export const TRANSITION_DURATION_S = 10;
export const INTRO_MS = 3000;
export const INTRO_CUTOFF_S = TRANSITION_START_S - INTRO_MS / 1000;

export function interpolatePose(from: GridPose, to: GridPose, p: number): GridPose {
  return from.map(
    ([a, b], i) => [interpolateHand(a, to[i][0], p), interpolateHand(b, to[i][1], p)] as const,
  );
}

/** The minute's choreography evaluated at t seconds past :12, as a full grid pose. */
export function choreographyPose(minuteIndex: number, t: number): GridPose {
  const piece = pickChoreography(minuteIndex);
  const pose: HandAngles[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      pose.push(piece(col, row, t));
    }
  }
  return pose;
}

/** The whole display is a pure function of wall-clock time. */
export function poseAt(nowMs: number, loadMs: number): GridPose {
  const now = new Date(nowMs);
  const sec = now.getSeconds() + now.getMilliseconds() / 1000;
  const minuteIndex = Math.floor(nowMs / 60_000);
  const digits = poseForTime(now.getHours(), now.getMinutes());

  if (sec >= TRANSITION_START_S) {
    const next = new Date(nowMs + 60_000);
    const target = poseForTime(next.getHours(), next.getMinutes());
    const start = choreographyPose(minuteIndex, TRANSITION_START_S - HOLD_S);
    return interpolatePose(start, target, (sec - TRANSITION_START_S) / TRANSITION_DURATION_S);
  }

  let current: GridPose;
  if (sec >= HOLD_S + DISSOLVE_S) {
    current = choreographyPose(minuteIndex, sec - HOLD_S);
  } else if (sec >= HOLD_S) {
    current = interpolatePose(
      digits,
      choreographyPose(minuteIndex, sec - HOLD_S),
      (sec - HOLD_S) / DISSOLVE_S,
    );
  } else {
    current = digits;
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
Expected: PASS — 13 tests green.

- [ ] **Step 5: Run the full suite and typecheck**

Run: `npm test`
Expected: 5 test files, 37 tests, all passing (angles 8, font 4, layout 7, choreography 5, timeline 13).

Run: `npm run build`
Expected: `tsc` and `vite build` clean.

- [ ] **Step 6: Commit**

```bash
git add src/core/timeline.ts tests/timeline.test.ts
git commit -m "feat: choreography segments in the minute timeline

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: End-to-end visual verification

**Files:**
- No new files. Fix anything found; commit fixes if any.

**Interfaces:**
- Consumes: the complete app (`src/main.ts` needed no changes — it only calls `poseAt`).
- Produces: verified working software.

- [ ] **Step 1: Full suite and production build**

Run: `npm test`
Expected: 5 files, 37 tests, all pass.

Run: `npm run build && npm run preview` (preview in background)
Expected: clean build; app serves at `http://localhost:4173`.

- [ ] **Step 2: Watch one full minute cycle in the browser**

Open `http://localhost:4173` and observe (use `date +%S` to time screenshots):

1. **Top of minute (:00–:12):** digits frozen and legible, matching `date +%H:%M` in 12-hour terms; margins at the 7:30 diagonal.
2. **Dissolve (~:12–:14):** the digits visibly melt into motion — no snap or jump at :12.
3. **Choreography (:14–:50):** the whole grid is in continuous coordinated motion (a ripple, parallel rotation, scissoring, a drifting bloom, or a row cascade — whichever piece this minute selected). No frozen clocks, no flicker.
4. **Gather (:50–:00):** at :50 the motion transforms into the unified clockwise sweep and lands exactly on the new minute's digits at :00.
5. **Reload mid-choreography:** refresh the page around :30 — after the 3 s intro sweep, the grid must be in the *same* choreography at the right phase (deterministic resume).

- [ ] **Step 3: Fix or finish**

If anything fails: diagnose with superpowers:systematic-debugging, fix minimally, re-run `npm test` and `npm run build`, and commit with an explanatory message ending in the trailer:

```bash
git add -A
git commit -m "fix: <describe what was fixed>

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

If nothing fails, make no commits. Kill the preview server either way.
