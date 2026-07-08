import { describe, expect, it } from 'vitest';
import { DIGIT_GLYPHS, NEUTRAL } from '../src/core/font';
import {
  CLOCK_COUNT, COLS, DIGIT_COLS, DIGIT_ROW, NEUTRAL_POSE, poseForTime, poseForTimeAt, timeToDigits,
} from '../src/core/layout';

describe('timeToDigits', () => {
  it('blanks the leading digit for single-digit hours without zero padding', () => {
    expect(timeToDigits(9, 5, false)).toEqual([null, 9, 0, 5]);
    expect(timeToDigits(1, 59, false)).toEqual([null, 1, 5, 9]);
  });

  it('preserves the leading digit for double-digit hours', () => {
    expect(timeToDigits(22, 30, true)).toEqual([2, 2, 3, 0]);
    expect(timeToDigits(11, 11, false)).toEqual([1, 1, 1, 1]);
    expect(timeToDigits(12, 0, false)).toEqual([1, 2, 0, 0]);
  });

  it('pads the leading zero for single-digit hours when requested', () => {
    expect(timeToDigits(9, 5, true)).toEqual([0, 9, 0, 5]);
    expect(timeToDigits(0, 0, true)).toEqual([0, 0, 0, 0]);
  });
});

describe('poseForTime', () => {
  it('produces one pose per clock', () => {
    expect(poseForTime(12, 0, false)).toHaveLength(CLOCK_COUNT);
    expect(NEUTRAL_POSE).toHaveLength(CLOCK_COUNT);
  });

  it('keeps margins and gaps neutral', () => {
    const pose = poseForTime(12, 34, false);
    expect(pose[0]).toEqual(NEUTRAL);                    // top-left margin
    expect(pose[DIGIT_ROW * COLS + 0]).toEqual(NEUTRAL); // left margin beside digits
    expect(pose[DIGIT_ROW * COLS + 6]).toEqual(NEUTRAL); // gap between hour digits
    expect(pose[CLOCK_COUNT - 1]).toEqual(NEUTRAL);      // bottom-right margin
  });

  it('stamps each glyph at its slot origin', () => {
    const pose = poseForTime(12, 34, false); // digits [1, 2, 3, 4]
    expect(pose[DIGIT_ROW * COLS + DIGIT_COLS[0]]).toEqual(DIGIT_GLYPHS[1][0]);
    expect(pose[DIGIT_ROW * COLS + DIGIT_COLS[1]]).toEqual(DIGIT_GLYPHS[2][0]);
    expect(pose[DIGIT_ROW * COLS + DIGIT_COLS[2]]).toEqual(DIGIT_GLYPHS[3][0]);
    expect(pose[DIGIT_ROW * COLS + DIGIT_COLS[3]]).toEqual(DIGIT_GLYPHS[4][0]);
  });

  it('renders a blank leading digit as neutral clocks', () => {
    const pose = poseForTime(9, 5, false);
    for (let gr = 0; gr < 6; gr++) {
      for (let gc = 0; gc < 4; gc++) {
        expect(pose[(DIGIT_ROW + gr) * COLS + DIGIT_COLS[0] + gc]).toEqual(NEUTRAL);
      }
    }
  });
});

describe('poseForTimeAt', () => {
  it('matches poseForTime at the default origin', () => {
    expect(poseForTimeAt(12, 34, false, 2, 3)).toEqual(poseForTime(12, 34, false));
    expect(poseForTimeAt(9, 5, false, 2, 3)).toEqual(poseForTime(9, 5, false));
  });

  it('stamps the block at origin (0, 0)', () => {
    const pose = poseForTimeAt(9, 5, false, 0, 0);
    expect(pose[0 * COLS + 5]).toEqual(DIGIT_GLYPHS[9][0]); // slot 1 at block offset 5
    expect(pose[0 * COLS + 0]).toEqual(NEUTRAL);            // blank leading digit
    expect(pose[7 * COLS + 0]).toEqual(NEUTRAL);            // below the block
  });

  it('stamps the block at the extreme origin (4, 6)', () => {
    const pose = poseForTimeAt(12, 34, false, 4, 6);
    expect(pose[6 * COLS + 4]).toEqual(DIGIT_GLYPHS[1][0]);     // slot 0 glyph top-left
    expect(pose[11 * COLS + 23]).toEqual(DIGIT_GLYPHS[4][23]);  // slot 3 glyph bottom-right
    expect(pose[5 * COLS + 4]).toEqual(NEUTRAL);                // above the block
  });
});
