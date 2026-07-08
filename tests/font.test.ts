import { describe, expect, it } from 'vitest';
import { BLANK_GLYPH, DIGIT_GLYPHS, NEUTRAL } from '../src/core/font';

describe('digit glyphs', () => {
  it('defines ten digits of 24 clocks each', () => {
    expect(DIGIT_GLYPHS).toHaveLength(10);
    for (const glyph of DIGIT_GLYPHS) expect(glyph).toHaveLength(24);
  });

  it('keeps every angle normalized to [0, 360)', () => {
    for (const glyph of [...DIGIT_GLYPHS, BLANK_GLYPH]) {
      for (const [a, b] of glyph) {
        expect(a).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThan(360);
        expect(b).toBeGreaterThanOrEqual(0);
        expect(b).toBeLessThan(360);
      }
    }
  });

  it('renders blank as all-neutral', () => {
    expect(BLANK_GLYPH).toHaveLength(24);
    for (const pose of BLANK_GLYPH) expect(pose).toEqual(NEUTRAL);
  });

  it('spot-checks strokes', () => {
    expect(DIGIT_GLYPHS[0][0]).toEqual([90, 180]);   // 0: top-left corner turns E+S
    expect(DIGIT_GLYPHS[0][5]).toEqual(NEUTRAL);     // 0: interior clock is off
    expect(DIGIT_GLYPHS[1][2]).toEqual([180, 180]);  // 1: top endpoint points down
    expect(DIGIT_GLYPHS[1][22]).toEqual([0, 0]);     // 1: bottom endpoint points up
    expect(DIGIT_GLYPHS[7][3]).toEqual([180, 270]);  // 7: top-right corner turns S+W
    expect(DIGIT_GLYPHS[8][9]).toEqual([270, 90]);   // 8: middle bar is horizontal
  });
});
