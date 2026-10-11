// In-app stand-in for the Fastify/Postgres/Redis backend described in the architecture.
// It imports the SAME verification code the real server runs, so swapping to HTTP changes only this file.
import { verifyHeist, type HeistSubmission, type Verdict } from '@/shared/verify';

const sessions = new Map<string, { seed: number; used: boolean }>();
const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

export interface HeistSession {
  sessionId: string;
  seed: number;
}

export async function startHeist(): Promise<HeistSession> {
  await delay();
  const sessionId = `h_${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  const seed = Math.floor(Math.random() * 2 ** 31);
  sessions.set(sessionId, { seed, used: false });
  return { sessionId, seed };
}

export async function submitHeist(sub: HeistSubmission, gearBonus: number): Promise<Verdict> {
  await delay(400);
  const sess = sessions.get(sub.sessionId);
  if (!sess || sess.used) return { ok: false, reason: 'invalid_session' };
  if (sess.seed !== sub.seed) return { ok: false, reason: 'seed_mismatch' };
  sess.used = true; // single-use session: replay attacks rejected
  return verifyHeist(sub, gearBonus);
}

export interface LeaderRow {
  name: string;
  score: number;
}

export async function fetchLeaderboard(me: number): Promise<LeaderRow[]> {
  await delay(200);
  const rows: LeaderRow[] = [
    { name: 'N30N_GH0ST', score: 41200 },
    { name: 'ZeroCool', score: 38650 },
    { name: 'v0id_runner', score: 30410 },
    { name: 'AcidBurn', score: 22980 },
    { name: 'YOU', score: me },
  ];
  return rows.sort((a, b) => b.score - a.score);
}
