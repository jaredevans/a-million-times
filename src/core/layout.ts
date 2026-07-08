import { BLANK_GLYPH, DIGIT_GLYPHS, NEUTRAL } from './font';
import type { GridPose, HandAngles } from './types';

export const COLS = 24;
export const ROWS = 12;
export const CLOCK_COUNT = COLS * ROWS;

/** Grid column where each of the 4 digit blocks starts. */
export const DIGIT_COLS = [2, 7, 13, 18] as const;
/** Grid row where every digit block starts. */
export const DIGIT_ROW = 3;

/** The full time display: 4 digits + gaps, as one block. */
export const DIGIT_BLOCK_COLS = 20;
export const DIGIT_BLOCK_ROWS = 6;
/** Digit slot column offsets within the block (DIGIT_COLS relative to the block origin). */
const DIGIT_SLOT_OFFSETS = [0, 5, 11, 16] as const;

const GLYPH_COLS = 4;
const GLYPH_ROWS = 6;

export const NEUTRAL_POSE: GridPose = Array.from({ length: CLOCK_COUNT }, () => NEUTRAL);

/** 12-hour digit slots [H1, H2, M1, M2]; null = blank leading digit. */
export function timeToDigits(hours24: number, minutes: number): readonly [number | null, number, number, number] {
  const h12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return [h12 >= 10 ? 1 : null, h12 % 10, Math.floor(minutes / 10), minutes % 10];
}

/** Full-grid pose: neutral everywhere, the time block stamped at the given origin. */
export function poseForTimeAt(
  hours24: number,
  minutes: number,
  originCol: number,
  originRow: number,
): GridPose {
  const pose: HandAngles[] = Array.from({ length: CLOCK_COUNT }, () => NEUTRAL);
  timeToDigits(hours24, minutes).forEach((digit, slot) => {
    const glyph = digit === null ? BLANK_GLYPH : DIGIT_GLYPHS[digit];
    for (let gr = 0; gr < GLYPH_ROWS; gr++) {
      for (let gc = 0; gc < GLYPH_COLS; gc++) {
        pose[(originRow + gr) * COLS + originCol + DIGIT_SLOT_OFFSETS[slot] + gc] =
          glyph[gr * GLYPH_COLS + gc];
      }
    }
  });
  return pose;
}

export function poseForTime(hours24: number, minutes: number): GridPose {
  return poseForTimeAt(hours24, minutes, DIGIT_COLS[0], DIGIT_ROW);
}
