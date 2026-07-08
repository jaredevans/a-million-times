import { describe, expect, it } from 'vitest';
import { NEUTRAL_POSE, poseForTime } from '../src/core/layout';
import { choreographyPose, interpolatePose, poseAt } from '../src/core/timeline';

const at = (h: number, m: number, s: number, ms = 0): number =>
  new Date(2026, 0, 15, h, m, s, ms).getTime();

const minuteIndexOf = (t: number): number => Math.floor(t / 60_000);

const LOAD = at(10, 20, 0); // long before every "now" below: intro never active

describe('poseAt', () => {
  it('holds the digit pose during the hold window', () => {
    expect(poseAt(at(10, 30, 5), LOAD)).toEqual(poseForTime(10, 30));
    expect(poseAt(at(10, 30, 11, 999), LOAD)).toEqual(poseForTime(10, 30));
  });

  it('blends digits toward the live choreography during the dissolve', () => {
    const now = at(10, 30, 13);
    const expected = interpolatePose(
      poseForTime(10, 30),
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
      poseForTime(10, 31),
      0.5,
    );
    expect(poseAt(now, LOAD)).toEqual(expected);
  });

  it('lands on the next pose exactly on the minute', () => {
    expect(poseAt(at(10, 31, 0), LOAD)).toEqual(poseForTime(10, 31));
  });

  it('crosses the hour boundary', () => {
    expect(poseAt(at(11, 0, 0), LOAD)).toEqual(poseForTime(11, 0));
  });

  it('runs the intro sweep from neutral after load', () => {
    const load = at(10, 30, 5);
    const midIntro = poseAt(load + 1500, load);
    expect(midIntro[0][0]).toBeCloseTo(45, 10); // neutral margin clock halfway: 225 + 180
    expect(poseAt(load + 3000, load)).toEqual(poseForTime(10, 30));
  });

  it('blends the intro toward the moving pose when it overlaps the dissolve', () => {
    const load = at(10, 30, 11);
    const now = load + 1500; // :12.5 — mid-dissolve
    const dissolve = interpolatePose(
      poseForTime(10, 30),
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
      poseForTime(10, 31),
      0.5,
    );
    expect(poseAt(load, load)).toEqual(expected);
  });
});
