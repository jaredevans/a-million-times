import { easeInOutCubic, mod360 } from './angles';
import type { HandAngles } from './types';

/** t = seconds since the choreography clock started at :12 (0 <= t <= 38; the gather freezes t = 38). */
export type Choreography = (col: number, row: number, t: number) => HandAngles;

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

/** Fused needle, traveling ripple across the wall. */
const wave: Choreography = (col, row, t) => {
  // Speed oscillates smoothly. 
  // Derivative is 55 + 25*cos(0.5t), meaning speed varies between 30 (solid medium) and 80 (very quick).
  const timeFactor = t * 55 + Math.sin(t * 0.5) * 50;
  const a = mod360(timeFactor + (col + row / 2) * 18);
  return [a, a];
};

/** Curved pathways spiraling toward a slow-drifting attractor, with hands bending to follow the curve. */
const spiral: Choreography = (col, row, t) => {
  const cx = 11.5 + 8 * Math.sin(0.45 * t);
  const cy = 5.5 + 3.5 * Math.cos(0.29 * t);

  // Flow field for the spiral
  const flow = (c: number, r: number): number => {
    const dx = cx - c;
    const dy = cy - r;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const theta = angleToward(dx, dy);
    return mod360(theta + Math.atan2(dist, 2.5) * 180 / Math.PI);
  };

  // Hand A points forward along the flow
  const handA = flow(col, row);

  // Step backwards along the curve to find the direction hand B should point
  const radA = handA * Math.PI / 180;
  const backCol = col - 0.8 * Math.sin(radA);
  const backRow = row - 0.8 * -Math.cos(radA);
  
  const handB = mod360(flow(backCol, backRow) + 180);

  return [handA, handB];
};

/** Tall grass waving organically. Hands align to the stem's tangent to form a smooth curved spine. */
const grass: Choreography = (col, row, t) => {
  // The mathematical spine of the grass stem rooted at `col`.
  // It gives the horizontal displacement (x) at any given height (y).
  const getCurveX = (y: number) => {
    const heightFactor = Math.max(0, (12 - y) / 12);
    const windDecay = Math.max(0, 1 - (col / 40)); 
    
    const stemSensitivity = 1.0 + Math.sin(col * 3.7) * 0.3;
    const breeze = (Math.sin(t * 1.5 - col * 0.2 + y * 0.1) + 1) / 2;
    const burst1 = Math.pow((Math.sin(t * 2.5 - col * 0.4 + y * 0.15) + 1) / 2, 2);
    const burst2 = Math.pow((Math.sin(t * 4.1 - col * 0.7 + y * 0.2) + 1) / 2, 4);
    const flutter = Math.sin(t * 5.3 - col * 1.3 + y * 0.5) * 0.5;
    
    const wind = (1.0 + breeze * 1.5 + (burst1 * 3.5 + burst2 * 2.5) * stemSensitivity + flutter) * windDecay;
    return wind * Math.pow(heightFactor, 1.5);
  };

  // Tangent flow field: computes the exact angle of the curve at height y
  const getTangentAngle = (y: number) => {
    const epsilon = 0.1;
    const dx = getCurveX(y - epsilon) - getCurveX(y + epsilon);
    const dy = -2 * epsilon; // y decreases as we go up
    return angleToward(dx, dy);
  };

  // Hand A points UP along the tangent. Evaluated slightly above the clock center.
  const handA = getTangentAngle(row - 0.25);
  
  // Hand B points DOWN along the tangent. Evaluated slightly below the clock center.
  const handB = mod360(getTangentAngle(row + 0.25) + 180);

  return [handA, handB];
};

/** Full lines aimed at an attractor drifting on a slow Lissajous path. */
const bloom: Choreography = (col, row, t) => {
  const cx = 11.5 + 8 * Math.sin(0.6 * t);
  const cy = 5.5 + 3.5 * Math.cos(0.39 * t);
  const theta = angleToward(cx - col, cy - row);
  return [theta, mod360(theta + 180)];
};

/** Rows spin up one after another, a domino sweep down the wall with varying speeds. */
const cascade: Choreography = (_col, row, t) => {
  // Base speed of 130 deg/s oscillating by +/- 90 deg/s, making the spin organically accelerate and decelerate
  const timeFactor = t * 130 + Math.sin(t * 1.5) * 60;
  const a = mod360(180 + Math.max(0, timeFactor - row * 40));
  return [a, a];
};

/** Concentric rings that ripple outwards like a water drop. */
const kaleidoscope: Choreography = (col, row, t) => {
  // Flow field calculates the angle of the ripple slope at any point
  const flow = (c: number, r: number): number => {
    const dx = 11.5 - c;
    const dy = 5.5 - r;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const radial = angleToward(dx, dy);

    // Damped wave originating from the center
    // Dampening reduced (0.1 -> 0.05) so ripples remain highly visible all the way to the edges
    const dampening = Math.exp(-dist * 0.05);
    
    // The ripple tilts the hands slightly inward and outward, simulating the 3D slopes of a water wave.
    // Increased the max tilt from 30 to 60 for highly pronounced 3D wave slopes
    const wave = Math.sin(dist * 1.5 - t * 4);
    const tilt = 90 + wave * 60 * dampening;

    // Gentle base rotation so the water surface isn't entirely static
    const spin = t * 10;

    return mod360(radial + tilt + spin);
  };

  // Hand A points forward along the water's surface slope
  const handA = flow(col, row);

  // Hand B evaluates the slope slightly behind it to curve perfectly along the ripple ring
  const radA = handA * Math.PI / 180;
  const backCol = col - 0.8 * Math.sin(radA);
  const backRow = row - 0.8 * -Math.cos(radA);
  
  const handB = mod360(flow(backCol, backRow) + 180);

  return [handA, handB];
};

