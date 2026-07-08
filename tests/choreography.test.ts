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
  it('has thirteen pieces', () => {
    expect(CATALOG).toHaveLength(13);
  });

  it('names every piece', () => {
    expect(PATTERN_NAMES).toHaveLength(CATALOG.length);
  });

  it('pins every pattern label in order', () => {
    expect(PATTERN_NAMES).toEqual([
      'Wave', 'Spiral', 'Grass', 'Bloom', 'Cascade', 'Ripple', 'Earthquake', 'Bubbles',
      'Metronome', 'Moiré', 'Kaleidoscope', 'Frame', 'Murmuration',
    ]);
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
    expect(pickChoreography(0)).toBe(CATALOG[0]); // hash(0) % 13 = 0
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
    expect(seen.size).toBe(13);
  });
});

describe('formula anchors', () => {
  it('pins each piece to exact known values', () => {
    const [wave, spiral, grass, bloom, cascade, ripple, earthquake, bubbles, metronome, moire, kaleidoscope, frame, murmuration] = CATALOG;
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
    // Ripple hands trace a 3D water wave
    const [rA, rB] = ripple(0, 0, 0);
    expect(rA).toBeCloseTo(214, 0);                 // steeper outward slope
    expect(rB).toBeCloseTo(33, 0);                  // bends along the pronounced ripple curve
    // Different distances from center produce different ring poses
    const [nearA] = ripple(12, 5, 5);
    const [farA] = ripple(0, 0, 5);
    expect(nearA).not.toBeCloseTo(farA, 0); // different rings = different angles
    
    expect(earthquake(0, 0, 0)).toEqual([0, 0]);    // violent shake momentarily snaps hands together
    
    const [bA, bB] = bubbles(0, 0, 0);
    expect(Math.round(bA) % 360).toBe(0);           // smooth vertical background current
    expect(Math.round(bB) % 360).toBe(180);

    // Metronome ticks 6 deg per second; (0,0) has phase 0 (hash(0) = 0)
    expect(metronome(0, 0, 10)).toEqual([60, 60]);    // resting on tick 10
    expect(metronome(0, 0, 10.5)).toEqual([66, 66]);  // snap to tick 11 finished

    // Moire: orientation follows the difference of distances to two sources
    expect(moire(0, 0, 0)[0]).toBeCloseTo(328.321, 2);
    expect(moire(0, 0, 0)[1]).toBeCloseTo(141.253, 2); // bends along the hyperbola, not A+180
    expect(moire(20, 3, 5)[0]).toBeCloseTo(176.8584, 2);

    // Kaleidoscope: 4-fold mirror. (20,2) is (3,2) mirrored across the vertical
    // axis (angle negated); (3,9) across the horizontal (angle -> 180 - a).
    expect(kaleidoscope(3, 2, 7)[0]).toBeCloseTo(181.1255, 2);
    expect(kaleidoscope(3, 2, 7)[1]).toBeCloseTo(13.8836, 2); // bends along the arm, not A+180
    expect(kaleidoscope(20, 2, 7)[0]).toBeCloseTo(178.8745, 2); // 360 - 181.1255
    expect(kaleidoscope(3, 9, 7)[0]).toBeCloseTo(358.8745, 2);  // 180 - 181.1255 (mod 360)
    expect(kaleidoscope(20, 9, 7)[0]).toBeCloseTo(1.1255, 2);   // both mirrors compose to 180 + a

    // Frame: the resting field IS the closed-rectangle contour; wave packets
    // tilt hands through it as rings pass. (11,5) sits on the center diagonal
    // (contour 45 + crest tilt); (23,5) is on a side edge half a unit out.
    expect(frame(11, 5, 0)[0]).toBeCloseTo(70.196, 2);
    expect(frame(11, 5, 0)[1]).toBeCloseTo(210.6977, 2);
    expect(frame(23, 5, 0)[0]).toBeCloseTo(154.804, 2);

    // Murmuration: needles follow the flock's blended heading
    expect(murmuration(12, 6, 3)[0]).toBeCloseTo(125.5828, 2);
    expect(murmuration(12, 6, 3)[1]).toBeCloseTo(125.5828, 2);
    expect(murmuration(2, 10, 20)[0]).toBeCloseTo(135.1201, 2);
  });

  it('pins the hash-to-piece mapping', () => {
    expect(pickChoreography(0)).toBe(CATALOG[0]);  // hash(0) % 13 = 0
    expect(pickChoreography(1)).toBe(CATALOG[11]); // hash(1) % 13 = 11
    expect(pickChoreography(4)).toBe(CATALOG[5]);  // hash(4) % 13 = 5
  });
});
