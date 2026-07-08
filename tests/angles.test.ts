import { describe, expect, it } from 'vitest';
import { easeInOutCubic, interpolateHand, mod360, travel } from '../src/core/angles';

describe('mod360', () => {
  it('normalizes into [0, 360)', () => {
    expect(mod360(0)).toBe(0);
    expect(mod360(360)).toBe(0);
    expect(mod360(370)).toBe(10);
    expect(mod360(-90)).toBe(270);
    expect(mod360(725)).toBe(5);
  });
});

describe('easeInOutCubic', () => {
  it('anchors endpoints and midpoint', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 10);
  });

  it('is monotonically increasing', () => {
    for (let i = 0; i < 100; i++) {
      expect(easeInOutCubic((i + 1) / 100)).toBeGreaterThan(easeInOutCubic(i / 100));
    }
  });
});

describe('travel', () => {
  it('always includes one extra full revolution', () => {
    expect(travel(0, 90)).toBe(450);
    expect(travel(90, 0)).toBe(630);
    expect(travel(180, 180)).toBe(360);
    expect(travel(225, 0)).toBe(495);
  });

  it('stays within [360, 720)', () => {
    for (let s = 0; s < 360; s += 15) {
      for (let t = 0; t < 360; t += 15) {
        const tr = travel(s, t);
        expect(tr).toBeGreaterThanOrEqual(360);
        expect(tr).toBeLessThan(720);
      }
    }
  });
});

describe('interpolateHand', () => {
  it('returns start at p=0 and target at p=1', () => {
    expect(interpolateHand(30, 120, 0)).toBe(30);
    expect(interpolateHand(30, 120, 1)).toBe(120);
  });

  it('passes the halfway point of its travel at p=0.5', () => {
    expect(interpolateHand(0, 0, 0.5)).toBeCloseTo(180, 10);
    expect(interpolateHand(225, 225, 0.5)).toBeCloseTo(45, 10);
  });

  it('clamps out-of-range progress', () => {
    expect(interpolateHand(30, 120, -0.5)).toBe(30);
    expect(interpolateHand(30, 120, 1.5)).toBe(120);
  });
});
