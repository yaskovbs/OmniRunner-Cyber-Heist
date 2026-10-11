import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { useGame } from '@/store/gameStore';
import { ECONOMY } from '@/shared/economy';
import { submitStepBucket } from '@/server/mockServer';
import { haversineM, isMockedFix, requestAttestation } from '@/security/deviceSignals';

export type GeoStatus = 'checking' | 'granted' | 'denied';

/**
 * Sensor fusion + batch attestation. Every window we send steps AND the GPS displacement, mock flag and
 * altitude change; the server decides how many steps count. The phone never credits its own energy.
 * Foreground only in Expo Go — background collection needs expo-task-manager in a dev build.
 */
export function useStepBuckets() {
  const [geo, setGeo] = useState<GeoStatus>('checking');
  const acc = useRef({ start: Date.now(), dist: 0, last: null as Location.LocationObject | null, firstAlt: null as number | null, lastAlt: 0, mock: false });

  useEffect(() => {
    let sub: Location.LocationSubscription | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    let alive = true;

    const flush = async () => {
      const a = acc.current;
      const { stepsToday, stepsSubmitted } = useGame.getState();
      const steps = stepsToday - stepsSubmitted;
      const now = Date.now();
      if (steps <= 0) {
        acc.current = { ...a, start: now, dist: 0, firstAlt: null, mock: false };
        return;
      }
      const attested = (await requestAttestation(`${now}`)) !== null;
      const bucket = {
        startMs: a.start, endMs: now, steps, distanceM: a.dist,
        altitudeDeltaM: a.firstAlt === null ? 0 : a.lastAlt - a.firstAlt, mockLocation: a.mock, attested,
      };
      acc.current = { ...a, start: now, dist: 0, firstAlt: null, mock: false };
      try {
        const res = await submitStepBucket(bucket);
        useGame.getState().markSubmitted(stepsToday); // consumed either way: rejected steps are gone, not retried
        useGame.getState().creditVerified(res.credited);
      } catch {
        /* network error: keep steps pending, they ride the next bucket */
      }
    };

    (async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!alive) return;
      if (!perm.granted) return setGeo('denied');
      setGeo('granted');
      sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, distanceInterval: 5 }, (loc) => {
        const a = acc.current;
        if (isMockedFix(loc)) a.mock = true;
        if ((loc.coords.accuracy ?? 999) < 60) {
          if (a.last) a.dist += haversineM(a.last.coords, loc.coords);
          a.last = loc;
          if (loc.coords.altitude != null) {
            a.firstAlt ??= loc.coords.altitude;
            a.lastAlt = loc.coords.altitude;
          }
        }
      });
      timer = setInterval(flush, __DEV__ ? 60_000 : ECONOMY.bucketMs);
    })();

    return () => {
      alive = false;
      sub?.remove();
      if (timer) clearInterval(timer);
    };
  }, []);

  return geo;
}
