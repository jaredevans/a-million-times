import { describe, expect, it } from 'vitest';
import { interpolateHand } from '../src/core/angles';
import { interludeAt } from '../src/core/interlude';
import {
  COLS, DIGIT_BLOCK_COLS, DIGIT_BLOCK_ROWS, NEUTRAL_POSE, poseForTime, poseForTimeAt, ROWS,
} from '../src/core/layout';
import { choreographyPose, interpolatePose, poseAt } from '../src/core/timeline';

const at = (h: number, m: number, s: number, ms = 0): number =>
  new Date(2026, 0, 15, h, m, s, ms).getTime();

const minuteIndexOf = (t: number): number => Math.floor(t / 60_000);

const LOAD = at(10, 20, 0); // long before every "now" below: intro never active

describe('poseAt', () => {
  it('holds the digit pose during the hold window', () => {
    expect(poseAt(at(10, 30, 5), LOAD)).toEqual(poseForTime(10, 30, true));
    expect(poseAt(at(10, 30, 11, 999), LOAD)).toEqual(poseForTime(10, 30, true));
  });

  it('blends digits toward the live choreography during the dissolve', () => {
    const now = at(10, 30, 13);
    const expected = interpolatePose(
      poseForTime(10, 30, true),
      choreographyPose(minuteIndexOf(now), 1),
      0.5,
    );
    expect(poseAt(now, LOAD)).toEqual(expected);
  });

  it('reaches the live choreography exactly when the dissolve ends', () => {
    const now = at(10, 30, 14);
    expect(poseAt(now, LOAD)).toEqual(choreographyPose(minuteIndexOf(now), 2));
  });

  it('plays the choreography during the performance window', () => {
    const now = at(10, 30, 25);
    expect(poseAt(now, LOAD)).toEqual(choreographyPose(minuteIndexOf(now), 13));
  });

  it('starts the gather from the choreography pose at :50', () => {
    const now = at(10, 30, 50);
    expect(poseAt(now, LOAD)).toEqual(choreographyPose(minuteIndexOf(now), 38));
  });

  it('sweeps from the choreography to the next digits at the gather midpoint', () => {
    const now = at(10, 30, 55);
    const expected = interpolatePose(
      choreographyPose(minuteIndexOf(now), 38),
      poseForTime(10, 31, true),
      0.5,
    );
    expect(poseAt(now, LOAD)).toEqual(expected);
  });

  it('lands on the next pose exactly on the minute', () => {
    expect(poseAt(at(10, 31, 0), LOAD)).toEqual(poseForTime(10, 31, true));
  });

  it('crosses the hour boundary', () => {
    expect(poseAt(at(11, 0, 0), LOAD)).toEqual(poseForTime(11, 0, true));
  });

  it('runs the intro sweep from neutral after load', () => {
    const load = at(10, 30, 5);
    const midIntro = poseAt(load + 1500, load);
    expect(midIntro[0][0]).toBeCloseTo(45, 10); // neutral margin clock halfway: 225 + 180
    expect(poseAt(load + 3000, load)).toEqual(poseForTime(10, 30, true));
  });

  it('blends the intro toward the moving pose when it overlaps the dissolve', () => {
    const load = at(10, 30, 11);
    const now = load + 1500; // :12.5 — mid-dissolve
    const dissolve = interpolatePose(
      poseForTime(10, 30, true),
      choreographyPose(minuteIndexOf(now), 0.5),
      0.25,
    );
    expect(poseAt(now, load)).toEqual(interpolatePose(NEUTRAL_POSE, dissolve, 0.5));
    expect(poseAt(load + 3000, load)).toEqual(choreographyPose(minuteIndexOf(load + 3000), 2));
  });

  it('runs the intro at exactly the 47s cutoff toward the live choreography', () => {
    const load = at(10, 30, 47);
    const now = load + 1500; // :48.5
    const expected = interpolatePose(
      NEUTRAL_POSE,
      choreographyPose(minuteIndexOf(now), 36.5),
      0.5,
    );
    expect(poseAt(now, load)).toEqual(expected);
  });

  it('skips the intro when fewer than 3s remain before the gather', () => {
    const load = at(10, 30, 48);
    expect(poseAt(load, load)).toEqual(choreographyPose(minuteIndexOf(load), 36));
  });

  it('joins an in-flight gather when loaded mid-transition', () => {
    const load = at(10, 30, 55);
    const expected = interpolatePose(
      choreographyPose(minuteIndexOf(load), 38),
      poseForTime(10, 31, true),
      0.5,
    );
    expect(poseAt(load, load)).toEqual(expected);
  });
});

describe('time interludes', () => {
  const mi = minuteIndexOf(at(10, 30, 22));

  const inBlock = (i: number, originCol: number, originRow: number): boolean => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    return (
      col >= originCol && col < originCol + DIGIT_BLOCK_COLS &&
      row >= originRow && row < originRow + DIGIT_BLOCK_ROWS
    );
  };

  it('leaves the pose purely choreographic at the interlude boundaries', () => {
    expect(poseAt(at(10, 30, 20), LOAD)).toEqual(choreographyPose(mi, 8));
    expect(poseAt(at(10, 30, 25), LOAD)).toEqual(choreographyPose(mi, 13));
  });

  it('holds the time block at its seeded position while the rest dances', () => {
    const il = interludeAt(22, mi)!;
    const block = poseForTimeAt(10, 30, true, il.originCol, il.originRow);
    const base = choreographyPose(mi, 10);
    const pose = poseAt(at(10, 30, 22), LOAD);
    for (let i = 0; i < ROWS * COLS; i++) {
      expect(pose[i]).toEqual(inBlock(i, il.originCol, il.originRow) ? block[i] : base[i]);
    }
  });

  it('keeps the block on the time across the whole hold, into the blend-out start', () => {
    const il = interludeAt(24, mi)!;
    const block = poseForTimeAt(10, 30, true, il.originCol, il.originRow);
    const i = il.originRow * COLS + il.originCol;
    expect(poseAt(at(10, 30, 21), LOAD)[i]).toEqual(block[i]); // hold begins
    expect(poseAt(at(10, 30, 24), LOAD)[i]).toEqual(block[i]); // blend-out p = 0
  });

  it('blends block cells with interpolateHand at the blend midpoint', () => {
    const il = interludeAt(20.5, mi)!;
    const block = poseForTimeAt(10, 30, true, il.originCol, il.originRow);
    const base = choreographyPose(mi, 8.5);
    const pose = poseAt(at(10, 30, 20, 500), LOAD);
    const i = il.originRow * COLS + il.originCol;
    expect(pose[i][0]).toBeCloseTo(interpolateHand(base[i][0], block[i][0], 0.5), 10);
    expect(pose[i][1]).toBeCloseTo(interpolateHand(base[i][1], block[i][1], 0.5), 10);
  });
});
