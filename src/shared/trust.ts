// Trust Score engine. Never tell the client why its score changed — a visible ban teaches bot authors what to fix.
export type TrustTier = 'trusted' | 'normal' | 'shadowban';

export type TrustEvent =
  | 'clean_bucket' | 'clean_heist'
  | 'mock_location' | 'swinger' | 'cadence_clamped' | 'speed_anomaly' | 'unattested_device'
  | 'honeypot_hit' | 'inhuman_reaction' | 'identical_touch' | 'forged_score' | 'replayed_session';

const DELTA: Record<TrustEvent, number> = {
  clean_bucket: 1,
  clean_heist: 2,
  mock_location: -40,
  swinger: -25,
  cadence_clamped: -10,
  speed_anomaly: -15,
  unattested_device: -2, // Expo Go cannot attest; real builds should send a Play Integrity / App Attest token
  honeypot_hit: -30,
  inhuman_reaction: -20,
  identical_touch: -15,
  forged_score: -50,
  replayed_session: -50,
};

export interface TrustState {
  score: number; // 0..100
  history: { event: TrustEvent; at: number }[];
}

export const newTrust = (): TrustState => ({ score: 70, history: [] });

export function applyTrust(t: TrustState, events: TrustEvent[], at = Date.now()): TrustState {
  let score = t.score;
  for (const e of events) score = Math.max(0, Math.min(100, score + DELTA[e]));
  return { score, history: [...t.history, ...events.map((event) => ({ event, at }))].slice(-200) };
}

export const tierOf = (score: number): TrustTier => (score > 80 ? 'trusted' : score < 50 ? 'shadowban' : 'normal');

export interface WithdrawalDecision {
  status: 'held' | 'manual_review' | 'queued';
  releaseAt: number;
}

const HOUR = 3_600_000;

/** First cash-outs wait 72h so the server can scan history; shadowbanned accounts go to manual review. */
export function decideWithdrawal(t: TrustState, priorWithdrawals: number, now = Date.now()): WithdrawalDecision {
  const tier = tierOf(t.score);
  if (tier === 'shadowban') return { status: 'manual_review', releaseAt: now + 14 * 24 * HOUR };
  if (priorWithdrawals === 0) return { status: 'held', releaseAt: now + 72 * HOUR };
  return { status: tier === 'trusted' ? 'queued' : 'held', releaseAt: now + (tier === 'trusted' ? 0 : 24 * HOUR) };
}
