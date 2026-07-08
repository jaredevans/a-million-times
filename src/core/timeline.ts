import { interpolateHand } from './angles';
import { pickChoreography } from './choreography';
import { interludeAt, type Interlude } from './interlude';
import {
  COLS, DIGIT_BLOCK_COLS, DIGIT_BLOCK_ROWS, NEUTRAL_POSE, poseForTime, poseForTimeAt, ROWS,
} from './layout';
import type { GridPose, HandAngles } from './types';

export const HOLD_S = 12;
export const DISSOLVE_S = 2;
export const TRANSITION_START_S = 50;
export const TRANSITION_DURATION_S = 10;
export const INTRO_MS = 3000;
export const INTRO_CUTOFF_S = TRANSITION_START_S - INTRO_MS / 1000;

export function interpolatePose(from: GridPose, to: GridPose, p: number): GridPose {
  return from.map(
    ([a, b], i) => [interpolateHand(a, to[i][0], p), interpolateHand(b, to[i][1], p)] as const,
  );
}

/** The minute's choreography evaluated at t seconds past :12, as a full grid pose. */
export function choreographyPose(minuteIndex: number, t: number): GridPose {
  const piece = pickChoreography(minuteIndex);
  const pose: HandAngles[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      pose.push(piece(col, row, t));
    }
  }
  return pose;
}

/** Overlay the time block on the choreography: block cells blend/hold, all others pass through. */
function composeInterlude(
  base: GridPose,
  il: Interlude,
  hours24: number,
  minutes: number,
): GridPose {
  const block = poseForTimeAt(hours24, minutes, il.originCol, il.originRow);
  return base.map((cell, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const inBlock =
      col >= il.originCol && col < il.originCol + DIGIT_BLOCK_COLS &&
      row >= il.originRow && row < il.originRow + DIGIT_BLOCK_ROWS;
    if (!inBlock) return cell;
    if (il.phase === 'hold') return block[i];
    const [from, to] = il.phase === 'in' ? [cell, block[i]] : [block[i], cell];
    if (il.p === 0) return from;
    return [interpolateHand(from[0], to[0], il.p), interpolateHand(from[1], to[1], il.p)] as const;
  });
}

/** The whole display is a pure function of wall-clock time. */
export function poseAt(nowMs: number, loadMs: number): GridPose {
  const now = new Date(nowMs);
  const sec = now.getSeconds() + now.getMilliseconds() / 1000;
  const minuteIndex = Math.floor(nowMs / 60_000);
  const digits = poseForTime(now.getHours(), now.getMinutes());

  if (sec >= TRANSITION_START_S) {
    const next = new Date(nowMs + 60_000);
    const target = poseForTime(next.getHours(), next.getMinutes());
    const start = choreographyPose(minuteIndex, TRANSITION_START_S - HOLD_S);
    const p = (sec - TRANSITION_START_S) / TRANSITION_DURATION_S;
    return p === 0 ? start : interpolatePose(start, target, p);
  }

  let current: GridPose;
  if (sec >= HOLD_S + DISSOLVE_S) {
    current = choreographyPose(minuteIndex, sec - HOLD_S);
    const il = interludeAt(sec, minuteIndex);
    if (il) {
      current = composeInterlude(current, il, now.getHours(), now.getMinutes());
    }
  } else if (sec >= HOLD_S) {
    current = interpolatePose(
      digits,
      choreographyPose(minuteIndex, sec - HOLD_S),
      (sec - HOLD_S) / DISSOLVE_S,
    );
  } else {
    current = digits;
  }

  const load = new Date(loadMs);
  const loadSec = load.getSeconds() + load.getMilliseconds() / 1000;
  const sinceLoad = nowMs - loadMs;
  if (sinceLoad < INTRO_MS && loadSec <= INTRO_CUTOFF_S) {
    return interpolatePose(NEUTRAL_POSE, current, sinceLoad / INTRO_MS);
  }

  return current;
}
