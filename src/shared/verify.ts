import { ECONOMY } from './economy';
import { makeBeatmap, type RhythmNote } from './beatmap';
import { replay, type InputEvent, type ScoreResult } from './judge';

export interface HeistSubmission {
  sessionId: string;
  seed: number;
  inputs: InputEvent[];
  claimed: ScoreResult;
  trivia: { answered: number; correct: number; avgMs: number };
}

export interface Verdict {
  ok: boolean;
  reason?: string;
  verified?: ScoreResult;
  lootCoins?: number;
}

const MIN_HUMAN_GAP_MS = 25; // per-lane taps faster than this are macro/bot behaviour

/** Server-side verification: re-derive the beatmap from the seed and replay the input log. */
export function verifyHeist(sub: HeistSubmission, gearBonus = 0): Verdict {
  const notes: RhythmNote[] = makeBeatmap(sub.seed);
  if (sub.inputs.length > notes.length * 3) return { ok: false, reason: 'too_many_inputs' };

  const byLane = new Map<number, number>();
  for (const ev of [...sub.inputs].sort((a, b) => a.tMs - b.tMs)) {
    const prev = byLane.get(ev.lane);
    if (prev !== undefined && ev.tMs - prev < MIN_HUMAN_GAP_MS) return { ok: false, reason: 'inhuman_input_rate' };
    byLane.set(ev.lane, ev.tMs);
  }

  const verified = replay(notes, sub.inputs);
  if (verified.score !== sub.claimed.score) return { ok: false, reason: 'score_mismatch', verified };
  if (sub.trivia.avgMs < 350 && sub.trivia.answered > 2) return { ok: false, reason: 'trivia_too_fast' };

  const triviaMult = 1 + Math.min(sub.trivia.correct, 6) * 0.1;
  const base = verified.score * 0.12 * (0.4 + verified.accuracy * 0.6);
  return { ok: true, verified, lootCoins: Math.round(base * triviaMult * (1 + gearBonus)) };
}

export interface StepSample {
  startMs: number;
  endMs: number;
  steps: number;
}

/** Caps credited steps by the physically possible cadence for each reported window. */
export function validateSteps(samples: StepSample[]): { credited: number; rejected: number } {
  let credited = 0;
  let rejected = 0;
  for (const s of samples) {
    const minutes = Math.max((s.endMs - s.startMs) / 60000, 1 / 60);
    const cap = Math.floor(minutes * ECONOMY.maxCadencePerMin);
    const ok = Math.min(Math.max(s.steps, 0), cap);
    credited += ok;
    rejected += s.steps - ok;
  }
  return { credited, rejected };
}