/** Violent shockwaves originating from random corners, shattering the grid. */
const earthquake: Choreography = (col, row, t) => {
  // A new shockwave spawns every 6 seconds
  const interval = 6;
  const shockIndex = Math.floor(t / interval);
  const localT = t % interval;
  
  const corners = [
    { cx: 0, cy: 0 },
    { cx: 23, cy: 0 },
    { cx: 23, cy: 11 },
    { cx: 0, cy: 11 }
  ];
  // Pseudo-random corner
  const { cx, cy } = corners[hash(shockIndex) % 4];
  
  const dx = col - cx;
  const dy = row - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  // Shockwave travels at 8 units per second (crosses diagonal 25.5 in ~3.2s)
  const radius = localT * 8;
  
  // Sharp pulse at the leading edge
  const pulse = Math.exp(-Math.pow(dist - radius, 2) * 1.5);
  
  // Lingering rumble behind the wave
  const isBehind = dist < radius;
  const aftershock = isBehind ? Math.max(0, 1 - (radius - dist) / 15) : 0;
  
  // Calm base state: slow tectonic drift
  const baseAngle = mod360(col * 3 + row * 5 + t * 4);
  
  const shakeEnergy = pulse + aftershock * 0.5;
  
  // Wild, independent high-frequency jitter
  const shakeA = Math.sin(t * 60 + col * 1.3 + row * 0.7) * 180 * shakeEnergy;
  const shakeB = Math.cos(t * 75 + col * 0.8 + row * 1.5) * 180 * shakeEnergy;
  
  const handA = mod360(baseAngle + shakeA);
  const handB = mod360(baseAngle + 180 + shakeB);
  
  return [handA, handB];
};

/** Bubbles rising from the bottom, formed by hands perfectly tracing their circular perimeters. */
const bubbles: Choreography = (col, row, t) => {
  // Calm water drifting upwards as the background (vertical lines)
  const baseAngle = mod360(Math.sin(col * 0.8 + t * 1.5) * 15);
  
  // Overlapping bubble influences blend as vectors in doubled-angle space:
  // the hands always form a straight line, so orientation lives mod 180, and
  // near-opposite tangents from crossing streams reinforce instead of
  // snapping between winners.
  let vx = 0;
  let vy = 0;
  let strength = 0; // strongest single influence: 0 = background, 1 = on a perimeter

  // We simulate 10 continuous bubble streams
  for (let i = 0; i < 10; i++) {
    // Pseudo-random properties for this bubble based on its ID
    const h1 = hash(i * 13);
    const h2 = hash(i * 17);
    const h3 = hash(i * 23);

    const speed = 1.5 + (h1 % 20) * 0.1; // 1.5 to 3.4 units per second
    const x = (h2 % 240) / 10;           // x position 0 to 23.9
    const radius = 1.5 + (h3 % 25) / 10; // radius 1.5 to 3.9

    // Y position loops from below the wall to above it; both endpoints sit
    // outside even the largest bubble's influence band (radius 3.9 + band
    // 2.5 < 6.5), so streams never pop in or out while visible.
    const tOffset = (hash(i * 29) % 100);
    const cycleTime = 24 / speed;
    const localT = (t + tOffset) % cycleTime;
    const y = 17.5 - (localT * speed);

    const dx = col - x;
    const dy = row - y;
    const distFromCenter = Math.sqrt(dx * dx + dy * dy);

    // The "bubble" effect is strongest exactly at the perimeter
    const distFromPerimeter = Math.abs(distFromCenter - radius);

    // Smooth, wider interpolation band (2.5) so the lines pivot gracefully from further away
    if (distFromPerimeter < 2.5) {
      // 1.0 exactly on perimeter, fading to 0.0 at 2.5 units away
      const intensity = Math.pow(1 - (distFromPerimeter / 2.5), 2);

      // Tangents wrap clockwise around the bubble
      const tangentRad = (angleToward(dx, dy) + 90) * Math.PI / 180;
      vx += intensity * Math.cos(2 * tangentRad);
      vy += intensity * Math.sin(2 * tangentRad);
      if (intensity > strength) strength = intensity;
    }
  }

  // Background flow is just straight dashed lines
  if (strength === 0) {
    return [baseAngle, mod360(baseAngle + 180)];
  }

  const blendedTangent = mod360(Math.atan2(vy, vx) * 180 / Math.PI / 2);
  const p = easeInOutCubic(strength);

  // Shortest axial rotation (orientation is mod 180) prevents wild spinning
  const shortDiff = mod360(blendedTangent - baseAngle + 90) % 180 - 90;

  // Mathematical guarantee: the clocks ALWAYS form perfectly straight lines.
  // Because they are exactly 180 degrees apart, they can never form V-shapes (crab legs).
  const handA = mod360(baseAngle + shortDiff * p);
  const handB = mod360(handA + 180);

  return [handA, handB];
};

export const CATALOG: readonly Choreography[] = [wave, spiral, grass, bloom, cascade, kaleidoscope, earthquake, bubbles];

export const PATTERN_NAMES: readonly string[] = ['Wave', 'Spiral', 'Grass', 'Bloom', 'Cascade', 'Kaleidoscope', 'Earthquake', 'Bubbles'];

let patternOverride: number | null = null;

export function setPatternOverride(index: number | null): void {
  if (index !== null && !(Number.isInteger(index) && index >= 0 && index < CATALOG.length)) return;
  patternOverride = index;
}

export function getPatternOverride(): number | null {
  return patternOverride;
}

export function pickChoreography(minuteIndex: number): Choreography {
  if (patternOverride !== null) return CATALOG[patternOverride];
  return CATALOG[hash(minuteIndex) % CATALOG.length];
}
