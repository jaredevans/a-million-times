import { describe, expect, it } from 'vitest';
import { poseForTime } from '../src/core/layout';
import { poseAt } from '../src/core/timeline';

const at = (h: number, m: number, s: number, ms = 0): number =>
  new Date(2026, 0, 15, h, m, s, ms).getTime();

describe('poseAt', () => {
  it('holds the current pose between transitions', () => {
    const load = at(10, 20, 0);
    expect(poseAt(at(10, 30, 25), load)).toEqual(poseForTime(10, 30));
    expect(poseAt(at(10, 30, 49, 999), load)).toEqual(poseForTime(10, 30));
  });

  it('matches the hold pose exactly when the transition starts', () => {
    expect(poseAt(at(10, 30, 50), at(10, 20, 0))).toEqual(poseForTime(10, 30));
  });

  it('lands on the next pose exactly on the minute', () => {
    expect(poseAt(at(10, 31, 0), at(10, 20, 0))).toEqual(poseForTime(10, 31));
  });

  it('sweeps a neutral clock through +180deg at the transition midpoint', () => {
    const pose = poseAt(at(10, 30, 55), at(10, 20, 0));
    expect(pose[0][0]).toBeCloseTo(45, 10);
    expect(pose[0][1]).toBeCloseTo(45, 10);
  });

  it('crosses the hour boundary', () => {
    expect(poseAt(at(11, 0, 0), at(10, 20, 0))).toEqual(poseForTime(11, 0));
  });

  it('runs the intro sweep from neutral after load', () => {
    const load = at(10, 30, 10);
    const midIntro = poseAt(load + 1500, load);
    expect(midIntro[0][0]).toBeCloseTo(45, 10);
    expect(poseAt(load + 3000, load)).toEqual(poseForTime(10, 30));
  });

  it('skips the intro when fewer than 3s remain before the transition', () => {
    const load = at(10, 30, 48);
    expect(poseAt(load + 100, load)).toEqual(poseForTime(10, 30));
  });

  it('joins an in-flight transition when loaded mid-transition', () => {
    const load = at(10, 30, 55);
    const pose = poseAt(load, load);
    expect(pose[0][0]).toBeCloseTo(45, 10);
  });

  it('sweeps a changing digit cell through its eased midpoint', () => {
    // 10:30 -> 10:31: minute-units slot at index 3*24+18 changes GLYPH_0[0]=[90,180] -> NEUTRAL=[225,225]
    const pose = poseAt(at(10, 30, 55), at(10, 20, 0));
    expect(pose[90][0]).toBeCloseTo(337.5, 10); // 90 + (mod360(135)+360)*0.5
    expect(pose[90][1]).toBeCloseTo(22.5, 10);  // mod360(180 + (mod360(45)+360)*0.5)
  });

  it('runs the intro when loaded at exactly the 47s cutoff', () => {
    const load = at(10, 30, 47);
    const pose = poseAt(load + 1500, load);
    expect(pose[0][0]).toBeCloseTo(45, 10); // neutral clock halfway through intro sweep
  });
});
