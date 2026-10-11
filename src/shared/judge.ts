import type { RhythmNote } from './beatmap';

export const PERFECT_MS = 45;
export const GOOD_MS = 90;
export const MISS_MS = 140;

export type Grade = 0 | 1 | 2; // 0 = miss, 1 = good, 2 = perfect

export function gradeDelta(deltaMs: number): Grade {
  'worklet';
  const d = Math.abs(deltaMs);
  if (d <= PERFECT_MS) return 2;
  if (d <= GOOD_MS) return 1;
  return 0;
}

/**
 * Finds the nearest unhit note in a lane within the miss window.
 * `hit` is a flat Int8Array-like (0 = pending, 1 = hit, 2 = missed). Returns -1 when none matches.
 */
export function findTarget(notes: readonly RhythmNote[], hit: ArrayLike<number>, lane: number, nowMs: number): number {
  'worklet';
  let best = -1;
  let bestDelta = MISS_MS + 1;
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];
    if (n.lane !== lane || hit[i] !== 0) continue;
    const d = Math.abs(nowMs - n.targetTimeMs);
    if (d < bestDelta) {
      bestDelta = d;
      best = i;
    }
  }
  return best;
}

export interface InputEvent {
  lane: number;
  tMs: number; // audio-clock time of the tap, calibration offset already applied
}

export interface JudgeState {
  hit: number[]; // 0 pending, 1 hit, 2 missed
  score: number;
  combo: number;
  maxCombo: number;
  perfect: number;
  good: number;
  miss: number;
}

export interface ScoreResult {
  score: number;
  maxCombo: number;
  perfect: number;
  good: number;
  miss: number;
  accuracy: number; // 0..1
}

export function newJudgeState(noteCount: number): JudgeState {
  return { hit: new Array(noteCount).fill(0), score: 0, combo: 0, maxCombo: 0, perfect: 0, good: 0, miss: 0 };
}

/** Marks every pending note that slipped past the miss window as missed (breaks combo). */
export function sweepMisses(notes: readonly RhythmNote[], st: JudgeState, nowMs: number): void {
  'worklet';
  for (let i = 0; i < notes.length; i++) {
    if (st.hit[i] === 0 && nowMs - notes[i].targetTimeMs > MISS_MS) {
      st.hit[i] = 2;
      st.miss++;
      st.combo = 0;
    }
  }
}

/** Applies a tap. Returns the grade (0 = stray/miss). */
export function applyTap(notes: readonly RhythmNote[], st: JudgeState, lane: number, nowMs: number): Grade {
  'worklet';
  sweepMisses(notes, st, nowMs);
  const idx = findTarget(notes, st.hit, lane, nowMs);
  if (idx < 0) {
    st.combo = 0;
    return 0;
  }
  const g = gradeDelta(nowMs - notes[idx].targetTimeMs);
  st.hit[idx] = 1;
  if (g === 2) {
    st.perfect++;
    st.score += 300 + st.combo * 5;
  } else {
    st.good++;
    st.score += 100 + st.combo * 2;
  }
  st.combo++;
  if (st.combo > st.maxCombo) st.maxCombo = st.combo;
  return g;
}

export function finalize(notes: readonly RhythmNote[], st: JudgeState): ScoreResult {
  sweepMisses(notes, st, Number.MAX_SAFE_INTEGER);
  const accuracy = notes.length ? (st.perfect + st.good * 0.5) / notes.length : 0;
  return { score: st.score, maxCombo: st.maxCombo, perfect: st.perfect, good: st.good, miss: st.miss, accuracy };
}

/** Pure replay: the same code runs on device (UI) and on the server (payout verification). */
export function replay(notes: readonly RhythmNote[], inputs: readonly InputEvent[]): ScoreResult {
  const st = newJudgeState(notes.length);
  for (const ev of [...inputs].sort((a, b) => a.tMs - b.tMs)) applyTap(notes, st, ev.lane, ev.tMs);
  return finalize(notes, st);
}
