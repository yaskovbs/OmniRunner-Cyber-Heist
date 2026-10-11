import { makeBeatmap } from './beatmap';
import { replay, type InputEvent } from './judge';
import { verifyHeist } from './verify';
import { validateBucket, type StepBucket } from './stepAttest';
import { summarizeTrivia } from './triviaGuard';
import { applyTrust, decideWithdrawal, newTrust, tierOf } from './trust';

const assert = (c: boolean, m: string) => {
  if (!c) throw new Error('FAIL: ' + m);
  console.log('ok -', m);
};

// --- rhythm replay / heist verification ---
const notes = makeBeatmap(42);
const perfect: InputEvent[] = notes.map((n) => ({ lane: n.lane, tMs: n.targetTimeMs + 5 }));
const r = replay(notes, perfect);
assert(r.perfect === notes.length && r.miss === 0, 'perfect run scores all perfect');
assert(replay(notes, []).miss === notes.length, 'empty run misses everything');
const clean = { answered: 5, correct: 4, avgMs: 2500, honeypotHits: 0, flags: [] };
const sub = { sessionId: 's', seed: 42, inputs: perfect, claimed: r };
assert(verifyHeist(sub, clean).ok === true, 'honest submission verifies');
assert(verifyHeist({ ...sub, claimed: { ...r, score: r.score + 1 } }, clean).reason === 'score_mismatch', 'forged score rejected');
assert(verifyHeist({ ...sub, seed: 7 }, clean).ok === false, 'wrong seed rejected');

// --- step attestation / sensor fusion ---
const now = Date.now();
const win = (o: Partial<StepBucket>): StepBucket => ({
  startMs: now - 15 * 60000, endMs: now - 1000, steps: 1500, distanceM: 1100, altitudeDeltaM: 2, mockLocation: false, attested: true, ...o,
});
assert(validateBucket(win({})).credited === 1500, 'real walk fully credited');
assert(validateBucket(win({ mockLocation: true })).credited === 0, 'mock location credits nothing');
assert(validateBucket(win({ distanceM: 3 })).credited < 5, 'phone swinger (steps, no movement) ~zero');
assert(Math.abs(validateBucket(win({ steps: 10000 })).credited - 3000) <= 10, 'cadence clamped to 200/min');
assert(validateBucket(win({ distanceM: 15 * 60 * 12 })).credited === 0, 'vehicle speed rejected');

// --- trivia guard ---
const ans = (ms: number, x: number, trap = false) => ({
  questionId: 1, selectedOptionIndex: 0, timeTakenMs: ms, touch: { x, y: 5, force: 0 }, correct: !trap, isHoneypot: trap, hitTrap: trap,
});
assert(summarizeTrivia([ans(220, 1), ans(250, 2), ans(240, 3)]).flags.includes('inhuman_reaction'), 'sub-600ms answers flagged');
assert(summarizeTrivia([ans(2000, 9), ans(2500, 9), ans(3000, 9)]).flags.includes('identical_touch'), 'pixel-identical taps flagged');
assert(summarizeTrivia([ans(2000, 1, true)]).flags.includes('honeypot_hit'), 'honeypot trap flagged');
assert(summarizeTrivia([ans(2000, 1), ans(2600, 8), ans(3100, 4)]).flags.length === 0, 'human answers clean');

// --- trust + withdrawals ---
let t = newTrust();
assert(tierOf(t.score) === 'normal', 'new account starts normal');
t = applyTrust(t, ['mock_location']);
assert(tierOf(t.score) === 'shadowban', 'mock location drops to shadowban');
assert(decideWithdrawal(t, 3).status === 'manual_review', 'shadowban goes to manual review');
assert(decideWithdrawal(newTrust(), 0).status === 'held', 'first withdrawal held 72h');
