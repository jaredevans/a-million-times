# A Million Times Phase 2.1: Time Interludes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** During the choreography window, the current time surfaces at :20, :30, and :40 at a hash-seeded random grid position — 1 s blend in, 3 s legible hold while the rest of the grid keeps dancing, 1 s blend out.

**Architecture:** A compositing layer over the choreography pose: `interludeAt(sec, minuteIndex)` (new pure module) answers whether an interlude is active and where; the timeline blends only the 20×6 time-block cells toward `poseForTimeAt` (a generalization of `poseForTime`) while all other cells pass through bit-identically. Pure function of wall-clock time throughout.

**Tech Stack:** Existing Vite + TypeScript strict + Vitest project. Zero new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-08-time-interludes-design.md`

## Global Constraints

- Zero runtime dependencies; TypeScript strict; `npm run build` (`tsc && vite build`) must pass at every commit.
- Interlude windows start at `S ∈ {20, 30, 40}`: `in` on `[S, S+1)` with `p = sec − S`; `hold` on `[S+1, S+4)`; `out` on `[S+4, S+5)` with `p = sec − S − 4`. Outside all windows: no interlude.
- Placement: `h = hash(minuteIndex * 3 + slot)`; `originCol = h % 5` (0–4), `originRow = Math.floor(h / 5) % 7` (0–6). `hash` is the existing pinned function from `src/core/choreography.ts`.
- Block rectangle: cols `[originCol, originCol + 20)`, rows `[originRow, originRow + 6)`; digit slot column offsets within the block are `[0, 5, 11, 16]`.
- Cells outside the rectangle pass through the choreography pose bit-identically (no interpolation).
- Bit-exactness guard: at `p === 0` a blend returns its source cell directly (never through `interpolateHand`, whose `mod360` is not a bit-exact identity on transcendental angles).
- `interpolateHand(start, target, p)` applies ease-in-out cubic internally — blends pass raw `p`, never pre-eased.
- The interlude shows the current minute's time (the `getHours()`/`getMinutes()` values `poseAt` already extracts); 12-hour format via the existing font/layout.
- All 39 existing tests must pass unchanged.
- Grid: 24 cols × 12 rows, row-major (`index = row * 24 + col`).
- End every commit message with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

## File Structure

```
src/core/layout.ts        (modify)  DIGIT_BLOCK_COLS/ROWS, poseForTimeAt(); poseForTime() delegates
src/core/interlude.ts     (new)     schedule constants, Interlude type, interludeAt()
src/core/timeline.ts      (modify)  choreography branch composes the interlude block over the base
tests/layout.test.ts      (modify)  append poseForTimeAt describe-block
tests/interlude.test.ts   (new)
tests/timeline.test.ts    (modify)  append time-interludes describe-block
```

---

### Task 1: Generalize layout to arbitrary block origins (`poseForTimeAt`)

**Files:**
- Modify: `src/core/layout.ts`
- Test: `tests/layout.test.ts` (append)

**Interfaces:**
- Consumes: existing `BLANK_GLYPH`, `DIGIT_GLYPHS`, `NEUTRAL` from `./font`; `GridPose`, `HandAngles` from `./types`.
- Produces (new exports from `src/core/layout.ts`, all existing exports unchanged):
  - `DIGIT_BLOCK_COLS = 20`, `DIGIT_BLOCK_ROWS = 6`
  - `poseForTimeAt(hours24: number, minutes: number, originCol: number, originRow: number): GridPose`
  - `poseForTime(h, m)` now returns exactly `poseForTimeAt(h, m, 2, 3)` — behavior unchanged.

- [ ] **Step 1: Write the failing test — append to `tests/layout.test.ts`**

Add `poseForTimeAt` to the existing layout import at the top of the file:

```ts
import {
  CLOCK_COUNT, COLS, DIGIT_COLS, DIGIT_ROW, NEUTRAL_POSE, poseForTime, poseForTimeAt, timeToDigits,
} from '../src/core/layout';
```

Append at the end of the file:

```ts
describe('poseForTimeAt', () => {
  it('matches poseForTime at the default origin', () => {
    expect(poseForTimeAt(12, 34, 2, 3)).toEqual(poseForTime(12, 34));
    expect(poseForTimeAt(9, 5, 2, 3)).toEqual(poseForTime(9, 5));
  });

  it('stamps the block at origin (0, 0)', () => {
    const pose = poseForTimeAt(9, 5, 0, 0);
    expect(pose[0 * COLS + 5]).toEqual(DIGIT_GLYPHS[9][0]); // slot 1 at block offset 5
    expect(pose[0 * COLS + 0]).toEqual(NEUTRAL);            // blank leading digit
    expect(pose[7 * COLS + 0]).toEqual(NEUTRAL);            // below the block
  });

  it('stamps the block at the extreme origin (4, 6)', () => {
    const pose = poseForTimeAt(12, 34, 4, 6);
    expect(pose[6 * COLS + 4]).toEqual(DIGIT_GLYPHS[1][0]);     // slot 0 glyph top-left
    expect(pose[11 * COLS + 23]).toEqual(DIGIT_GLYPHS[4][23]);  // slot 3 glyph bottom-right
    expect(pose[5 * COLS + 4]).toEqual(NEUTRAL);                // above the block
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/layout.test.ts`
Expected: FAIL — `poseForTimeAt` is not exported.

- [ ] **Step 3: Modify `src/core/layout.ts`**

Add the new constants after the `DIGIT_ROW` declaration:

```ts
/** The full time display: 4 digits + gaps, as one block. */
export const DIGIT_BLOCK_COLS = 20;
export const DIGIT_BLOCK_ROWS = 6;
/** Digit slot column offsets within the block (DIGIT_COLS relative to the block origin). */
const DIGIT_SLOT_OFFSETS = [0, 5, 11, 16] as const;
```

Replace the existing `poseForTime` function with:

```ts
/** Full-grid pose: neutral everywhere, the time block stamped at the given origin. */
export function poseForTimeAt(
  hours24: number,
  minutes: number,
  originCol: number,
  originRow: number,
): GridPose {
  const pose: HandAngles[] = Array.from({ length: CLOCK_COUNT }, () => NEUTRAL);
  timeToDigits(hours24, minutes).forEach((digit, slot) => {
    const glyph = digit === null ? BLANK_GLYPH : DIGIT_GLYPHS[digit];
    for (let gr = 0; gr < GLYPH_ROWS; gr++) {
      for (let gc = 0; gc < GLYPH_COLS; gc++) {
        pose[(originRow + gr) * COLS + originCol + DIGIT_SLOT_OFFSETS[slot] + gc] =
          glyph[gr * GLYPH_COLS + gc];
      }
    }
  });
  return pose;
}

export function poseForTime(hours24: number, minutes: number): GridPose {
  return poseForTimeAt(hours24, minutes, DIGIT_COLS[0], DIGIT_ROW);
}
```

(`DIGIT_COLS[0]` is 2 and `DIGIT_ROW` is 3; slot offsets 0/5/11/16 shifted by 2 reproduce `DIGIT_COLS = [2, 7, 13, 18]` exactly.)

- [ ] **Step 4: Run the full suite and typecheck**

Run: `npm test`
Expected: 5 files, 42 tests, all passing (39 existing + 3 new — the existing layout and timeline tests prove the refactor changed nothing).

Run: `npx tsc`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/core/layout.ts tests/layout.test.ts
git commit -m "feat: stamp the time block at arbitrary grid origins

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Interlude schedule and placement (`src/core/interlude.ts`)

**Files:**
- Create: `src/core/interlude.ts`
- Test: `tests/interlude.test.ts`

**Interfaces:**
- Consumes: `hash(n: number): number` from `./choreography`; `COLS`, `ROWS`, `DIGIT_BLOCK_COLS`, `DIGIT_BLOCK_ROWS` from `./layout` (Task 1).
- Produces (all exported from `src/core/interlude.ts`):
  - `INTERLUDE_STARTS_S = [20, 30, 40] as const`, `INTERLUDE_BLEND_S = 1`, `INTERLUDE_HOLD_S = 3`
  - `interface Interlude { phase: 'in' | 'hold' | 'out'; p: number; originCol: number; originRow: number }` (`p` is 0 during `hold`)
  - `interludeAt(sec: number, minuteIndex: number): Interlude | null`

- [ ] **Step 1: Write the failing test — `tests/interlude.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { interludeAt } from '../src/core/interlude';

const MI = 29_000_000; // arbitrary fixed minute index

describe('interludeAt', () => {
  it('returns null outside interlude windows', () => {
    expect(interludeAt(14, MI)).toBeNull();
    expect(interludeAt(19.999, MI)).toBeNull();
    expect(interludeAt(25, MI)).toBeNull();
    expect(interludeAt(29, MI)).toBeNull();
    expect(interludeAt(35, MI)).toBeNull();
    expect(interludeAt(45, MI)).toBeNull();
    expect(interludeAt(50, MI)).toBeNull();
  });

  it('walks the in/hold/out phases with exact progress', () => {
    expect(interludeAt(20, MI)).toMatchObject({ phase: 'in', p: 0 });
    expect(interludeAt(20.5, MI)).toMatchObject({ phase: 'in', p: 0.5 });
    expect(interludeAt(21, MI)).toMatchObject({ phase: 'hold', p: 0 });
    expect(interludeAt(23.999, MI)).toMatchObject({ phase: 'hold', p: 0 });
    expect(interludeAt(24, MI)).toMatchObject({ phase: 'out', p: 0 });
    expect(interludeAt(24.5, MI)).toMatchObject({ phase: 'out', p: 0.5 });
    expect(interludeAt(30, MI)).toMatchObject({ phase: 'in', p: 0 });
    expect(interludeAt(44.5, MI)).toMatchObject({ phase: 'out', p: 0.5 });
  });

  it('is deterministic and in bounds across 300 (minute, slot) seeds', () => {
    for (let m = 0; m < 100; m++) {
      for (const sec of [22, 32, 42]) {
        const a = interludeAt(sec, m);
        expect(a).toEqual(interludeAt(sec, m));
        expect(a).not.toBeNull();
        expect(a!.originCol).toBeGreaterThanOrEqual(0);
        expect(a!.originCol).toBeLessThanOrEqual(4);
        expect(a!.originRow).toBeGreaterThanOrEqual(0);
        expect(a!.originRow).toBeLessThanOrEqual(6);
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/interlude.test.ts`
Expected: FAIL — cannot resolve `../src/core/interlude`.

- [ ] **Step 3: Write `src/core/interlude.ts`**

```ts
import { hash } from './choreography';
import { COLS, DIGIT_BLOCK_COLS, DIGIT_BLOCK_ROWS, ROWS } from './layout';

export const INTERLUDE_STARTS_S = [20, 30, 40] as const;
export const INTERLUDE_BLEND_S = 1;
export const INTERLUDE_HOLD_S = 3;

const TOTAL_S = INTERLUDE_BLEND_S + INTERLUDE_HOLD_S + INTERLUDE_BLEND_S;
const COL_CHOICES = COLS - DIGIT_BLOCK_COLS + 1; // 5
const ROW_CHOICES = ROWS - DIGIT_BLOCK_ROWS + 1; // 7

export interface Interlude {
  phase: 'in' | 'hold' | 'out';
  /** Blend progress in [0, 1); 0 during hold. */
  p: number;
  originCol: number;
  originRow: number;
}

/** The active time interlude at this second of the minute, or null. */
export function interludeAt(sec: number, minuteIndex: number): Interlude | null {
  for (let slot = 0; slot < INTERLUDE_STARTS_S.length; slot++) {
    const local = sec - INTERLUDE_STARTS_S[slot];
    if (local < 0 || local >= TOTAL_S) continue;

    const h = hash(minuteIndex * INTERLUDE_STARTS_S.length + slot);
    const originCol = h % COL_CHOICES;
    const originRow = Math.floor(h / COL_CHOICES) % ROW_CHOICES;

    if (local < INTERLUDE_BLEND_S) {
      return { phase: 'in', p: local / INTERLUDE_BLEND_S, originCol, originRow };
    }
    if (local < INTERLUDE_BLEND_S + INTERLUDE_HOLD_S) {
      return { phase: 'hold', p: 0, originCol, originRow };
    }
    return {
      phase: 'out',
      p: (local - INTERLUDE_BLEND_S - INTERLUDE_HOLD_S) / INTERLUDE_BLEND_S,
      originCol,
      originRow,
    };
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes, then full suite + typecheck**

Run: `npx vitest run tests/interlude.test.ts`
Expected: PASS — 3 tests green.

Run: `npm test`
Expected: 6 files, 45 tests, all passing.

Run: `npx tsc`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/core/interlude.ts tests/interlude.test.ts
git commit -m "feat: interlude schedule with hash-seeded block placement

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Compose the interlude in the timeline

**Files:**
- Modify: `src/core/timeline.ts`
- Test: `tests/timeline.test.ts` (append; the existing 13 tests are untouched)

**Interfaces:**
- Consumes: `interludeAt`, `Interlude` from `./interlude` (Task 2); `poseForTimeAt`, `DIGIT_BLOCK_COLS`, `DIGIT_BLOCK_ROWS` from `./layout` (Task 1); existing `interpolateHand`, `choreographyPose`, and everything already in `timeline.ts`.
- Produces: no signature changes — `poseAt` now composes the interlude block during the choreography branch. `src/main.ts` needs no changes.

- [ ] **Step 1: Write the failing tests — append to `tests/timeline.test.ts`**

Update the imports at the top of the file:

```ts
import { interpolateHand } from '../src/core/angles';
import { interludeAt } from '../src/core/interlude';
import {
  COLS, DIGIT_BLOCK_COLS, DIGIT_BLOCK_ROWS, NEUTRAL_POSE, poseForTime, poseForTimeAt, ROWS,
} from '../src/core/layout';
```

(keep the existing `timeline` import line as is). Append at the end of the file:

```ts
describe('time interludes', () => {
  const mi = minuteIndexOf(at(10, 30, 22));

  const inBlock = (i: number, originCol: number, originRow: number): boolean => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    return (
      col >= originCol && col < originCol + DIGIT_BLOCK_COLS &&
      row >= originRow && row < originRow + DIGIT_BLOCK_ROWS
    );
  };

  it('leaves the pose purely choreographic at the interlude boundaries', () => {
    expect(poseAt(at(10, 30, 20), LOAD)).toEqual(choreographyPose(mi, 8));
    expect(poseAt(at(10, 30, 25), LOAD)).toEqual(choreographyPose(mi, 13));
  });

  it('holds the time block at its seeded position while the rest dances', () => {
    const il = interludeAt(22, mi)!;
    const block = poseForTimeAt(10, 30, il.originCol, il.originRow);
    const base = choreographyPose(mi, 10);
    const pose = poseAt(at(10, 30, 22), LOAD);
    for (let i = 0; i < ROWS * COLS; i++) {
      expect(pose[i]).toEqual(inBlock(i, il.originCol, il.originRow) ? block[i] : base[i]);
    }
  });

  it('keeps the block on the time across the whole hold, into the blend-out start', () => {
    const il = interludeAt(24, mi)!;
    const block = poseForTimeAt(10, 30, il.originCol, il.originRow);
    const i = il.originRow * COLS + il.originCol;
    expect(poseAt(at(10, 30, 21), LOAD)[i]).toEqual(block[i]); // hold begins
    expect(poseAt(at(10, 30, 24), LOAD)[i]).toEqual(block[i]); // blend-out p = 0
  });

  it('blends block cells with interpolateHand at the blend midpoint', () => {
    const il = interludeAt(20.5, mi)!;
    const block = poseForTimeAt(10, 30, il.originCol, il.originRow);
    const base = choreographyPose(mi, 8.5);
    const pose = poseAt(at(10, 30, 20, 500), LOAD);
    const i = il.originRow * COLS + il.originCol;
    expect(pose[i][0]).toBeCloseTo(interpolateHand(base[i][0], block[i][0], 0.5), 10);
    expect(pose[i][1]).toBeCloseTo(interpolateHand(base[i][1], block[i][1], 0.5), 10);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/timeline.test.ts`
Expected: FAIL — the three interlude-behavior tests fail (pose still equals pure choreography at :22, :24, :20.5); the boundary test may already pass.

- [ ] **Step 3: Modify `src/core/timeline.ts`**

Update the imports at the top:

```ts
import { interpolateHand } from './angles';
import { pickChoreography } from './choreography';
import { interludeAt, type Interlude } from './interlude';
import {
  COLS, DIGIT_BLOCK_COLS, DIGIT_BLOCK_ROWS, NEUTRAL_POSE, poseForTime, poseForTimeAt, ROWS,
} from './layout';
import type { GridPose, HandAngles } from './types';
```

Add this function after `choreographyPose`:

```ts
/** Overlay the time block on the choreography: block cells blend/hold, all others pass through. */
function composeInterlude(
  base: GridPose,
  il: Interlude,
  hours24: number,
  minutes: number,
): GridPose {
  const block = poseForTimeAt(hours24, minutes, il.originCol, il.originRow);
  return base.map((cell, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const inBlock =
      col >= il.originCol && col < il.originCol + DIGIT_BLOCK_COLS &&
      row >= il.originRow && row < il.originRow + DIGIT_BLOCK_ROWS;
    if (!inBlock) return cell;
    if (il.phase === 'hold') return block[i];
    const [from, to] = il.phase === 'in' ? [cell, block[i]] : [block[i], cell];
    if (il.p === 0) return from;
    return [interpolateHand(from[0], to[0], il.p), interpolateHand(from[1], to[1], il.p)] as const;
  });
}
```

In `poseAt`, replace the choreography branch:

```ts
  if (sec >= HOLD_S + DISSOLVE_S) {
    current = choreographyPose(minuteIndex, sec - HOLD_S);
  }
```

with:

```ts
  if (sec >= HOLD_S + DISSOLVE_S) {
    current = choreographyPose(minuteIndex, sec - HOLD_S);
    const il = interludeAt(sec, minuteIndex);
    if (il) {
      current = composeInterlude(current, il, now.getHours(), now.getMinutes());
    }
  }
```

Everything else in the file is unchanged.

- [ ] **Step 4: Run test to verify it passes, then full suite + build**

Run: `npx vitest run tests/timeline.test.ts`
Expected: PASS — 17 tests green (13 existing + 4 new).

Run: `npm test`
Expected: 6 files, 49 tests, all passing.

Run: `npm run build`
Expected: `tsc` and `vite build` clean.

- [ ] **Step 5: Commit**

```bash
git add src/core/timeline.ts tests/timeline.test.ts
git commit -m "feat: surface the time at random positions during choreography

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: End-to-end visual verification

**Files:**
- No new files. Fix anything found; commit fixes if any.

**Interfaces:**
- Consumes: the complete app.
- Produces: verified working software.

- [ ] **Step 1: Full suite and production build**

Run: `npm test`
Expected: 6 files, 49 tests, all pass.

Run: `npm run build && npm run preview` (preview in background)
Expected: clean build; app serves at `http://localhost:4173`.

- [ ] **Step 2: Watch the interludes in the browser**

Open `http://localhost:4173` and observe (use `date +%S` to time screenshots):

1. **~:22** — the current time is legible somewhere on the grid (position may be anywhere within the 5×7 origin range), while clocks outside the block keep dancing.
2. **~:26** — the block has melted back into the choreography; no frozen region remains.
3. **~:32 and ~:42** — the time appears again, and across the three interludes of a minute the positions vary (they may occasionally coincide; across two minutes at least two distinct positions must appear).
4. **Blends** — entering (:20–:21) and leaving (:24–:25) look like the sculpture's other transitions: sweeping hands, no snapping.
5. **Untouched behavior** — the :00 hold, :12 dissolve, and :50 gather still work as before.

- [ ] **Step 3: Fix or finish**

If anything fails: diagnose with superpowers:systematic-debugging, fix minimally, re-run `npm test` and `npm run build`, and commit with an explanatory message ending in the trailer:

```bash
git add -A
git commit -m "fix: <describe what was fixed>

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

If nothing fails, make no commits. Kill the preview server either way.
