import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NeonButton, Panel } from '@/components/ui';
import { CircuitBoard } from '@/game/puzzle/CircuitBoard';
import { useGame } from '@/store/gameStore';
import { ECONOMY, MINER_UPGRADE_COST } from '@/shared/economy';
import { colors, spacing } from '@/theme/theme';

const TARGETS = ['NeoBank Edge', 'Kiroshi Labs', 'Orbital Ledger', 'Tyrell Cold-Storage', 'Weyland DB'];

export default function Terminal() {
  const g = useGame();
  const [round, setRound] = useState(0);
  const [pending, setPending] = useState(g.minerPending());
  const target = TARGETS[round % TARGETS.length];
  const alreadyOwned = g.bots.some((b) => b.serverId === target);

  useEffect(() => {
    const id = setInterval(() => setPending(useGame.getState().minerPending()), 2000);
    return () => clearInterval(id);
  }, []);

  const solved = (moves: number, ms: number) => {
    g.deployBot(target);
    Alert.alert('Breach complete', `${target} pwned in ${moves} moves / ${(ms / 1000).toFixed(1)}s.\nMining bot deployed.`, [
      { text: 'Next target', onPress: () => setRound((r) => r + 1) },
    ]);
  };

  const rate = g.bots.reduce((a, b) => a + b.level * ECONOMY.minerBaseRate, 0);

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md }}>
      <Panel title={`Target: ${target}`}>
        {alreadyOwned ? (
          <>
            <Text style={s.dim}>Bot already running here. Skip to the next target.</Text>
            <NeonButton label="NEXT TARGET" onPress={() => setRound((r) => r + 1)} style={{ marginTop: 10 }} />
          </>
        ) : (
          <CircuitBoard key={round} seed={1000 + round * 7919} onSolved={solved} />
        )}
      </Panel>

      <Panel title="Mining farm (idle)">
        <Text style={s.big}>{`${rate} coins/min`}</Text>
        <Text style={s.dim}>{`Pending: ${pending} (cap ${ECONOMY.minerCapMinutes} min offline)`}</Text>
        <NeonButton label="COLLECT" tone="yellow" disabled={pending < 1} onPress={() => setPending(g.collectMiner() * 0)} style={{ marginTop: 10 }} />
        {g.bots.length === 0 && <Text style={[s.dim, { marginTop: 10 }]}>No bots deployed. Solve a circuit to breach a server.</Text>}
        {g.bots.map((b) => {
          const cost = MINER_UPGRADE_COST(b.level);
          return (
            <View key={b.serverId} style={s.bot}>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{b.serverId}</Text>
                <Text style={s.dim}>{`Lv ${b.level} · ${b.level * ECONOMY.minerBaseRate}/min`}</Text>
              </View>
              <NeonButton label={`UPGRADE ${cost}`} disabled={g.coins < cost} onPress={() => g.upgradeBot(b.serverId)} />
            </View>
          );
        })}
      </Panel>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  dim: { color: colors.dim, fontFamily: 'monospace', fontSize: 12 },
  big: { color: colors.yellow, fontFamily: 'monospace', fontSize: 24, fontWeight: '700' },
  bot: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  name: { color: colors.text, fontFamily: 'monospace', fontWeight: '700' },
});
