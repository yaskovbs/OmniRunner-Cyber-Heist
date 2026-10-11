import type { TriviaStats } from './triviaGuard';
import type { TrustEvent } from './trust';
import { makeBeatmap, type RhythmNote } from './beatmap';
import { replay, type InputEvent, type ScoreResult } from './judge';

export interface HeistSubmission {
  sessionId: string;
  seed: number;
  inputs: InputEvent[];
  claimed: ScoreResult;
}

export interface Verdict {
  ok: boolean;
  reason?: string;
  flags?: TrustEvent[];
  verified?: ScoreResult;
  lootCoins?: number;
}

const MIN_HUMAN_GAP_MS = 25; // per-lane taps faster than this are macro/bot behaviour

/** Server-side verification: re-derive the beatmap from the seed and replay the input log. */
/** `trivia` comes from the server's own session record — the client can no longer claim trivia results. */
export function verifyHeist(sub: HeistSubmission, trivia: TriviaStats, gearBonus = 0): Verdict {
  const notes: RhythmNote[] = makeBeatmap(sub.seed);
  if (sub.inputs.length > notes.length * 3) return { ok: false, reason: 'too_many_inputs', flags: ['forged_score'] };

  const byLane = new Map<number, number>();
  for (const ev of [...sub.inputs].sort((a, b) => a.tMs - b.tMs)) {
    const prev = byLane.get(ev.lane);
    if (prev !== undefined && ev.tMs - prev < MIN_HUMAN_GAP_MS) return { ok: false, reason: 'inhuman_input_rate', flags: ['inhuman_reaction'] };
    byLane.set(ev.lane, ev.tMs);
  }

  const verified = replay(notes, sub.inputs);
  if (verified.score !== sub.claimed.score) return { ok: false, reason: 'score_mismatch', verified, flags: ['forged_score'] };
  const triviaMult = 1 + Math.min(trivia.correct, 6) * 0.1;
  const base = verified.score * 0.12 * (0.4 + verified.accuracy * 0.6);
  return { ok: true, flags: ['clean_heist'], verified, lootCoins: Math.round(base * triviaMult * (1 + gearBonus)) };
}
