import { afterEach, describe, expect, it } from 'vitest';
import {
  angleToward, CATALOG, PATTERN_NAMES, pickChoreography, setPatternOverride,
} from '../src/core/choreography';

describe('angleToward', () => {
  it('maps cardinal grid directions to hand angles', () => {
    expect(angleToward(0, -1)).toBe(0);   // up
    expect(angleToward(1, 0)).toBe(90);   // right
    expect(angleToward(0, 1)).toBe(180);  // down
    expect(angleToward(-1, 0)).toBe(270); // left
  });
});

describe('catalog', () => {
  it('has eight pieces', () => {
    expect(CATALOG).toHaveLength(8);
  });

  it('names every piece', () => {
    expect(PATTERN_NAMES).toHaveLength(CATALOG.length);
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
  afterEach(() => setPatternOverride(null));

  it('honors the pattern override and reverts on null', () => {
    setPatternOverride(2);
    expect(pickChoreography(0)).toBe(CATALOG[2]);
    expect(pickChoreography(12345)).toBe(CATALOG[2]);
    setPatternOverride(null);
    expect(pickChoreography(0)).toBe(CATALOG[0]); // hash(0) % 8 = 0
  });

  it('ignores out-of-range or non-integer overrides', () => {
    setPatternOverride(2);
    setPatternOverride(CATALOG.length);
    setPatternOverride(-1);
    setPatternOverride(1.5);
    expect(pickChoreography(0)).toBe(CATALOG[2]);
  });

  it('is deterministic per minute', () => {
    expect(pickChoreography(12345)).toBe(pickChoreography(12345));
    expect(pickChoreography(0)).toBe(pickChoreography(0));
  });

  it('plays every piece within a window of consecutive minutes', () => {
    const seen = new Set<unknown>();
    for (let m = 0; m < 1000; m++) seen.add(pickChoreography(m));
    expect(seen.size).toBe(8);
  });
});

describe('formula anchors', () => {
  it('pins each piece to exact known values', () => {
    const [wave, spiral, grass, bloom, cascade, kaleidoscope, earthquake, bubbles] = CATALOG;
    expect(wave(1, 0, 0)).toEqual([18, 18]);        // (col + row/2) * 18
    // Spiral hands bend to follow the curve (203° apart here, not 180°)
    const [sA, sB] = spiral(11, 9, 0);
    expect(sA).toBeCloseTo(101.31, 2);
    expect(sB).toBeCloseTo(304.33, 2);

    const [gA, gB] = grass(0, 5, 0);
    expect(gA).toBeCloseTo(18, 0);                  // evaluates tangent flow slightly above center
    expect(gB).toBeCloseTo(202, 0);                 // evaluates tangent flow slightly below center
    expect(bloom(11, 9, 0)).toEqual([90, 270]);     // attractor at (11.5, 9) is due east
    expect(cascade(0, 5, 0)).toEqual([180, 180]);   // row not yet started
    const [cA, cB] = cascade(0, 0, 1);
    expect(cA).toBeCloseTo(9.85, 2);                // 180 + 130 + sin(1.5)*60
    expect(cB).toBeCloseTo(9.85, 2);
    // Kaleidoscope hands now trace a 3D water ripple
    const [ka, kb] = kaleidoscope(0, 0, 0);
    expect(ka).toBeCloseTo(214, 0);                 // steeper outward slope
    expect(kb).toBeCloseTo(33, 0);                  // bends along the pronounced ripple curve
    // Different distances from center produce different ring poses
    const [nearA] = kaleidoscope(12, 5, 5);
    const [farA] = kaleidoscope(0, 0, 5);
    expect(nearA).not.toBeCloseTo(farA, 0); // different rings = different angles
    
    expect(earthquake(0, 0, 0)).toEqual([0, 0]);    // violent shake momentarily snaps hands together
    
    const [bA, bB] = bubbles(0, 0, 0);
    expect(Math.round(bA) % 360).toBe(0);           // smooth vertical background current
    expect(Math.round(bB) % 360).toBe(180);
  });

  it('pins the hash-to-piece mapping', () => {
    expect(pickChoreography(0)).toBe(CATALOG[0]); // hash(0) % 8 = 0
    expect(pickChoreography(1)).toBe(CATALOG[7]); // hash(1) % 8 = 7
    expect(pickChoreography(4)).toBe(CATALOG[1]); // hash(4) % 8 = 1
  });
});
