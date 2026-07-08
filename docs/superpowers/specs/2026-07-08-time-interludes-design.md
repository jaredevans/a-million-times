# A Million Times — Phase 2.1: Time Interludes — Design

**Date:** 2026-07-08
**Status:** Approved
**Builds on:** `2026-07-08-choreography-design.md` (phase 2, implemented and merged)

## Overview

During the choreography window, the current time surfaces three times per minute at a pseudo-random position: the 20×6 time block sweeps out of the dance, holds legible for 3 seconds while the rest of the grid keeps dancing around it, then sweeps back into the motion. Everything remains a pure function of wall-clock time — "random" placement is hash-seeded per interlude, so reloads resume identically.

## Decisions

| Topic | Decision |
|---|---|
| Rest of grid during hold | Keeps dancing — the time is an island of stillness |
| Schedule | Interludes start at :20, :30, :40; each is 1 s blend-in + 3 s hold + 1 s blend-out |
| Placement | Same 20×6 block as the main display, origin hash-seeded among 5×7 = 35 positions |
| Content | Current minute's time, same 12-hour format and digit font |
| Architecture | Compositing layer over the choreography pose; the five pieces are untouched |

## Schedule

Within the choreography branch (`sec ∈ [14, 50)`), interlude windows start at `S ∈ {20, 30, 40}` (slot index 0, 1, 2). Phases relative to S:

| Window | Phase | Block cells show |
|---|---|---|
| `[S, S+1)` | `in` | blend from live choreography toward the time block, `p = sec − S`, ease-in-out cubic |
| `[S+1, S+4)` | `hold` | the time block exactly |
| `[S+4, S+5)` | `out` | blend from the time block toward the live choreography, `p = sec − S − 4`, ease-in-out cubic |

Outside all windows: no interlude. The last window ends at :45, before the :50 gather. Cells outside the block rectangle always pass through the choreography pose **bit-identically** (no interpolation applied).

**Bit-exactness guards (spec'd up front, lesson from phase 2):** at `p === 0` the blend returns its source cell directly instead of passing it through `interpolateHand` (whose `mod360` is not a bit-exact identity on transcendental angles). Half-open windows make the `p = 1` edges exact by construction (`sec = S+1` is already `hold`; `sec = S+5` is already no-interlude).

## Placement

```
h = hash(minuteIndex * 3 + slot)     // hash = existing pinned hash from choreography.ts
originCol = h % 5                    // 0..4  (24 − 20)
originRow = Math.floor(h / 5) % 7    // 0..6  (12 − 6)
```

Block rectangle: cols `[originCol, originCol + 20)`, rows `[originRow, originRow + 6)`. Deterministic per (minute, slot); `minuteIndex * 3 + slot` stays far below 2³² for centuries.

## Time block content

`layout.ts` is generalized: new `poseForTimeAt(hours24, minutes, originCol, originRow): GridPose` — a full-grid pose, neutral everywhere, with the four digit glyphs stamped at block-relative column offsets `[0, 5, 11, 16]`. Existing `poseForTime(h, m)` becomes exactly `poseForTimeAt(h, m, 2, 3)`, so v1/v2 behavior is provably unchanged. Gap cells inside the block rectangle read from this pose as neutral — the time is framed cleanly. New exported constants: `DIGIT_BLOCK_COLS = 20`, `DIGIT_BLOCK_ROWS = 6`.

The interlude shows the current minute's time (`now.getHours()`, `now.getMinutes()` — the values `poseAt` already extracts).

## Code structure

```
src/core/interlude.ts   (new)      INTERLUDE_STARTS_S = [20, 30, 40], INTERLUDE_BLEND_S = 1,
                                   INTERLUDE_HOLD_S = 3,
                                   type Interlude = { phase: 'in' | 'hold' | 'out';
                                                      p: number; originCol: number; originRow: number },
                                   interludeAt(sec, minuteIndex): Interlude | null
src/core/layout.ts      (modify)   poseForTimeAt(); poseForTime() delegates with (2, 3)
src/core/timeline.ts    (modify)   choreography branch composes the interlude block over the base pose
```

`interlude.ts` imports `hash` from `./choreography`. Font, angles, choreography pieces, renderer, sprite, main.ts: untouched. Zero new dependencies.

## Interactions

- **Intro sweep:** unchanged; it wraps whatever composite pose is current (converging interpolation handles a load landing mid-interlude).
- **Dissolve / gather:** untouched — interlude windows exist only inside `[14, 50)` and end by :45.
- **Existing tests:** all 39 pass unchanged. The interlude windows `[20,25) ∪ [30,35) ∪ [40,45)` avoid every pinned timestamp; `:25` sits exactly on an exclusive closing boundary and remains pure choreography.

## Testing

**`interlude.ts`:**
- Schedule: `null` at 19.999, 25, 29, 45, 50; `in` with `p = 0` at 20; `hold` at 21, 22, 23.999; `out` with `p = 0` at 24, `p = 0.5` at 24.5.
- Placement: deterministic (same inputs → same origin); bounds over 300 consecutive (minute, slot) seeds (`originCol ∈ [0, 4]`, `originRow ∈ [0, 6]`).

**`layout.ts`:**
- `poseForTime(h, m)` deep-equals `poseForTimeAt(h, m, 2, 3)` (regression anchor).
- `poseForTimeAt(9, 5, 0, 0)`: glyph 9 stamped at grid index `0 * 24 + 5`; cells outside the block neutral.
- `poseForTimeAt(12, 34, 4, 6)`: glyph 1 at grid index `6 * 24 + 4` (extreme legal origin).

**`timeline.ts` additions (existing 13 tests unchanged):**
- `:20` exactly → whole pose equals the pure choreography pose (`p === 0` guard + pass-through).
- `:21` and `:22` → block cells equal the `poseForTimeAt` cells at the seeded origin; a non-block cell equals its `choreographyPose` value bit-exactly.
- `:24` → block cells still equal the time block (`out`, `p = 0`).
- `:25` → whole pose equals the pure choreography pose.
- `:20.5` → block cells equal `interpolateHand(base, block, 0.5)` (structural; note `interpolateHand` applies ease-in-out cubic internally — blends pass raw `p`).

## Out of scope

- Configurable schedule or hold duration.
- Interludes during the top-of-minute hold or gather (the time is already legible there).
