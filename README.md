# OmniRunner: Cyber Heist

Cyber-Operative RPG built with **Expo SDK 57 + Expo Router + Expo Go**.
Steps charge energy → circuit puzzle breaches servers → movie trivia decrypts vaults → rhythm escape pays out → server-verified rewards.

## Run
```bash
npm install
npx expo start        # scan the QR code with Expo Go (iOS / Android)
npm test              # replay + anti-cheat self test
npm run typecheck
```

## Architecture
- `app/` — Expo Router screens: Hub, Terminal, Vault, Black Market.
- `src/shared/` — pure logic shared with the future backend: beatmap, judge/replay, `verifyHeist`, `validateSteps`, economy.
- `src/game/rhythm/` — Skia canvas + Reanimated shared values; taps judged on the UI thread via `Gesture.Manual`.
- `src/api/mockServer.ts` — stand-in for Fastify + Postgres + Redis. Replace the bodies with `fetch` calls.
- `src/store/gameStore.ts` — Zustand (persisted) client state.

## Known limits (Expo Go)
- No music track is bundled yet; the song clock is a monotonic UI-thread clock. Swap in `expo-audio` playback time as the clock source and keep the calibration offset.
- Rewarded ads and Health Connect need a dev build (`eas build --profile development`); Expo Go uses `expo-sensors` Pedometer.
- Android Pedometer has no history query in `expo-sensors`, so steps are counted live while the app runs.
- Withdrawals, marketplace trading and leaderboards are mocked; real payouts need KYC, a ledger and legal review.
