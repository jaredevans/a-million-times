import { hash } from './choreography';
import { COLS, DIGIT_BLOCK_COLS, DIGIT_BLOCK_ROWS, ROWS } from './layout';

export const INTERLUDE_STARTS_S = [20, 30, 40] as const;
export const INTERLUDE_BLEND_S = 1;
export const INTERLUDE_HOLD_S = 3;

const TOTAL_S = INTERLUDE_BLEND_S + INTERLUDE_HOLD_S + INTERLUDE_BLEND_S;
const COL_CHOICES = COLS - DIGIT_BLOCK_COLS + 1; // 5
const ROW_CHOICES = ROWS - DIGIT_BLOCK_ROWS + 1; // 7

export interface Interlude {
  phase: 'in' | 'hold' | 'out';
  /** Blend progress in [0, 1); 0 during hold. */
  p: number;
  originCol: number;
  originRow: number;
}

/** The active time interlude at this second of the minute, or null. */
export function interludeAt(sec: number, minuteIndex: number): Interlude | null {
  for (let slot = 0; slot < INTERLUDE_STARTS_S.length; slot++) {
    const local = sec - INTERLUDE_STARTS_S[slot];
    if (local < 0 || local >= TOTAL_S) continue;

    const h = hash(minuteIndex * INTERLUDE_STARTS_S.length + slot);
    const originCol = h % COL_CHOICES;
    const originRow = Math.floor(h / COL_CHOICES) % ROW_CHOICES;

    if (local < INTERLUDE_BLEND_S) {
      return { phase: 'in', p: local / INTERLUDE_BLEND_S, originCol, originRow };
    }
    if (local < INTERLUDE_BLEND_S + INTERLUDE_HOLD_S) {
      return { phase: 'hold', p: 0, originCol, originRow };
    }
    return {
      phase: 'out',
      p: (local - INTERLUDE_BLEND_S - INTERLUDE_HOLD_S) / INTERLUDE_BLEND_S,
      originCol,
      originRow,
    };
  }
  return null;
}
