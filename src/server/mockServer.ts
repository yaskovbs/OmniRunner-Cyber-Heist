// In-app stand-in for the Fastify + Postgres + Redis backend. Everything here is "server state":
// the client only ever receives sanitized data and returns raw evidence. Move this folder to a real service
// and replace the `delay()` calls with HTTP — the shared/ modules it imports are the real enforcement logic.
import { verifyHeist, type HeistSubmission, type Verdict } from '@/shared/verify';
import { validateBucket, type StepBucket } from '@/shared/stepAttest';
import { summarizeTrivia, type TriviaAnswer, QUESTION_LIMIT_MS } from '@/shared/triviaGuard';
import { applyTrust, decideWithdrawal, newTrust, tierOf, type TrustEvent, type WithdrawalDecision } from '@/shared/trust';
import { BANK, type BankQuestion } from './questionBank';

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));
let trust = newTrust();
let priorWithdrawals = 0;
const report = (events: TrustEvent[]) => events.length && (trust = applyTrust(trust, events));

const shuffle = <T,>(a: T[]): T[] => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};

/** What the phone receives: no answer, no trap, no honeypot marker. */
export interface PublicQuestion {
  id: number;
  kind: BankQuestion['kind'];
  prompt: string;
  options: string[];
}

interface Session {
  seed: number;
  used: boolean;
  issued: Map<number, { q: BankQuestion; options: string[] }>;
  answers: (TriviaAnswer & { correct: boolean; isHoneypot: boolean; hitTrap: boolean })[];
  lastEventAt: number;
}
const sessions = new Map<string, Session>();

export interface HeistSession {
  sessionId: string;
  seed: number;
  questions: PublicQuestion[];
}

export async function startHeist(): Promise<HeistSession> {
  await delay();
  const sessionId = `h_${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  const seed = Math.floor(Math.random() * 2 ** 31);
  const traps = BANK.filter((q) => q.honeypot);
  const normal = shuffle(BANK.filter((q) => !q.honeypot));
  // Shadowbanned accounts get extra traps so they keep burning trust without learning why.
  const picked = shuffle([...(tierOf(trust.score) === 'shadowban' ? traps : traps.slice(0, 1)), ...normal]).slice(0, 5);
  const issued = new Map<number, { q: BankQuestion; options: string[] }>();
  const questions = picked.map((q) => {
    const options = shuffle([...q.options]);
    issued.set(q.id, { q, options });
    return { id: q.id, kind: q.kind, prompt: q.prompt, options };
  });
  sessions.set(sessionId, { seed, used: false, issued, answers: [], lastEventAt: Date.now() });
  return { sessionId, seed, questions };
}

export async function answerQuestion(sessionId: string, a: TriviaAnswer): Promise<{ correct: boolean }> {
  await delay(120);
  const s = sessions.get(sessionId);
  const item = s?.issued.get(a.questionId);
  if (!s || !item || s.used || s.answers.some((x) => x.questionId === a.questionId)) return { correct: false };
  const { q, options } = item;
  const chosen = options[a.selectedOptionIndex];
  const correct = chosen === q.options[q.answer];
  const hitTrap = !!q.honeypot && chosen === q.options[q.honeypot.trap];
  // Trust the larger of client-claimed and server-observed latency; a client cannot make itself look slower than the wire.
  const serverMs = Date.now() - s.lastEventAt;
  const timeTakenMs = Math.min(QUESTION_LIMIT_MS, Math.max(a.timeTakenMs, serverMs - 1000));
  s.lastEventAt = Date.now();
  s.answers.push({ ...a, timeTakenMs, correct, isHoneypot: !!q.honeypot, hitTrap });
  return { correct };
}

export async function submitHeist(sub: HeistSubmission, gearBonus: number): Promise<Verdict> {
  await delay(400);
  const s = sessions.get(sub.sessionId);
  if (!s || s.used) {
    report(['replayed_session']);
    return { ok: false, reason: 'invalid_session' };
  }
  if (s.seed !== sub.seed) return { ok: false, reason: 'seed_mismatch' };
  s.used = true; // single-use: replay attacks rejected
  const trivia = summarizeTrivia(s.answers);
  const verdict = verifyHeist(sub, trivia, gearBonus);
  report([...trivia.flags, ...(verdict.flags ?? [])]);
  // Do not reveal trivia flags to the client; only the replay result is returned.
  return { ...verdict, flags: undefined };
}

export async function submitStepBucket(b: StepBucket): Promise<{ credited: number }> {
  await delay(150);
  const v = validateBucket(b);
  report(v.flags);
  return { credited: v.credited };
}

export async function requestWithdrawal(coins: number): Promise<WithdrawalDecision & { coins: number }> {
  await delay(300);
  const d = decideWithdrawal(trust, priorWithdrawals);
  priorWithdrawals++;
  return { ...d, coins };
}

export interface LeaderRow {
  name: string;
  score: number;
}

export async function fetchLeaderboard(me: number): Promise<LeaderRow[]> {
  await delay(200);
  // Shadowbanned players are ranked only against bot-labelled accounts.
  const pool = tierOf(trust.score) === 'shadowban'
    ? [{ name: 'bot_0x1', score: 900 }, { name: 'bot_0x2', score: 400 }]
    : [{ name: 'N30N_GH0ST', score: 41200 }, { name: 'ZeroCool', score: 38650 }, { name: 'v0id_runner', score: 30410 }, { name: 'AcidBurn', score: 22980 }];
  return [...pool, { name: 'YOU', score: me }].sort((a, b) => a.score - b.score).reverse();
}
