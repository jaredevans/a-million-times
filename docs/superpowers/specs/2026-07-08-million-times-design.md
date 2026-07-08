# A Million Times — Web Recreation — Design

**Date:** 2026-07-08
**Status:** Approved

## Overview

A browser recreation of the kinetic sculpture *A Million Times* by Humans since 1982: a 24×12 grid of 288 two-handed analog clocks whose hands act as line segments, forming digits that display the current local time. Ten seconds before each minute, every hand sweeps clockwise to resolve into the next minute's digits, arriving exactly as the minute ticks over.

## Decisions

| Topic | Decision |
|---|---|
| Stack | Vite `vanilla-ts`, TypeScript, zero runtime dependencies, Vitest for tests |
| Rendering | Single Canvas 2D element, full redraw each animation frame |
| Grid | 24 columns × 12 rows = 288 clocks |
| Time format | 12-hour, no AM/PM, no leading zero (blank leading digit for hours 1–9) |
| Hold behavior (v1) | Static: hands frozen in digit poses between transitions |
| Transition | 10 s clockwise sweep, ease-in-out cubic, exactly one extra full revolution |
| Visual style | White faces, black hands, light gallery-wall background |
| Phase 2 (deferred) | Full choreographies during the hold window; config UI |

## Core model: pose as a pure function of time

There is no accumulated animation state. Every frame computes `pose(now)` — 288 clocks × 2 hand angles — and draws it.

Timeline for each minute M:

- **[M+0 s, M+50 s) Hold:** hands sit at M's digit pose.
- **[M+50 s, M+60 s) Transition:** hands travel clockwise from M's pose to (M+1)'s pose, eased, arriving exactly at M+60 s.

The start pose of any transition is the previous minute's pose, which is deterministic, so the entire display state derives from the timestamp alone. Consequences:

- Backgrounded tabs self-correct on wake — no drift, no catch-up animation.
- Core logic is unit-testable by feeding in arbitrary timestamps.
- Phase 2 choreography plugs in as another pose source for the hold window without engine rework.

**Intro sweep on page load:** a 3 s sweep from the neutral pose to the current pose, using the same clockwise-plus-one-revolution travel rule and ease-in-out cubic easing as regular transitions. If fewer than 3 s remain before the next transition begins (load time later than M+47 s), skip the intro and snap directly into the timeline. If the page loads mid-transition, join the transition in flight (its pose is computable from the timestamp).

Time source: `Date.now()`, local time zone.

## Angle conventions

- Angles in degrees, `0°` = 12 o'clock, increasing clockwise, normalized to `[0, 360)`.
- **Neutral ("off") pose:** both hands at `225°` (pointing to 7:30) — used for margin clocks, gap clocks, and the blank leading hour digit.
- Both hands are rendered the same length so strokes connect seamlessly across adjacent clocks.

## Digit font and grid layout

Each digit occupies a **4-wide × 6-tall** block of clocks.

Column layout (24 total): `2 margin | 4 digit | 1 gap | 4 digit | 2 gap | 4 digit | 1 gap | 4 digit | 2 margin`. The wider center gap separates hours from minutes; there is no colon.

Row layout (12 total): `3 margin | 6 digit | 3 margin`.

Digits 0–9 plus blank are hand-authored data tables: for each of the 24 clocks in a block, a pair of hand angles. Strokes run through clock centers:

- Mid-stroke clock: hands opposed at 180° to form a straight line.
- Corner clock: hands at 90° tracing the bend.
- Stroke endpoint: both hands pointing the same direction, toward the single neighbor.
- Off-stroke clock within the block: neutral pose.

12-hour mapping: hours 1–12 (midnight and noon display 12:00), minutes zero-padded to two digits. Display slots: `[H1 H2 M1 M2]` where H1 is blank for hours 1–9.

## Transition animation

For each hand, travel is clockwise only with exactly one extra full revolution:

```
travel = ((target − start) mod 360) + 360      // mod yields [0, 360)
angle(p) = start + travel × easeInOutCubic(p)  // p = clamp((now − (M+50s)) / 10s, 0, 1)
```

A hand whose pose is unchanged between minutes still sweeps a full 360°, so the entire grid moves on every transition. All hands share the same easing and duration, arriving in unison. Maximum travel is under 720°.

## Rendering

- One full-viewport canvas, `devicePixelRatio`-aware; the grid is centered and scaled to fit while preserving its 2:1 aspect ratio.
- Clock visuals: warm off-white face, subtle bezel ring and drop shadow, matte black hands with rounded caps reaching nearly to the face edge, on a light warm-gray background.
- **Face sprite cache:** the static face (shadow + bezel + face) is pre-rendered to an offscreen canvas once per resize and blitted 288 times per frame; only hands are drawn as vectors each frame.
- Draw loop driven by `requestAnimationFrame`.

## Project structure

```
src/
  core/          (pure logic, fully unit-tested)
    font.ts        digit angle tables (0–9 + blank)
    layout.ts      composes 4 digit slots + neutrals into the 288-clock pose for a given time
    timeline.ts    pose(now): hold vs transition vs intro sweep, progress computation
    angles.ts      clockwise interpolation, easing, mod-360 helpers
  render/
    sprite.ts      cached clock-face sprite
    renderer.ts    canvas drawing
  main.ts          rAF loop, resize, visibility wiring
```

## Testing

Vitest, targeting `src/core/` exhaustively:

- **font:** tables exist for 0–9 + blank; every entry is 24 clocks × 2 angles; all angles normalized to `[0, 360)`.
- **layout:** blank leading digit for hours 1–9; 12:59 → 1:00 composition; midnight and noon → 12:00; neutral pose in margins and gaps.
- **timeline:** hold pose at arbitrary timestamps; transition begins exactly at M+50 s; arrival exactly at M+60 s; load mid-transition yields in-flight pose; intro-sweep skip rule near M+47 s.
- **angles:** travel is always in `[360, 720)`; angle at p=0 equals start; angle at p=1 equals target mod 360; easing monotonic.

Rendering is verified visually (run the app), not unit-tested.

## Error handling

- Canvas unsupported → plain-text message in the page body.
- Window resize → rebuild face sprite, recompute geometry, redraw.
- Tab sleep/visibility → no special handling needed; the pure-function model self-corrects.

## Out of scope (phase 2)

- Choreographed hold-window animations (waves, arcs — the real sculpture's idle behavior).
- Config UI (colors, format toggles), fullscreen control.
