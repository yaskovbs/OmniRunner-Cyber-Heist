// Central economy constants. The server owns the real values; the client mirrors them for UI only.
export const ECONOMY = {
  maxEnergy: 100,
  stepsPerEnergy: 80, // 80 steps = 1 energy
  heistEnergyCost: 25,
  dailyStepGoal: 8000,
  maxCadencePerMin: 200, // anti-cheat ceiling (steps / minute)
  tournamentRake: 0.1,
  rewardedAdEnergy: 10,
  minerBaseRate: 2, // coins / minute per bot level
  minerCapMinutes: 240, // offline accumulation cap
  coinToUsd: 0.0005,
  withdrawMinCoins: 20000,
  repairCostPerWear: 4,
} as const;

export type Rarity = 'common' | 'rare' | 'epic';

export interface GearDef {
  id: string;
  name: string;
  rarity: Rarity;
  cost: number;
  bonus: string;
  lootMultiplier: number;
}

export const GEAR: GearDef[] = [
  { id: 'rig_v1', name: 'Ghost Rig v1', rarity: 'common', cost: 400, bonus: '+5% loot', lootMultiplier: 0.05 },
  { id: 'neuro_gloves', name: 'Neuro Gloves', rarity: 'rare', cost: 1500, bonus: '+12% loot', lootMultiplier: 0.12 },
  { id: 'quantum_deck', name: 'Quantum Deck', rarity: 'epic', cost: 6000, bonus: '+25% loot', lootMultiplier: 0.25 },
];

export const MINER_UPGRADE_COST = (level: number) => Math.round(300 * Math.pow(1.6, level));
