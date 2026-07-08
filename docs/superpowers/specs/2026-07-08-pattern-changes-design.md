# A Million Times — Phase 2.2: Pattern Changes — Design

**Date:** 2026-07-08
**Status:** Approved
**Builds on:** `2026-07-08-choreography-design.md` and `2026-07-08-time-interludes-design.md`

## Overview

Three catalog changes: **unison** (boring to watch) is replaced by **corner waves** — ripple trains radiating from a randomly-selected corner, a different corner each episode; **scissors** is replaced by a **gravity spiral** — a whirlpool field around a wandering center (bloom's mechanism with curved field lines); and **bloom**'s magnet tours the wall twice as fast. Everything else — engine, timeline, interludes, wave, cascade — is untouched.

## Contract change: pieces receive the minute seed

Corner selection needs per-minute randomness, so the `Choreography` type gains a fourth parameter:

```ts
/** t = seconds since the choreography clock started at :12 (0 <= t <= 38; the gather freezes t = 38). */
export type Choreography = (col: number, row: number, t: number, minuteIndex: number) => HandAngles;
```

`choreographyPose(minuteIndex, t)` in `timeline.ts` already holds `minuteIndex` and passes it through as the fourth argument. Pieces that don't need it take it as `_minuteIndex`. `choreographyPose`'s own signature is unchanged, so all timeline tests and call sites are unaffected.

## Corner waves (replaces `unison`, catalog slot 1)

The 38 s window divides into 6 s episodes, `k = Math.floor(t / 6)` (k = 0…6; the last is truncated by the gather, which is fine — the gather sweeps from wherever the pose is). Episode-local time `tₑ = t − 6k`.

**Corner sequence** (deterministic, never repeats the previous corner):

```
corner index → grid coords: 0 → (0, 0), 1 → (23, 0), 2 → (0, 11), 3 → (23, 11)
c(m, 0) = hash(m * 13 + 1) % 4
c(m, k) = (c(m, k−1) + 1 + hash(m * 13 + 1 + k) % 3) % 4     for k ≥ 1
```

Exported as `waveCorner(minuteIndex: number, episode: number): number` (used internally and by tests). The `* 13 + 1` domain-separates these seeds from piece selection (`hash(m)`) and interlude placement (`hash(m * 3 + slot)`).

**Per-clock pose** (fused needle rocking about the rest diagonal):

```
d = √((col − ccol)² + (row − crow)²)          // grid units from the firing corner
A(tₑ) = 60 · sin²(π · tₑ / 6)                  // degrees; 0 at both episode ends
angle = mod360(225 + A(tₑ) · sin(2π · (0.8 · tₑ − d / 5)))
hands = [angle, angle]
```

Wavelength 5 grid units (≈5 crests visible across the board), phase speed 4 units/s, radiating outward. The sin² envelope guarantees every clock is at exact rest `[225, 225]` at `tₑ = 0` — corner handoffs, the dissolve entry, and episode boundaries are all seamless by construction.

## Gravity spiral (replaces `scissors`, catalog slot 2)

Bloom's moving-attractor mechanism with a whirlpool field instead of straight infall:

```
cx = 11.5 + 8 · sin(0.35 · t)                 // center wanders faster than bloom's
cy = 5.5 + 3.5 · cos(0.23 · t)
d = √((cx − col)² + (cy − row)²)
θ = mod360(angleToward(cx − col, cy − row) + 90 · e^(−d / 7) + 24 · t)
hands = [θ, mod360(θ + 180)]
```

Near the center the twist term approaches 90° (pure circulation); far away it decays toward radial infall — a gravity well / drain vortex. The `24 · t` term is a slow continuous swirl so the vortex churns even when the center lingers; it is a single named constant (`SPIRAL_SWIRL_DEG_PER_S = 24`) and may be set to 0 later if drift-only motion is preferred.

## Faster bloom

Frequencies double, amplitudes and structure unchanged:

```
cx = 11.5 + 8 · sin(0.40 · t)      // was 0.20
cy = 5.5 + 3.5 · cos(0.26 · t)     // was 0.13
```

At `t = 0` the center is still `(11.5, 9.0)`, so the existing `bloom(11, 9, 0) → [90, 270]` anchor value is unchanged (signature gains the ignored fourth argument).

## Catalog

Order and length preserved — `[wave, cornerWaves, spiral, bloom, cascade]`. The hash-to-piece mapping anchors (`pickChoreography(0) === CATALOG[0]`, `(1) === CATALOG[0]`, `(7) === CATALOG[3]`) remain valid.

## Testing

**Updated in `tests/choreography.test.ts`:**
- All existing piece calls gain the fourth `minuteIndex` argument (the normalization sweep uses a fixed arbitrary minute).
- The `unison` and `scissors` formula anchors are removed, replaced by:
  - **Corner waves:** exact rest `[225, 225]` at `t = 0, 6, 12` for several (col, row) cells and two different minutes; `waveCorner` range is 0–3 and never equals its predecessor across episodes 1–6 for minutes 0–99; `waveCorner` is deterministic.
  - **Spiral:** one precomputed cell anchor (exact expected value computed at plan time with the pinned formula, asserted with `toBeCloseTo(…, 6)`), plus a `t = 0` center-adjacent direction sanity check.
- Wave, cascade, bloom anchors keep their existing expected values (fourth argument added).
- Normalization sweep unchanged in spirit: all pieces return finite angles in `[0, 360)` across the (col, row, t) grid.

**Unchanged:** all timeline tests (`choreographyPose(minuteIndex, t)` signature is identical), interlude tests, layout tests, angle tests, and the hash-mapping anchors.

## Sequencing

Implemented as a fresh branch after `feature/time-interludes` completes its final review and merges. This spec commits on the current branch and flows to main with that merge; the phase 2.1 final-review diff range is pinned to its last code commit so this document does not pollute that review.

## Out of scope

- Changes to wave or cascade.
- Tuning UI; any further parameter changes are single-constant edits invited after live viewing.
