# A Million Times Phase 2.2: Pattern Changes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace unison with corner-fired ripple trains, replace scissors with a moving-center gravity spiral, and double bloom's wander speed.

**Architecture:** All changes live in `src/core/choreography.ts` plus a one-line pass-through in `timeline.ts`: the `Choreography` type gains a fourth `minuteIndex` parameter (corner selection needs a per-minute seed), `choreographyPose` forwards it, and two catalog slots get new pure functions. Engine, interludes, renderer untouched.

**Tech Stack:** Existing Vite + TypeScript strict + Vitest project. Zero new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-08-pattern-changes-design.md`

**Branch note:** Execute on a fresh branch (`feature/pattern-changes`) created from main AFTER `feature/time-interludes` merges.

## Global Constraints

- Zero runtime dependencies; TypeScript strict; `npm run build` must pass at every commit.
- `Choreography = (col, row, t, minuteIndex) => HandAngles`; `choreographyPose(minuteIndex, t)` signature unchanged (timeline tests unaffected).
- Catalog order and length preserved: `[wave, cornerWaves, spiral, bloom, cascade]`; hash-mapping anchors (`pickChoreography(0/1) === CATALOG[0]`, `(7) === CATALOG[3]`) remain valid.
- Corner waves: 6 s episodes, `k = floor(t/6)`, `tₑ = t − 6k`; corners `0→(0,0), 1→(23,0), 2→(0,11), 3→(23,11)`; sequence `c(m,0) = hash(m·13+1) % 4`, `c(m,k) = (c(m,k−1) + 1 + hash(m·13+1+k) % 3) % 4`; pose `mod360(225 + 60·sin²(π·tₑ/6)·sin(2π·(0.8·tₑ − d/5)))`, fused hands, `d` = Euclidean distance from the firing corner.
- Spiral: `cx = 11.5 + 8·sin(0.35t)`, `cy = 5.5 + 3.5·cos(0.23t)`, `θ = mod360(angleToward(cx−col, cy−row) + 90·e^(−d/7) + SPIRAL_SWIRL_DEG_PER_S·t)` with `SPIRAL_SWIRL_DEG_PER_S = 24`; hands `[θ, θ+180]`.
- Bloom frequencies: `0.40` / `0.26` (amplitudes unchanged; `t = 0` anchor `[90, 270]` at cell (11, 9) unchanged).
- All angles normalized `[0, 360)` via `mod360`.
- End every commit message with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

## File Structure

```
src/core/choreography.ts     (modify)  type change, waveCorner, cornerWaves, spiral, faster bloom
src/core/timeline.ts         (modify)  one line: pass minuteIndex as pieces' 4th argument
tests/choreography.test.ts   (rewrite) updated anchors + waveCorner property tests
```

---

### Task 1: New patterns and contract change

**Files:**
- Modify: `src/core/choreography.ts`
- Modify: `src/core/timeline.ts` (one line in `choreographyPose`)
- Rewrite: `tests/choreography.test.ts`

**Interfaces:**
- Consumes: existing `mod360` from `./angles`, `HandAngles` from `./types`; `choreographyPose` in `timeline.ts` (already holds `minuteIndex`).
- Produces: `Choreography` type with 4th param `minuteIndex: number`; new exports `waveCorner(minuteIndex: number, episode: number): number` and `SPIRAL_SWIRL_DEG_PER_S = 24`; `CATALOG` slots 1 and 2 replaced (`cornerWaves`, `spiral`); all other exports unchanged.

Note: the type change and the `timeline.ts` pass-through must land in the same commit — pieces with four parameters cannot be called with three, so the build breaks if split.

- [ ] **Step 1: Rewrite the test file — `tests/choreography.test.ts`** (replace entire contents)

```ts
import { describe, expect, it } from 'vitest';
import { angleToward, CATALOG, pickChoreography, waveCorner } from '../src/core/choreography';

const MI = 29_000_000; // arbitrary fixed minute index

