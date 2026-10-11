import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ECONOMY, GEAR, MINER_UPGRADE_COST } from '@/shared/economy';

const dayKey = () => new Date().toISOString().slice(0, 10);

export interface MinerBot {
  serverId: string;
  level: number;
}

interface GameState {
  day: string;
  energy: number;
  stepsToday: number;
  stepsSubmitted: number; // raw steps already sent to the server in attestation buckets
  stepsVerified: number; // steps the SERVER credited today
  stepCarry: number;
  dailyKeyClaimed: boolean;
  keys: number;
  coins: number;
  owned: string[];
  equipped: string | null;
  bots: MinerBot[];
  lastMinerCollect: number;
  calibrationMs: number;
  heists: number;
  bestScore: number;
  withdrawals: { coins: number; status: string; releaseAt: number }[];

  syncSteps: (rawToday: number) => void;
  markSubmitted: (rawSteps: number) => void;
  creditVerified: (steps: number) => void;
  spendEnergy: (n: number) => boolean;
  addEnergy: (n: number) => void;
  addCoins: (n: number) => void;
  claimDailyKey: () => boolean;
  openKey: () => string | null;
  buyGear: (id: string) => boolean;
  equip: (id: string | null) => void;
  deployBot: (serverId: string) => void;
  upgradeBot: (serverId: string) => boolean;
  minerPending: () => number;
  collectMiner: () => number;
  setCalibration: (ms: number) => void;
  recordHeist: (score: number, coins: number) => void;
  requestWithdraw: (coins: number, decision: { status: string; releaseAt: number }) => boolean;
  lootBonus: () => number;
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      day: dayKey(),
      energy: 40,
      stepsToday: 0,
      stepsSubmitted: 0,
      stepsVerified: 0,
      stepCarry: 0,
      dailyKeyClaimed: false,
      keys: 0,
      coins: 250,
      owned: [],
      equipped: null,
      bots: [],
      lastMinerCollect: Date.now(),
      calibrationMs: 0,
      heists: 0,
      bestScore: 0,
      withdrawals: [],

      // Raw pedometer value: display only. Energy is credited exclusively by creditVerified() after server validation.
      syncSteps: (rawToday) => {
        if (get().day !== dayKey()) {
          set({ day: dayKey(), stepsToday: 0, stepsSubmitted: 0, stepsVerified: 0, stepCarry: 0, dailyKeyClaimed: false });
        }
        set({ stepsToday: Math.max(get().stepsToday, rawToday) });
      },
      markSubmitted: (rawSteps) => set({ stepsSubmitted: rawSteps }),
      creditVerified: (steps) => {
        const s = get();
        const total = s.stepCarry + steps;
        const gain = Math.floor(total / ECONOMY.stepsPerEnergy);
        set({
          stepsVerified: s.stepsVerified + steps,
          stepCarry: total - gain * ECONOMY.stepsPerEnergy,
          energy: Math.min(ECONOMY.maxEnergy, s.energy + gain),
        });
      },
      spendEnergy: (n) => {
        if (get().energy < n) return false;
        set({ energy: get().energy - n });
        return true;
      },
      addEnergy: (n) => set({ energy: Math.min(ECONOMY.maxEnergy, get().energy + n) }),
      addCoins: (n) => set({ coins: get().coins + n }),
      claimDailyKey: () => {
        const s = get();
        if (s.dailyKeyClaimed || s.stepsVerified < ECONOMY.dailyStepGoal) return false;
        set({ dailyKeyClaimed: true, keys: s.keys + 1 });
        return true;
      },
      openKey: () => {
        const s = get();
        if (s.keys < 1) return null;
        const r = Math.random();
        const pick = r < 0.6 ? GEAR[0] : r < 0.9 ? GEAR[1] : GEAR[2];
        const dupe = s.owned.includes(pick.id);
        set({ keys: s.keys - 1, owned: dupe ? s.owned : [...s.owned, pick.id], coins: s.coins + (dupe ? pick.cost / 4 : 0) });
        return dupe ? `${pick.name} (duplicate → ${pick.cost / 4} coins)` : pick.name;
      },
      buyGear: (id) => {
        const g = GEAR.find((x) => x.id === id);
        const s = get();
        if (!g || s.owned.includes(id) || s.coins < g.cost) return false;
        set({ coins: s.coins - g.cost, owned: [...s.owned, id], equipped: s.equipped ?? id });
        return true;
      },
      equip: (id) => set({ equipped: id }),
      deployBot: (serverId) => {
        const s = get();
        if (s.bots.some((b) => b.serverId === serverId)) return;
        get().collectMiner();
        set({ bots: [...get().bots, { serverId, level: 1 }] });
      },
      upgradeBot: (serverId) => {
        const s = get();
        const bot = s.bots.find((b) => b.serverId === serverId);
        if (!bot) return false;
        const cost = MINER_UPGRADE_COST(bot.level);
        if (s.coins < cost) return false;
        get().collectMiner();
        set({
          coins: get().coins - cost,
          bots: get().bots.map((b) => (b.serverId === serverId ? { ...b, level: b.level + 1 } : b)),
        });
        return true;
      },
      minerPending: () => {
        const s = get();
        const mins = Math.min((Date.now() - s.lastMinerCollect) / 60000, ECONOMY.minerCapMinutes);
        const rate = s.bots.reduce((a, b) => a + b.level * ECONOMY.minerBaseRate, 0);
        return Math.floor(mins * rate);
      },
      collectMiner: () => {
        const n = get().minerPending();
        set({ coins: get().coins + n, lastMinerCollect: Date.now() });
        return n;
      },
      setCalibration: (ms) => set({ calibrationMs: Math.max(-250, Math.min(250, Math.round(ms))) }),
      recordHeist: (score, coins) =>
        set({ heists: get().heists + 1, bestScore: Math.max(get().bestScore, score), coins: get().coins + coins }),
      requestWithdraw: (coins, decision) => {
        const s = get();
        if (coins < ECONOMY.withdrawMinCoins || s.coins < coins) return false;
        set({ coins: s.coins - coins, withdrawals: [...s.withdrawals, { coins, status: decision.status, releaseAt: decision.releaseAt }] });
        return true;
      },
      lootBonus: () => GEAR.find((g) => g.id === get().equipped)?.lootMultiplier ?? 0,
    }),
    { name: 'omnirunner-save-v2', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
