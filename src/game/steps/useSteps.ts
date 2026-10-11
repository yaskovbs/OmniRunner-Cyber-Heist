import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';
import { useGame } from '@/store/gameStore';
import { ECONOMY } from '@/shared/economy';

export type StepStatus = 'checking' | 'granted' | 'denied' | 'unavailable';

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Pulls today's steps retroactively (HealthKit on iOS, Sensor history on Android via expo-sensors),
 * so steps walked while the app was closed still charge the Energy Core.
 * Production: replace the source with Health Connect (Android) for signed per-window samples,
 * then submit them to the server where validateSteps() runs.
 */
export function useSteps(pollMs = 15000) {
  const [status, setStatus] = useState<StepStatus>('checking');
  const syncSteps = useGame((s) => s.syncSteps);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | undefined;
    let watcher: { remove: () => void } | undefined;

    const pull = async () => {
      try {
        const now = new Date();
        const res = await Pedometer.getStepCountAsync(startOfToday(), now);
        const minutes = Math.max((now.getTime() - startOfToday().getTime()) / 60000, 1);
        // Client-side sanity cap; the server re-validates per time window.
        const capped = Math.min(res.steps, Math.floor(minutes * ECONOMY.maxCadencePerMin));
        if (alive) syncSteps(capped);
      } catch {
        /* history can be unsupported (Android) — live watch below covers it */
      }
    };

    (async () => {
      const avail = await Pedometer.isAvailableAsync();
      if (!avail) return alive && setStatus('unavailable');
      const perm = await Pedometer.requestPermissionsAsync();
      if (!perm.granted) return alive && setStatus('denied');
      if (!alive) return;
      setStatus('granted');
      if (Platform.OS === 'ios') {
        await pull();
        timer = setInterval(pull, pollMs);
      } else {
        // expo-sensors has no history query on Android: count live, accumulate on top of today's saved total.
        const base = useGame.getState().stepsToday;
        watcher = Pedometer.watchStepCount((r) => alive && syncSteps(base + r.steps));
      }
    })();

    const sub = AppState.addEventListener('change', (st) => st === 'active' && Platform.OS === 'ios' && pull());
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
      watcher?.remove();
      sub.remove();
    };
  }, [pollMs, syncSteps]);

  return status;
}
