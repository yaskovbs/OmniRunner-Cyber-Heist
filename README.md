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

## Zero-Trust anti-cheat (the phone is never trusted)
| Threat | Defence | Where |
|---|---|---|
| Mock GPS | `Location.mocked` flag in every bucket → 0 credit, big trust penalty | `src/security/deviceSignals.ts`, `shared/stepAttest.ts` |
| Fake steps / phone swinger | 15-min buckets: steps vs GPS displacement (≥0.35 m/step), speed cap, 200 steps/min clamp | `shared/stepAttest.ts` |
| Energy forging | Energy is credited only from the server's verdict (`creditVerified`) | `store/gameStore.ts` |
| Trivia answer sniffing | Answer key stays server-side; client sends `{questionId, selectedOptionIndex, timeTakenMs, touch}` | `server/mockServer.ts` |
| OCR / accessibility scraping | Text drawn as Skia pixels with kerning jitter + noise grid; options hidden from a11y | `game/trivia/SkiaCard.tsx` |
| Bots | 7 s limit, 600 ms reaction floor, identical-pixel tap detection, honeypot questions | `shared/triviaGuard.ts` |
| Score forging | Server replays the input log from the seed; single-use sessions | `shared/verify.ts` |
| Cash-out fraud | Trust Score tiers, 72 h first-withdrawal hold, shadowban → manual review + bot-only leaderboard | `shared/trust.ts` |

Not possible in Expo Go: Play Integrity / App Attest (needs a dev build + native module; the hook is stubbed and unattested clients can never reach the `trusted` tier) and background step collection (needs `expo-task-manager`). Accessibility trade-off: hiding the quiz from screen readers helps against scrapers but also blocks assistive tech — decide per your policy.

## Known limits (Expo Go)
- No music track is bundled yet; the song clock is a monotonic UI-thread clock. Swap in `expo-audio` playback time as the clock source and keep the calibration offset.
- Rewarded ads and Health Connect need a dev build (`eas build --profile development`); Expo Go uses `expo-sensors` Pedometer.
- Android Pedometer has no history query in `expo-sensors`, so steps are counted live while the app runs.
- Withdrawals, marketplace trading and leaderboards are mocked; real payouts need KYC, a ledger and legal review.
