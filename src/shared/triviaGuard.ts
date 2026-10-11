import type { TrustEvent } from './trust';

export interface TouchMeta {
  x: number;
  y: number;
  force: number; // 0 when the platform does not report pressure
}

/** What the client sends per answer. The server never ships the answer key to the phone. */
export interface TriviaAnswer {
  questionId: number;
  selectedOptionIndex: number;
  timeTakenMs: number;
  touch: TouchMeta;
}

export interface TriviaStats {
  answered: number;
  correct: number;
  avgMs: number;
  honeypotHits: number;
  flags: TrustEvent[];
}

export const REACTION_FLOOR_MS = 600; // reading a prompt + 4 options + a physical tap
export const QUESTION_LIMIT_MS = 7000;

export function summarizeTrivia(answers: (TriviaAnswer & { correct: boolean; isHoneypot: boolean; hitTrap: boolean })[]): TriviaStats {
  const flags = new Set<TrustEvent>();
  const times = answers.map((a) => a.timeTakenMs);
  const avgMs = times.length ? times.reduce((a, b) => a + b, 0) / times.length : QUESTION_LIMIT_MS;

  const fast = answers.filter((a) => a.timeTakenMs < REACTION_FLOOR_MS).length;
  if (fast >= 2 || (answers.length > 0 && fast === answers.length)) flags.add('inhuman_reaction');

  // Scripted taps hit the exact same pixel every time; human taps scatter.
  const spots = new Set(answers.map((a) => `${Math.round(a.touch.x)}:${Math.round(a.touch.y)}`));
  if (answers.length >= 3 && spots.size === 1) flags.add('identical_touch');

  const honeypotHits = answers.filter((a) => a.isHoneypot && a.hitTrap).length;
  if (honeypotHits > 0) flags.add('honeypot_hit');

  return {
    answered: answers.length,
    correct: answers.filter((a) => a.correct && !a.isHoneypot).length,
    avgMs,
    honeypotHits,
    flags: [...flags],
  };
}
