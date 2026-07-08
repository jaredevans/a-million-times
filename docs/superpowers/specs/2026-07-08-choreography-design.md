# A Million Times — Phase 2: Choreography — Design

**Date:** 2026-07-08
**Status:** Approved
**Builds on:** `2026-07-08-million-times-design.md` (v1, implemented and merged)

## Overview

Phase 2 inverts the piece's character, matching the real sculpture: the wall becomes a kinetic artwork that once a minute becomes a clock. Between the legible hold at the top of each minute and the :50 gathering sweep, the 288 clocks run one deterministic choreographed piece — waves, unison rotation, scissoring, a drifting bloom, or a cascading spin-up.

The v1 architecture is preserved exactly: the display remains a pure function of wall-clock time. Choreographies are pure functions; nothing is simulated or stateful.

## Decisions

| Topic | Decision |
|---|---|
| Cycle balance | Art-first: time legible :00–:12 each minute, choreography :14–:50 |
| Engine | Pure angle functions `(col, row, t) → HandAngles`; no simulation, no keyframes |
| Catalog | Five pieces: wave, unison, scissors, bloom, cascade |
| Selection | Deterministic per minute: `catalog[hash(minuteIndex) % 5]` |
| Scope | No config UI, no new controls, no renderer changes |

## The minute timeline

Per minute M (seconds are the second-of-minute, fractional):

| Window | Segment | Behavior |
|---|---|---|
| `[0, 12)` | Hold | Frozen digit pose for M (v1 behavior) |
| `[12, 14)` | Dissolve | `interpolatePose(digitPose(M), choreoPose(now), (sec − 12) / 2)` — blend toward the **live** (moving) choreography pose |
| `[14, 50)` | Choreography | `choreoPose(now)` = piece for M evaluated at `t = sec − 12` |
| `[50, 60)` | Gather | v1 transition unchanged, except its start pose is the choreography evaluated at exactly `sec = 50` (`t = 38`): `interpolatePose(choreoAt50, digitPose(M+1), (sec − 50) / 10)` |

The choreography's clock starts at :12 (`t = sec − 12`, so `t ∈ [0, 38)`): the dissolve window crossfades from the frozen digits over the piece's opening two seconds, and the gather freezes it at `t = 38`.

New constants in `timeline.ts`: `HOLD_S = 12`, `DISSOLVE_S = 2`. Existing `TRANSITION_START_S = 50`, `TRANSITION_DURATION_S = 10`, `INTRO_MS`, `INTRO_CUTOFF_S` unchanged.

Continuity: the dissolve converges to the live choreography pose (position-continuous at :14 by construction). The gather is position-continuous at :50 because its start pose is the choreography's exact :50 pose; its ease-in masks the velocity kink. At :60 the gather lands exactly on M+1's digits (v1 property, unchanged).

**Intro sweep (load):** rule unchanged from v1 — 3 s interpolation from `NEUTRAL_POSE` toward the current pose, skipped when `loadSec > 47`. The current pose may now be moving (dissolve/choreography windows); the per-frame interpolation converges to the moving target. A load at e.g. :11 blends toward a pose that starts moving at :12 mid-intro; this is expected and covered by a test.

## Choreography contract

```ts
/** t = seconds since the choreography clock started at :12 (0 ≤ t < 38). */
export type Choreography = (col: number, row: number, t: number) => HandAngles;
```

- Must return angles normalized to `[0, 360)` (apply `mod360`).
- Must be pure and deterministic.
- Grid coordinates: col 0–23, row 0–11 (row-major grid as in v1).

## The catalog

All angles in degrees (0° = 12 o'clock, clockwise). Pacing is calm and stately.

1. **Wave** — fused needle, traveling ripple:
   `a = mod360(t·24 + (col + row/2)·18)`; returns `[a, a]`.
2. **Unison** — full parallel lines rotating as one:
   `a = mod360(t·12)`; returns `[a, mod360(a + 180)]`; identical for every clock.
3. **Scissors** — synchronized counter-rotation:
   returns `[mod360(90 + t·30), mod360(90 − t·30)]`.
4. **Bloom** — full lines aimed at a drifting attractor:
   center in grid units `cx = 11.5 + 8·sin(0.20·t)`, `cy = 5.5 + 3.5·cos(0.13·t)`;
   `θ = angleToward(cx − col, cy − row)`; returns `[θ, mod360(θ + 180)]`.
   `angleToward(dx, dy)` converts a grid-space vector (x right, y down) to our angle convention (0° up, clockwise): `mod360(90 − atan2(−dy, dx)·180/π)` — implemented once as a tested helper, not inline trig.
5. **Cascade** — rows spin up one after another, fused needle:
   `a = mod360(180 + max(0, t·40 − row·30))`; returns `[a, a]`.

## Selection

```ts
minuteIndex = Math.floor(nowMs / 60_000)   // pure minute count; DST-independent seed
pick = CATALOG[hash(minuteIndex) % CATALOG.length]
```

`hash` is the lowbias32-style integer hash, pinned exactly:

```ts
function hash(n: number): number {
  let h = n >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
```

This keeps consecutive minutes from cycling 0,1,2,3,4 predictably. The piece belongs to the minute being displayed, so it never switches mid-segment: dissolve, choreography, and gather within minute M's windows all use M's piece.

## Code structure

```
src/core/choreography.ts   (new)     Choreography type, angleToward, hash,
                                     CATALOG (5 pieces), pickChoreography(minuteIndex)
src/core/timeline.ts       (modified) HOLD_S, DISSOLVE_S; poseAt() segment branches;
                                     gather sources start pose from choreography at :50
```

Font, layout, angles, renderer, sprite, main.ts: untouched. Zero new dependencies.

## Testing

**Updated v1 timeline tests** (behavior deliberately changed):
- Hold assertion restricted to `[0, 12)`; at :25 the pose now equals the minute's choreography at `t = 13` (exact equality — deterministic).
- Transition-start test: pose at :50 equals the minute's choreography at `t = 38` (replaces "equals digit pose").
- Unchanged: landing exactly on M+1's digits at :00; intro sweep from neutral during the hold window; intro skip rule; in-flight transition join.

**New choreography tests:**
- Every catalog piece returns normalized `[0, 360)` angles across a sweep of (col, row, t) samples.
- `pickChoreography` is deterministic (same minute → same piece) and all five pieces appear within a window of consecutive minutes.
- `angleToward`: cardinal directions map correctly (up → 0, right → 90, down → 180, left → 270).

**New timeline boundary tests:**
- Pose at :11.999… equals the digit pose (hold end).
- Dissolve at `p = 1` (sec = 14) equals the live choreography pose at `t = 2`.
- Gather start pose (sec = 50) equals the choreography at `t = 38` exactly.
- Load at :11 (intro overlapping the :12 dissolve) produces normalized, finite angles and converges by load+3 s.

## Edge cases

- **DST / rollover:** display time still comes from `Date` (v1 logic untouched); the seed is a pure minute count, unaffected by wall-clock jumps.
- **Tab sleep / reload:** pure function of time — wakes mid-choreography at exactly the right frame.
- **Velocity kinks** at :14 and :50 are masked by convergent blending and ease-in respectively; position is continuous at every boundary by construction.

## Out of scope

- Config UI, mode toggles, fullscreen control.
- Additional choreographies beyond the five (the catalog is trivially extensible later).
- Sound, interactivity.
