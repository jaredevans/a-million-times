import type { DigitGlyph, HandAngles } from './types';

const N = 0;
const E = 90;
const S = 180;
const W = 270;

export const NEUTRAL: HandAngles = [225, 225];

const __ = NEUTRAL;
const H: HandAngles = [W, E]; // horizontal line through center
const V: HandAngles = [N, S]; // vertical line through center
const p = (a: number, b: number): HandAngles => [a, b];

const GLYPH_0: DigitGlyph = [
  p(E, S), H,  H,  p(S, W),
  V,       __, __, V,
  V,       __, __, V,
  V,       __, __, V,
  V,       __, __, V,
  p(N, E), H,  H,  p(N, W),
];

const GLYPH_1: DigitGlyph = [
  __, __, p(S, S), __,
  __, __, V,       __,
  __, __, V,       __,
  __, __, V,       __,
  __, __, V,       __,
  __, __, p(N, N), __,
];

const GLYPH_2: DigitGlyph = [
  p(E, E), H,  H,  p(S, W),
  __,      __, __, V,
  p(E, S), H,  H,  p(N, W),
  V,       __, __, __,
  V,       __, __, __,
  p(N, E), H,  H,  p(W, W),
];

const GLYPH_3: DigitGlyph = [
  p(E, E), H,       H,  p(S, W),
  __,      __,      __, V,
  __,      p(E, E), H,  p(N, W),
  __,      __,      __, V,
  __,      __,      __, V,
  p(E, E), H,       H,  p(N, W),
];

const GLYPH_4: DigitGlyph = [
  p(S, S), __, __, p(S, S),
  V,       __, __, V,
  p(N, E), H,  H,  p(N, W),
  __,      __, __, V,
  __,      __, __, V,
  __,      __, __, p(N, N),
];

const GLYPH_5: DigitGlyph = [
  p(E, S), H,  H,  p(W, W),
  V,       __, __, __,
  p(N, E), H,  H,  p(S, W),
  __,      __, __, V,
  __,      __, __, V,
  p(E, E), H,  H,  p(N, W),
];

const GLYPH_6: DigitGlyph = [
  p(E, S), H,  H,  p(W, W),
  V,       __, __, __,
  p(E, S), H,  H,  p(S, W),
  V,       __, __, V,
  V,       __, __, V,
  p(N, E), H,  H,  p(N, W),
];

const GLYPH_7: DigitGlyph = [
  p(E, E), H,  H,  p(S, W),
  __,      __, __, V,
  __,      __, __, V,
  __,      __, __, V,
  __,      __, __, V,
  __,      __, __, p(N, N),
];

const GLYPH_8: DigitGlyph = [
  p(E, S), H,  H,  p(S, W),
  V,       __, __, V,
  V,       H,  H,  V,
  V,       __, __, V,
  V,       __, __, V,
  p(N, E), H,  H,  p(N, W),
];

const GLYPH_9: DigitGlyph = [
  p(E, S), H,  H,  p(S, W),
  V,       __, __, V,
  p(N, E), H,  H,  p(N, W),
  __,      __, __, V,
  __,      __, __, V,
  p(E, E), H,  H,  p(N, W),
];

export const BLANK_GLYPH: DigitGlyph = Array.from({ length: 24 }, () => NEUTRAL);

export const DIGIT_GLYPHS: readonly DigitGlyph[] = [
  GLYPH_0, GLYPH_1, GLYPH_2, GLYPH_3, GLYPH_4,
  GLYPH_5, GLYPH_6, GLYPH_7, GLYPH_8, GLYPH_9,
];
