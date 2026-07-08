import { describe, expect, it } from 'vitest';
import { DIGIT_GLYPHS, NEUTRAL } from '../src/core/font';
import {
  CLOCK_COUNT, COLS, DIGIT_COLS, DIGIT_ROW, NEUTRAL_POSE, poseForTime, timeToDigits,
} from '../src/core/layout';

describe('timeToDigits', () => {
  it('maps midnight and noon to 12:00', () => {
    expect(timeToDigits(0, 0)).toEqual([1, 2, 0, 0]);
    expect(timeToDigits(12, 0)).toEqual([1, 2, 0, 0]);
  });

  it('blanks the leading digit for single-digit hours', () => {
    expect(timeToDigits(9, 5)).toEqual([null, 9, 0, 5]);
    expect(timeToDigits(13, 59)).toEqual([null, 1, 5, 9]);
  });

  it('keeps the leading 1 for double-digit hours', () => {
    expect(timeToDigits(22, 30)).toEqual([1, 0, 3, 0]);
    expect(timeToDigits(11, 11)).toEqual([1, 1, 1, 1]);
  });
});

describe('poseForTime', () => {
  it('produces one pose per clock', () => {
    expect(poseForTime(12, 0)).toHaveLength(CLOCK_COUNT);
    expect(NEUTRAL_POSE).toHaveLength(CLOCK_COUNT);
  });

  it('keeps margins and gaps neutral', () => {
    const pose = poseForTime(12, 34);
    expect(pose[0]).toEqual(NEUTRAL);                    // top-left margin
    expect(pose[DIGIT_ROW * COLS + 0]).toEqual(NEUTRAL); // left margin beside digits
    expect(pose[DIGIT_ROW * COLS + 6]).toEqual(NEUTRAL); // gap between hour digits
    expect(pose[CLOCK_COUNT - 1]).toEqual(NEUTRAL);      // bottom-right margin
  });

  it('stamps each glyph at its slot origin', () => {
    const pose = poseForTime(12, 34); // digits [1, 2, 3, 4]
    expect(pose[DIGIT_ROW * COLS + DIGIT_COLS[0]]).toEqual(DIGIT_GLYPHS[1][0]);
    expect(pose[DIGIT_ROW * COLS + DIGIT_COLS[1]]).toEqual(DIGIT_GLYPHS[2][0]);
    expect(pose[DIGIT_ROW * COLS + DIGIT_COLS[2]]).toEqual(DIGIT_GLYPHS[3][0]);
    expect(pose[DIGIT_ROW * COLS + DIGIT_COLS[3]]).toEqual(DIGIT_GLYPHS[4][0]);
  });

  it('renders a blank leading digit as neutral clocks', () => {
    const pose = poseForTime(9, 5);
    for (let gr = 0; gr < 6; gr++) {
      for (let gc = 0; gc < 4; gc++) {
        expect(pose[(DIGIT_ROW + gr) * COLS + DIGIT_COLS[0] + gc]).toEqual(NEUTRAL);
      }
    }
  });
});
