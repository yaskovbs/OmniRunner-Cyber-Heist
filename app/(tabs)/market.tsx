import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NeonButton, Panel, Stat } from '@/components/ui';
import { requestWithdrawal, useLeaderboard } from '@/api/hooks';
import { useGame } from '@/store/gameStore';
import { ECONOMY, GEAR } from '@/shared/economy';
import { colors, spacing } from '@/theme/theme';

const RARITY = { common: colors.dim, rare: colors.cyan, epic: colors.pink };

export default function BlackMarket() {
  const g = useGame();
  const board = useLeaderboard(g.bestScore);
  const usd = (g.coins * ECONOMY.coinToUsd).toFixed(2);

  const withdraw = async () => {
    const d = await requestWithdrawal(ECONOMY.withdrawMinCoins);
    g.requestWithdraw(ECONOMY.withdrawMinCoins, d);
    const when = d.status === 'queued' ? 'now' : new Date(d.releaseAt).toLocaleString();
    Alert.alert('Request received', `Payouts pass a server-side review. Earliest release: ${when}.`);
  };

  const crack = () => Alert.alert('Server crate', g.openKey() ?? 'You need a key. Hit 8,000 steps in a day.');

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md }}>
      <Panel title="Wallet">
        <View style={{ flexDirection: 'row' }}>
          <Stat label="COINS" value={g.coins} color={colors.yellow} />
          <Stat label="≈ USD" value={`$${usd}`} />
          <Stat label="KEYS" value={g.keys} color={colors.pink} />
        </View>
        <View style={s.btns}>
          <NeonButton label="CRACK CRATE" tone="pink" onPress={crack} disabled={g.keys < 1} style={{ flex: 1 }} />
          <NeonButton label="CASH OUT" tone="yellow" onPress={withdraw} disabled={g.coins < ECONOMY.withdrawMinCoins} style={{ flex: 1 }} />
        </View>
        {g.withdrawals.map((w, i) => <Text key={i} style={s.dim}>{`Withdrawal ${w.coins} · ${w.status} · ${new Date(w.releaseAt).toLocaleDateString()}`}</Text>)}
      </Panel>

      <Panel title="Gear (coin sink)">
        {GEAR.map((it) => {
          const owned = g.owned.includes(it.id);
          const equipped = g.equipped === it.id;
          return (
            <View key={it.id} style={s.item}>
              <View style={{ flex: 1 }}>
                <Text style={[s.name, { color: RARITY[it.rarity] }]}>{it.name}</Text>
                <Text style={s.dim}>{`${it.rarity.toUpperCase()} · ${it.bonus}`}</Text>
              </View>
              {owned ? (
                <NeonButton label={equipped ? 'EQUIPPED' : 'EQUIP'} disabled={equipped} onPress={() => g.equip(it.id)} />
              ) : (
                <NeonButton label={`${it.cost}`} tone="yellow" disabled={g.coins < it.cost} onPress={() => g.buyGear(it.id)} />
              )}
            </View>
          );
        })}
        <Text style={s.dim}>Player-to-player trading ships with the real backend (ledger + escrow).</Text>
      </Panel>

      <Panel title="Weekly leaderboard">
        {board.isLoading && <Text style={s.dim}>Syncing…</Text>}
        {board.data?.map((r, i) => (
          <View key={r.name} style={s.rank}>
            <Text style={[s.name, r.name === 'YOU' && { color: colors.cyan }]}>{`${i + 1}. ${r.name}`}</Text>
            <Text style={s.dim}>{r.score}</Text>
          </View>
        ))}
      </Panel>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  dim: { color: colors.dim, fontFamily: 'monospace', fontSize: 12, marginTop: 4 },
  name: { color: colors.text, fontFamily: 'monospace', fontWeight: '700' },
  btns: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  rank: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
});
