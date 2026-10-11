import { ECONOMY } from './economy';
import type { TrustEvent } from './trust';

/** One 15-minute attestation bucket sent by the client. Nothing in it is trusted until cross-checked. */
export interface StepBucket {
  startMs: number;
  endMs: number;
  steps: number;
  distanceM: number; // GPS path length inside the window
  altitudeDeltaM: number; // barometer / GPS altitude change
  mockLocation: boolean; // Location.mocked (Android) / provider flag
  attested: boolean; // Play Integrity / App Attest token verified by the server
}

export interface BucketVerdict {
  credited: number;
  flags: TrustEvent[];
  reason?: string;
}

const MIN_METERS_PER_STEP = 0.35; // a real stride is ~0.6–0.9 m; below this the phone is not travelling (phone swinger)
const MIN_STEPS_FOR_FUSION = 150; // too few steps to judge: allow without distance proof
const MAX_SPEED_MS = 7.5; // ~27 km/h: faster than a sprint means a vehicle or spoofed jump

export function validateBucket(b: StepBucket): BucketVerdict {
  const flags: TrustEvent[] = [];
  const minutes = (b.endMs - b.startMs) / 60000;
  if (!(minutes > 0) || b.steps < 0) return { credited: 0, flags: ['cadence_clamped'], reason: 'bad_window' };
  if (b.endMs > Date.now() + 60_000) return { credited: 0, flags: ['cadence_clamped'], reason: 'future_window' };

  if (!b.attested) flags.push('unattested_device');
  if (b.mockLocation) return { credited: 0, flags: [...flags, 'mock_location'], reason: 'mock_location' };

  let credited = b.steps;
  const cap = Math.floor(minutes * ECONOMY.maxCadencePerMin);
  if (credited > cap) {
    credited = cap;
    flags.push('cadence_clamped');
  }

  if (credited >= MIN_STEPS_FOR_FUSION) {
    const speed = b.distanceM / (minutes * 60);
    if (speed > MAX_SPEED_MS) return { credited: 0, flags: [...flags, 'speed_anomaly'], reason: 'vehicle_or_spoof' };
    if (b.distanceM < credited * MIN_METERS_PER_STEP) {
      // Steps without matching displacement: scale credit down toward zero instead of a hard reject.
      const ratio = Math.max(0, b.distanceM / (credited * MIN_METERS_PER_STEP));
      credited = Math.floor(credited * ratio * ratio);
      flags.push('swinger');
    }
  }
  if (flags.filter((f: TrustEvent) => f !== 'unattested_device').length === 0) flags.push('clean_bucket');
  return { credited, flags };
}
