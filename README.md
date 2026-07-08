# A Million Times

A web recreation of [*A Million Times*](https://clockforward.com/humans-since-1982/a-million-times/) by Humans since 1982 — a kinetic sculpture built from a grid of analog clocks whose hands sweep in unison to form patterns, and periodically align to spell out the current time.

This version renders **288 clocks** (a 24 × 12 grid) to a single HTML canvas. Every clock has two independently-driven hands; together they draw the digits of the time, dissolve into a choreographed pattern, and reassemble on the next minute.

▶ [Watch at full quality on YouTube](https://youtu.be/9Nw4haPRsE0).*

## The idea

The entire display is a **pure function of wall-clock time**. Given the current timestamp, `poseAt(now)` returns the exact angle of all 576 hands — no animation state, no tweening engine, no frame history. This makes the whole wall deterministic and reproducible: reload at the same instant and you see the same frame. (Two explicit user settings — 12/24-hour format and a manual pattern override — are the only inputs beyond the clock.)

## The minute cycle

Each minute runs the same score, keyed off the seconds hand:

| Seconds | Phase | What you see |
|--------:|-------|--------------|
| `0–12` | **Hold** | The current time, spelled in digits across the grid |
| `12–14` | **Dissolve** | Digits melt into the minute's pattern |
| `14–50` | **Performance** | The pattern plays; the time briefly reappears at a random spot at `:20`, `:30`, and `:40` (the *interludes*) |
| `50–60` | **Gather** | Hands sweep back to spell the *next* minute's time |

On load there's a 3-second intro sweep from a neutral resting pose into whatever the wall would be showing.

Which pattern a minute plays is chosen deterministically: `CATALOG[hash(minuteIndex) % 13]`, so the same minute always dances the same way, and all thirteen patterns appear within about an hour.

## The patterns

Thirteen choreographies, each a pure function `(col, row, t) → [handA, handB]` in degrees:

| Pattern | Description |
|---------|-------------|
| **Wave** | A fused needle rippling across the wall at an oscillating speed |
| **Spiral** | Curved arms spiraling toward a slow-drifting attractor |
| **Grass** | Tall grass bending organically in a multi-harmonic wind |
| **Bloom** | Lines aimed at an attractor drifting on a Lissajous path |
| **Cascade** | Rows spin up one after another, a domino sweep down the wall |
| **Ripple** | Concentric rings rippling outward like a water drop |
| **Earthquake** | Violent shockwaves radiating from random corners |
| **Bubbles** | Bubbles rising from the bottom, hands tracing their perimeters |
| **Metronome** | Every clock ticks like clockwork — one hand ticking quickly, the other creeping the opposite way |
| **Moiré** | Two-source interference fringes sweeping along hyperbolas |
| **Kaleidoscope** | A vortex mirrored 4-fold into true kaleidoscopic symmetry |
| **Frame** | Concentric rectangle outlines expanding from the center |
| **Murmuration** | Needles follow the blended heading of an invisible flock |

Several patterns bend the two hands independently — hand A points along a flow field while hand B samples it a step back along the stroke — so adjacent clocks chain into continuous curves rather than rigid segments.

## Controls

Move the mouse to reveal the control bar at the top (it auto-hides after a few seconds):

- **Auto** — return to the automatic per-minute pattern rotation.
- **Pattern buttons** — lock the wall to any single pattern.
- **12H / 24H** — toggle the time format.

## Getting started

Requires [Node.js](https://nodejs.org/) (18+).

```bash
git clone git@github.com:jaredevans/a-million-times.git
cd a-million-times
npm install

npm run dev       # start the dev server (Vite) at http://localhost:5173
npm run build     # type-check and build to dist/
npm run preview   # serve the production build
npm test          # run the test suite (Vitest)
```

## Project structure

```
src/
  main.ts              entry point: canvas setup, control bar, rAF loop
  core/                pure logic, no DOM — fully unit-tested
    timeline.ts        poseAt(): the whole display as a function of time
    choreography.ts    the 13 pattern functions + deterministic selection
    interlude.ts       the mid-minute reappearances of the time
    layout.ts          grid dimensions, digit placement, time → pose
    font.ts            the clock-hand glyphs for digits 0–9
    angles.ts          angle math (interpolation, shortest rotation)
    types.ts           HandAngles / GridPose
  render/
    renderer.ts        draws a GridPose to the canvas
    sprite.ts          cached clock-face sprite
tests/                 Vitest specs mirroring core/
docs/superpowers/      design specs and implementation plans
```

The split is deliberate: everything in `core/` is a pure, testable function of its inputs, and `render/` is the only part that touches the canvas. The test suite pins each pattern to exact known angles and verifies the timeline's phase transitions.

## Credits

Inspired by [*A Million Times*](https://clockforward.com/humans-since-1982/a-million-times/) by [Humans since 1982](https://www.humanssince1982.com/). This is an independent homage, not affiliated with the artists.
