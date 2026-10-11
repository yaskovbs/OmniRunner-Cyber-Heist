import { makeBeatmap } from './beatmap';
import { replay, type InputEvent } from './judge';
import { validateSteps, verifyHeist } from './verify';

const assert = (c: boolean, m: string) => {
  if (!c) throw new Error('FAIL: ' + m);
  console.log('ok -', m);
};

const notes = makeBeatmap(42);
const perfect: InputEvent[] = notes.map((n) => ({ lane: n.lane, tMs: n.targetTimeMs + 5 }));
const r = replay(notes, perfect);
assert(r.perfect === notes.length && r.miss === 0, 'perfect run scores all perfect');
assert(replay(notes, []).miss === notes.length, 'empty run misses everything');

const sub = { sessionId: 's', seed: 42, inputs: perfect, claimed: r, trivia: { answered: 3, correct: 3, avgMs: 2500 } };
assert(verifyHeist(sub).ok === true, 'honest submission verifies');
assert(verifyHeist({ ...sub, claimed: { ...r, score: r.score + 1 } }).reason === 'score_mismatch', 'forged score rejected');
assert(verifyHeist({ ...sub, seed: 7 }).ok === false, 'wrong seed rejected');

const v = validateSteps([{ startMs: 0, endMs: 60000, steps: 10000 }]);
assert(v.credited === 200 && v.rejected === 9800, 'step spike clamped to cadence cap');
