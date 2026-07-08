/** Two hand angles in degrees: 0 = 12 o'clock, increasing clockwise, in [0, 360). */
export type HandAngles = readonly [number, number];

/** One digit block: 24 clocks, 4 cols x 6 rows, row-major. */
export type DigitGlyph = readonly HandAngles[];

/** Full grid: 288 clocks, 24 cols x 12 rows, row-major. */
export type GridPose = readonly HandAngles[];
