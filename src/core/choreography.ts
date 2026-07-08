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
