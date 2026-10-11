import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bar, NeonButton, Panel, Stat } from '@/components/ui';
import { useGame } from '@/store/gameStore';
import { useSteps } from '@/game/steps/useSteps';
import { useStepBuckets } from '@/game/steps/useStepBuckets';
import { ECONOMY } from '@/shared/economy';
import { colors, spacing } from '@/theme/theme';

const STATUS_TEXT = {
  checking: 'Requesting motion access…',
  granted: 'Pedometer linked',
  denied: 'Motion permission denied — enable it in Settings',
  unavailable: 'No pedometer on this device (use Expo Go on a phone)',
};

export default function Hub() {
  const router = useRouter();
  const status = useSteps();
  const geo = useStepBuckets();
  const g = useGame();
  const [adCooldown, setAdCooldown] = useState(false);

  const canClaim = !g.dailyKeyClaimed && g.stepsVerified >= ECONOMY.dailyStepGoal;

  const claim = () => {
    if (g.claimDailyKey()) Alert.alert('Server key acquired', 'Open it in the Black Market to crack the encrypted server crate.');
  };

  // Placeholder for a rewarded-ad SDK (e.g. Google AdMob via a dev build). Expo Go cannot load native ad SDKs.
  const watchAd = () => {
    setAdCooldown(true);
    setTimeout(() => {
      g.addEnergy(ECONOMY.rewardedAdEnergy);
      setAdCooldown(false);
    }, 1500);
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={s.content}>
      <Panel title="Operative">
        <Text style={s.agent}>🕶️ AGENT_{(g.heists + 7).toString(16).toUpperCase().padStart(3, '0')}</Text>
        <Text style={s.sub}>{g.equipped ? `Rig: ${g.equipped}` : 'No rig equipped — visit the Black Market'}</Text>
        <View style={s.row}>
          <Stat label="COINS" value={g.coins} color={colors.yellow} />
          <Stat label="HEISTS" value={g.heists} />
          <Stat label="BEST" value={g.bestScore} color={colors.pink} />
        </View>
      </Panel>

      <Panel title="Energy core">
        <Bar value={g.energy} max={ECONOMY.maxEnergy} color={colors.cyan} label="ENERGY" />
        <Bar value={g.stepsVerified} max={ECONOMY.dailyStepGoal} color={colors.purple} label="VERIFIED STEPS" />
        <Text style={s.sub}>{`Raw ${g.stepsToday} · server-verified ${g.stepsVerified} (checked every ${__DEV__ ? '1' : '15'} min against GPS)`}</Text>
        {geo === 'denied' && <Text style={[s.sub, { color: colors.red }]}>Location is required to verify steps — enable it in Settings</Text>}
        <Text style={s.sub}>{STATUS_TEXT[status]}</Text>
        <Text style={s.sub}>{`${ECONOMY.stepsPerEnergy} steps = 1 energy · a heist costs ${ECONOMY.heistEnergyCost}`}</Text>
        <View style={s.btnRow}>
          <NeonButton label={`+${ECONOMY.rewardedAdEnergy} ⚡ WATCH AD`} tone="yellow" onPress={watchAd} disabled={adCooldown} style={{ flex: 1 }} />
          <NeonButton label={g.dailyKeyClaimed ? 'KEY CLAIMED' : 'CLAIM 8K KEY'} onPress={claim} disabled={!canClaim} style={{ flex: 1 }} />
        </View>
      </Panel>

      <Panel title="Active missions">
        <Mission
          title="Corp Vault: Arasaka-7"
          detail={`Decrypt archives → escape. Cost ${ECONOMY.heistEnergyCost} ⚡`}
          action="START HEIST"
          ok={g.energy >= ECONOMY.heistEnergyCost}
          onPress={() => router.push('/vault')}
        />
        <Mission title="Breach a server" detail="Solve the circuit to deploy a mining bot" action="TERMINAL" ok onPress={() => router.push('/terminal')} />
        <Mission
          title="Walk 8,000 steps"
          detail={`${Math.min(g.stepsVerified, ECONOMY.dailyStepGoal)} / ${ECONOMY.dailyStepGoal} · reward: encrypted server crate`}
          action={g.dailyKeyClaimed ? 'DONE' : 'KEEP MOVING'}
          ok={false}
          onPress={() => {}}
        />
      </Panel>
    </ScrollView>
  );
}

const Mission = ({ title, detail, action, ok, onPress }: { title: string; detail: string; action: string; ok: boolean; onPress: () => void }) => (
  <View style={s.mission}>
    <View style={{ flex: 1, paddingRight: spacing.sm }}>
      <Text style={s.mTitle}>{title}</Text>
      <Text style={s.sub}>{detail}</Text>
    </View>
    <NeonButton label={action} onPress={onPress} disabled={!ok} />
  </View>
);

const s = StyleSheet.create({
  content: { padding: spacing.md },
  agent: { color: colors.cyan, fontFamily: 'monospace', fontSize: 20, fontWeight: '700' },
  sub: { color: colors.dim, fontFamily: 'monospace', fontSize: 12, marginTop: 4 },
  row: { flexDirection: 'row', marginTop: spacing.md },
  btnRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  mission: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
  mTitle: { color: colors.text, fontFamily: 'monospace', fontWeight: '700' },
});