describe('angleToward', () => {
  it('maps cardinal grid directions to hand angles', () => {
    expect(angleToward(0, -1)).toBe(0);
    expect(angleToward(1, 0)).toBe(90);
    expect(angleToward(0, 1)).toBe(180);
    expect(angleToward(-1, 0)).toBe(270);
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
            const [a, b] = piece(col, row, t, MI);
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

  it('pins the hash-to-piece mapping', () => {
    expect(pickChoreography(0)).toBe(CATALOG[0]); // hash(0) = 0
    expect(pickChoreography(1)).toBe(CATALOG[0]); // hash(1) % 5 = 0
    expect(pickChoreography(7)).toBe(CATALOG[3]); // hash(7) % 5 = 3
  });
});

describe('waveCorner', () => {
  it('stays in range and never repeats the previous corner', () => {
    for (let m = 0; m < 100; m++) {
      let prev = waveCorner(m, 0);
      expect(prev).toBeGreaterThanOrEqual(0);
      expect(prev).toBeLessThanOrEqual(3);
      for (let k = 1; k <= 6; k++) {
        const c = waveCorner(m, k);
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(3);
        expect(c).not.toBe(prev);
        prev = c;
      }
    }
  });

  it('is deterministic', () => {
    expect(waveCorner(MI, 3)).toBe(waveCorner(MI, 3));
  });
});

describe('formula anchors', () => {
  it('pins wave, bloom, cascade to exact known values', () => {
    const [wave, , , bloom, cascade] = CATALOG;
    expect(wave(1, 0, 0, MI)).toEqual([18, 18]);       // (col + row/2) * 18
    expect(bloom(11, 9, 0, MI)).toEqual([90, 270]);    // attractor at (11.5, 9) is due east at t=0
    expect(cascade(0, 5, 0, MI)).toEqual([180, 180]);  // row not yet started
    expect(cascade(0, 0, 1, MI)).toEqual([220, 220]);  // 180 + t * 40
  });

  it('rests corner waves exactly at every episode boundary', () => {
    const cornerWaves = CATALOG[1];
    for (const t of [0, 6, 12]) {
      for (const [col, row] of [[0, 0], [23, 11], [12, 5]] as const) {
        expect(cornerWaves(col, row, t, MI)).toEqual([225, 225]);
        expect(cornerWaves(col, row, t, MI + 17)).toEqual([225, 225]);
      }
    }
  });

  it('pins the spiral to a precomputed center-adjacent value', () => {
    // t=0: center (11.5, 9); cell (11, 9): angleToward = 90, d = 0.5,
    // theta = 90 + 90 * exp(-0.5 / 7) = 173.795650173...
    const spiral = CATALOG[2];
    const [a, b] = spiral(11, 9, 0, MI);
    expect(a).toBeCloseTo(173.795650173, 6);
    expect(b).toBeCloseTo(353.795650173, 6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/choreography.test.ts`
Expected: FAIL — `waveCorner` is not exported; anchor mismatches against the old unison/scissors.

- [ ] **Step 3: Rewrite `src/core/choreography.ts`** (replace entire contents)

```ts
import { mod360 } from './angles';
import type { HandAngles } from './types';

/** t = seconds since the choreography clock started at :12 (0 <= t <= 38; the gather freezes t = 38). */
export type Choreography = (col: number, row: number, t: number, minuteIndex: number) => HandAngles;

/** Grid-space direction (x right, y down) to hand angle (0 = up, clockwise). */
export function angleToward(dx: number, dy: number): number {
  return mod360(90 - (Math.atan2(-dy, dx) * 180) / Math.PI);
}

/** Integer hash (Mueller hash32 variant, constant 0x45d9f3b), pinned by the spec. */
export function hash(n: number): number {
  let h = n >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

const EPISODE_S = 6;
const WAVE_CORNERS = [
  [0, 0],
  [23, 0],
  [0, 11],
  [23, 11],
] as const;

/** Corner (0-3) firing during the given episode; never repeats the previous episode's corner. */
export function waveCorner(minuteIndex: number, episode: number): number {
  let c = hash(minuteIndex * 13 + 1) % 4;
  for (let k = 1; k <= episode; k++) {
    c = (c + 1 + (hash(minuteIndex * 13 + 1 + k) % 3)) % 4;
  }
  return c;
}

export const SPIRAL_SWIRL_DEG_PER_S = 24;

/** Fused needle, traveling ripple across the wall. */
const wave: Choreography = (col, row, t, _minuteIndex) => {
  const a = mod360(t * 24 + (col + row / 2) * 18);
  return [a, a];
};

/** Ripple trains radiating from a different corner each 6 s episode. */
const cornerWaves: Choreography = (col, row, t, minuteIndex) => {
  const episode = Math.floor(t / EPISODE_S);
  const te = t - episode * EPISODE_S;
  const [ccol, crow] = WAVE_CORNERS[waveCorner(minuteIndex, episode)];
  const d = Math.hypot(col - ccol, row - crow);
  const amplitude = 60 * Math.sin((Math.PI * te) / EPISODE_S) ** 2;
  const a = mod360(225 + amplitude * Math.sin(2 * Math.PI * (0.8 * te - d / 5)));
  return [a, a];
};

/** Whirlpool field around a wandering center: circulation near, radial infall far. */
const spiral: Choreography = (col, row, t, _minuteIndex) => {
  const cx = 11.5 + 8 * Math.sin(0.35 * t);
  const cy = 5.5 + 3.5 * Math.cos(0.23 * t);
  const d = Math.hypot(cx - col, cy - row);
  const theta = mod360(
    angleToward(cx - col, cy - row) + 90 * Math.exp(-d / 7) + SPIRAL_SWIRL_DEG_PER_S * t,
  );
  return [theta, mod360(theta + 180)];
};

/** Full lines aimed at an attractor drifting on a Lissajous path. */
const bloom: Choreography = (col, row, t, _minuteIndex) => {
  const cx = 11.5 + 8 * Math.sin(0.4 * t);
  const cy = 5.5 + 3.5 * Math.cos(0.26 * t);
  const theta = angleToward(cx - col, cy - row);
  return [theta, mod360(theta + 180)];
};

/** Rows spin up one after another, a domino sweep down the wall. */
const cascade: Choreography = (_col, row, t, _minuteIndex) => {
  const a = mod360(180 + Math.max(0, t * 40 - row * 30));
  return [a, a];
};

export const CATALOG: readonly Choreography[] = [wave, cornerWaves, spiral, bloom, cascade];

export function pickChoreography(minuteIndex: number): Choreography {
  return CATALOG[hash(minuteIndex) % CATALOG.length];
}
```

- [ ] **Step 4: Update `src/core/timeline.ts`** — in `choreographyPose`, change the single line:

```ts
      pose.push(piece(col, row, t));
```

to:

```ts
      pose.push(piece(col, row, t, minuteIndex));
```

- [ ] **Step 5: Run test to verify it passes, then full suite + build**

Run: `npx vitest run tests/choreography.test.ts`
Expected: PASS — 11 tests green.

Run: `npm test`
Expected: 6 files, 53 tests, all passing (angles 8, font 4, layout 10, interlude 3, choreography 11, timeline 17). Timeline and interlude tests pass untouched — `choreographyPose`'s signature is unchanged.

Run: `npm run build`
Expected: `tsc` and `vite build` clean.

- [ ] **Step 6: Commit**

```bash
git add src/core/choreography.ts src/core/timeline.ts tests/choreography.test.ts
git commit -m "feat: corner-wave and gravity-spiral patterns, faster bloom

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: End-to-end visual verification

**Files:**
- No new files. Fix anything found; commit fixes if any.

- [ ] **Step 1: Full suite and production build**

Run: `npm test`
Expected: 6 files, 53 tests, all pass.

Run: `npm run build && npm run preview` (preview in background, port 4173 — do NOT touch the user's dev server on 5173)
Expected: clean build, serves at `http://localhost:4173`.

- [ ] **Step 2: Watch several minutes in the browser**

Observe up to 5 consecutive minutes' choreography windows (:14–:50), identifying each minute's piece. Verify whichever of these appear (at least one of the two NEW pieces must be observed working; unit anchors cover the formulas — this check is about the look):

1. **Corner waves:** concentric ripple bands radiating from a corner; roughly every 6 s the source switches to a DIFFERENT corner; the board passes through visible stillness at each handoff.
2. **Gravity spiral:** a swirling vortex — curved field lines circulating near a center that wanders the board; continuous churn.
3. **Bloom:** the needle field's focal point noticeably tours the wall faster than before (crosses a substantial portion of the board within one window).
4. **Unchanged framing:** :00 hold, :12 dissolve, interludes at :20/:30/:40, :50 gather all still behave.

If after 5 minutes neither new piece has appeared by luck of the hash, check which minutes select them (`node -e` with the pinned hash, index 1 = cornerWaves, 2 = spiral, seed = minute count `Math.floor(Date.now()/60000)`) and wait for the nearest one rather than watching blind.

- [ ] **Step 3: Fix or finish**

If anything fails: diagnose with superpowers:systematic-debugging, fix minimally, re-run `npm test` and `npm run build`, commit with an explanatory message ending in the trailer:

```bash
git add -A
git commit -m "fix: <describe what was fixed>

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

If nothing fails, make no commits. Kill the preview server (only) either way.
