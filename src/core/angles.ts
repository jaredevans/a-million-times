export function mod360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export function easeInOutCubic(p: number): number {
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}

export function travel(start: number, target: number): number {
  return mod360(target - start) + 360;
}

export function interpolateHand(start: number, target: number, p: number): number {
  if (p <= 0) return mod360(start);
  if (p >= 1) return mod360(target);
  return mod360(start + travel(start, target) * easeInOutCubic(p));
}
