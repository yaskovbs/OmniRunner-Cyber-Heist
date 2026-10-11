export interface RhythmNote {
  id: number;
  lane: number;
  targetTimeMs: number;
}

export const LANE_COUNT = 4;
export const BPM = 120;
export const BEAT_MS = 60000 / BPM;

/** Deterministic beatmap from a seed (mulberry32) — the server regenerates the same map to verify logs. */
export function makeBeatmap(seed: number, beats = 48): RhythmNote[] {
  let t = seed >>> 0;
  const rnd = () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
  const notes: RhythmNote[] = [];
  let lastLane = -1;
  for (let i = 0; i < beats; i++) {
    if (i > 3 && rnd() < 0.22) continue; // rests
    let lane = Math.floor(rnd() * LANE_COUNT);
    if (lane === lastLane) lane = (lane + 1) % LANE_COUNT;
    lastLane = lane;
    notes.push({ id: notes.length, lane, targetTimeMs: 2500 + i * BEAT_MS });
  }
  return notes;
}
