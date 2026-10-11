import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NeonButton, Panel, Stat } from '@/components/ui';
import { TriviaGame, type TriviaResult } from '@/game/trivia/TriviaGame';
import { RhythmGame, type RhythmOutcome } from '@/game/rhythm/RhythmGame';
import { useStartHeist, useSubmitHeist } from '@/api/hooks';
import { useGame } from '@/store/gameStore';
import { ECONOMY } from '@/shared/economy';
import type { Verdict } from '@/shared/verify';
import { colors, spacing } from '@/theme/theme';

type Phase = 'lobby' | 'trivia' | 'rhythm' | 'submitting' | 'result';

export default function Vault() {
  const g = useGame();
  const startMut = useStartHeist();
  const submitMut = useSubmitHeist();
  const [phase, setPhase] = useState<Phase>('lobby');
  const [session, setSession] = useState<{ sessionId: string; seed: number } | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const trivia = useRef<TriviaResult>({ answered: 0, correct: 0, avgMs: 0 });

  const start = async () => {
    if (!g.spendEnergy(ECONOMY.heistEnergyCost)) return;
    try {
      setSession(await startMut.mutateAsync());
      setPhase('trivia');
    } catch {
      g.addEnergy(ECONOMY.heistEnergyCost); // refund if the server could not open a session
    }
  };

  const onTrivia = (r: TriviaResult) => {
    trivia.current = r;
    setPhase('rhythm');
  };

  const onRhythm = async ({ result, inputs }: RhythmOutcome) => {
    if (!session) return;
    setPhase('submitting');
    const v = await submitMut.mutateAsync({
      sub: { sessionId: session.sessionId, seed: session.seed, inputs, claimed: result, trivia: trivia.current },
      gearBonus: g.lootBonus(),
    });
    if (v.ok && v.lootCoins !== undefined && v.verified) g.recordHeist(v.verified.score, v.lootCoins);
    setVerdict(v);
    setPhase('result');
  };

  if (phase === 'rhythm' && session) {
    return <RhythmGame seed={session.seed} calibrationMs={g.calibrationMs} onFinish={onRhythm} />;
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.md }}>
      {phase === 'lobby' && (
        <>
          <Panel title="Corp vault: Arasaka-7">
            <Text style={s.text}>1. Decrypt the archive (movie trivia). Fast, correct answers multiply loot.</Text>
            <Text style={s.text}>2. Escape through the laser grid. Tap lanes on the beat. Accuracy = loot.</Text>
            <Text style={s.text}>3. The server replays your input log and pays out only verified scores.</Text>
            <NeonButton
              label={`INFILTRATE (-${ECONOMY.heistEnergyCost} ⚡)`}
              onPress={start}
              disabled={g.energy < ECONOMY.heistEnergyCost || startMut.isPending}
              style={{ marginTop: spacing.md }}
            />
            {g.energy < ECONOMY.heistEnergyCost && <Text style={s.warn}>Not enough energy. Walk, or watch an ad in the Hub.</Text>}
          </Panel>
          <Panel title="Audio calibration">
            <Text style={s.text}>Bluetooth headphones add 100–250 ms. Positive = you tap late; the judge shifts your taps earlier.</Text>
            <View style={s.calRow}>
              <NeonButton label="-10" tone="pink" onPress={() => g.setCalibration(g.calibrationMs - 10)} />
              <Text style={s.cal}>{`${g.calibrationMs} ms`}</Text>
              <NeonButton label="+10" tone="pink" onPress={() => g.setCalibration(g.calibrationMs + 10)} />
            </View>
          </Panel>
        </>
      )}

      {phase === 'trivia' && session && <TriviaGame seed={session.seed} onDone={onTrivia} />}

      {phase === 'submitting' && (
        <Panel title="Uploading input log">
          <Text style={s.text}>Server is replaying your run against the seed…</Text>
        </Panel>
      )}

      {phase === 'result' && verdict && (
        <Panel title={verdict.ok ? 'Extraction successful' : 'Run rejected'}>
          {verdict.ok && verdict.verified ? (
            <>
              <View style={{ flexDirection: 'row' }}>
                <Stat label="SCORE" value={verdict.verified.score} />
                <Stat label="ACCURACY" value={`${Math.round(verdict.verified.accuracy * 100)}%`} color={colors.cyan} />
                <Stat label="COMBO" value={verdict.verified.maxCombo} color={colors.yellow} />
              </View>
              <Text style={s.loot}>{`+${verdict.lootCoins} coins`}</Text>
              <Text style={s.text}>{`Perfect ${verdict.verified.perfect} · Good ${verdict.verified.good} · Miss ${verdict.verified.miss}`}</Text>
            </>
          ) : (
            <Text style={s.warn}>{`Reason: ${verdict.reason}. No loot credited.`}</Text>
          )}
          <NeonButton label="BACK TO LOBBY" onPress={() => setPhase('lobby')} style={{ marginTop: spacing.md }} />
        </Panel>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  text: { color: colors.text, fontFamily: 'monospace', fontSize: 13, marginBottom: 6 },
  warn: { color: colors.red, fontFamily: 'monospace', fontSize: 12, marginTop: spacing.sm },
  calRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  cal: { color: colors.cyan, fontFamily: 'monospace', fontSize: 22 },
  loot: { color: colors.yellow, fontFamily: 'monospace', fontSize: 26, fontWeight: '700', textAlign: 'center', marginTop: spacing.md },
});
