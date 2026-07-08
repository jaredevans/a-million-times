import { interpolateHand } from './angles';
import { NEUTRAL_POSE, poseForTime } from './layout';
import type { GridPose } from './types';

export const TRANSITION_START_S = 50;
export const TRANSITION_DURATION_S = 10;
export const INTRO_MS = 3000;
export const INTRO_CUTOFF_S = TRANSITION_START_S - INTRO_MS / 1000;

export function interpolatePose(from: GridPose, to: GridPose, p: number): GridPose {
  return from.map(
    ([a, b], i) => [interpolateHand(a, to[i][0], p), interpolateHand(b, to[i][1], p)] as const,
  );
}

/** The whole display is a pure function of wall-clock time. */
export function poseAt(nowMs: number, loadMs: number): GridPose {
  const now = new Date(nowMs);
  const sec = now.getSeconds() + now.getMilliseconds() / 1000;
  const current = poseForTime(now.getHours(), now.getMinutes());

  if (sec >= TRANSITION_START_S) {
    const next = new Date(nowMs + 60_000);
    const target = poseForTime(next.getHours(), next.getMinutes());
    return interpolatePose(current, target, (sec - TRANSITION_START_S) / TRANSITION_DURATION_S);
  }

  const load = new Date(loadMs);
  const loadSec = load.getSeconds() + load.getMilliseconds() / 1000;
  const sinceLoad = nowMs - loadMs;
  if (sinceLoad < INTRO_MS && loadSec <= INTRO_CUTOFF_S) {
    return interpolatePose(NEUTRAL_POSE, current, sinceLoad / INTRO_MS);
  }

  return current;
}
