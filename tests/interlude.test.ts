import { describe, expect, it } from 'vitest';
import { interludeAt } from '../src/core/interlude';

const MI = 29_000_000; // arbitrary fixed minute index

describe('interludeAt', () => {
  it('returns null outside interlude windows', () => {
    expect(interludeAt(14, MI)).toBeNull();
    expect(interludeAt(19.999, MI)).toBeNull();
    expect(interludeAt(25, MI)).toBeNull();
    expect(interludeAt(29, MI)).toBeNull();
    expect(interludeAt(35, MI)).toBeNull();
    expect(interludeAt(45, MI)).toBeNull();
    expect(interludeAt(50, MI)).toBeNull();
  });

  it('walks the in/hold/out phases with exact progress', () => {
    expect(interludeAt(20, MI)).toMatchObject({ phase: 'in', p: 0 });
    expect(interludeAt(20.5, MI)).toMatchObject({ phase: 'in', p: 0.5 });
    expect(interludeAt(21, MI)).toMatchObject({ phase: 'hold', p: 0 });
    expect(interludeAt(23.999, MI)).toMatchObject({ phase: 'hold', p: 0 });
    expect(interludeAt(24, MI)).toMatchObject({ phase: 'out', p: 0 });
    expect(interludeAt(24.5, MI)).toMatchObject({ phase: 'out', p: 0.5 });
    expect(interludeAt(30, MI)).toMatchObject({ phase: 'in', p: 0 });
    expect(interludeAt(44.5, MI)).toMatchObject({ phase: 'out', p: 0.5 });
  });

  it('is deterministic and in bounds across 300 (minute, slot) seeds', () => {
    for (let m = 0; m < 100; m++) {
      for (const sec of [22, 32, 42]) {
        const a = interludeAt(sec, m);
        expect(a).toEqual(interludeAt(sec, m));
        expect(a).not.toBeNull();
        expect(a!.originCol).toBeGreaterThanOrEqual(0);
        expect(a!.originCol).toBeLessThanOrEqual(4);
        expect(a!.originRow).toBeGreaterThanOrEqual(0);
        expect(a!.originRow).toBeLessThanOrEqual(6);
      }
    }
  });
});
