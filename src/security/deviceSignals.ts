import type { LocationObject } from 'expo-location';

/** Android sets `mocked` when the fix came from a mock provider (Developer Options → mock location app). */
export const isMockedFix = (loc: LocationObject) => (loc as LocationObject & { mocked?: boolean }).mocked === true;

/**
 * Device attestation hook.
 * Production: Google Play Integrity (Android) / App Attest (iOS) need native modules, i.e. an EAS dev build —
 * they cannot run in Expo Go. The server sends a nonce, the native module returns a signed token, and the
 * server verifies it with Google/Apple. Until then buckets are sent `attested:false`, which costs a little
 * trust on every bucket (see trust.ts) so unattested clients can never reach the 'trusted' tier.
 */
export async function requestAttestation(_nonce: string): Promise<string | null> {
  return null;
}

export const haversineM = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
