import { describe, expect, it } from 'vitest';
import { angleToward, CATALOG, pickChoreography } from '../src/core/choreography';

describe('angleToward', () => {
  it('maps cardinal grid directions to hand angles', () => {
    expect(angleToward(0, -1)).toBe(0);   // up
    expect(angleToward(1, 0)).toBe(90);   // right
    expect(angleToward(0, 1)).toBe(180);  // down
    expect(angleToward(-1, 0)).toBe(270); // left
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
  it('is deterministic per minute', () => {
    expect(pickChoreography(12345)).toBe(pickChoreography(12345));
    expect(pickChoreography(0)).toBe(pickChoreography(0));
  });

  it('plays every piece within a window of consecutive minutes', () => {
    const seen = new Set<unknown>();
    for (let m = 0; m < 1000; m++) seen.add(pickChoreography(m));
    expect(seen.size).toBe(5);
  });
});

describe('formula anchors', () => {
  it('pins each piece to exact known values', () => {
    const [wave, unison, scissors, bloom, cascade] = CATALOG;
    expect(wave(1, 0, 0)).toEqual([18, 18]);        // (col + row/2) * 18
    expect(unison(0, 0, 1)).toEqual([12, 192]);     // t * 12, opposed hands
    expect(scissors(0, 0, 1)).toEqual([120, 60]);   // 90 +/- t * 30
    expect(bloom(11, 9, 0)).toEqual([90, 270]);     // attractor at (11.5, 9) is due east
    expect(cascade(0, 5, 0)).toEqual([180, 180]);   // row not yet started
    expect(cascade(0, 0, 1)).toEqual([220, 220]);   // 180 + t * 40
  });

  it('pins the hash-to-piece mapping', () => {
    expect(pickChoreography(0)).toBe(CATALOG[0]); // hash(0) = 0
    expect(pickChoreography(1)).toBe(CATALOG[0]); // hash(1) % 5 = 0
    expect(pickChoreography(7)).toBe(CATALOG[3]); // hash(7) % 5 = 3
  });
});
