import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useAnimatedReaction, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import * as Haptics from 'expo-haptics';
import { LANE_COUNT, makeBeatmap } from '@/shared/beatmap';
import { applyTap, finalize, newJudgeState, type InputEvent, type JudgeState, type ScoreResult } from '@/shared/judge';
import { colors } from '@/theme/theme';
import { RhythmCanvas, makeGeometry } from './RhythmCanvas';

export interface RhythmOutcome {
  result: ScoreResult;
  inputs: InputEvent[];
}

interface Props {
  seed: number;
  calibrationMs: number;
  onFinish: (o: RhythmOutcome) => void;
}

const GRADE_LABEL = ['MISS', 'GOOD', 'PERFECT'];
const GRADE_COLOR = [colors.red, colors.yellow, colors.cyan];

export const RhythmGame = ({ seed, calibrationMs, onFinish }: Props) => {
  const { width, height } = useWindowDimensions();
  const geo = useMemo(() => makeGeometry(width, Math.min(height * 0.62, 560)), [width, height]);
  const notes = useMemo(() => makeBeatmap(seed), [seed]);
  const endMs = notes[notes.length - 1].targetTimeMs + 1200;

  // Everything below lives on the UI thread: no React re-render per frame.
  const startPerf = useSharedValue(-1);
  const songMs = useSharedValue(0);
  const judge = useSharedValue<JudgeState>(newJudgeState(notes.length));
  const inputs = useSharedValue<InputEvent[]>([]);
  const flashAt = useSharedValue<number[]>(new Array(LANE_COUNT).fill(-9999));
  const finished = useSharedValue(false);
  const lastGrade = useSharedValue(0);

  const [hud, setHud] = useState({ score: 0, combo: 0, grade: -1 });

  useFrameCallback(() => {
    if (startPerf.value < 0) startPerf.value = performance.now();
    songMs.value = performance.now() - startPerf.value;
  });

  const pushHud = (score: number, combo: number, grade: number) => {
    setHud({ score, combo, grade });
    if (grade === 2) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    else if (grade === 0) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  };

  const complete = () => {
    const st = { ...judge.value, hit: [...judge.value.hit] };
    onFinish({ result: finalize(notes, st), inputs: inputs.value });
  };

  useAnimatedReaction(
    () => songMs.value > endMs,
    (over) => {
      if (over && !finished.value) {
        finished.value = true;
        scheduleOnRN(complete);
      }
    },
  );

  const lane = (x: number) => {
    'worklet';
    return Math.max(0, Math.min(LANE_COUNT - 1, Math.floor((x - geo.startX) / geo.laneW)));
  };

  // Manual gesture = instant onTouchesDown for every finger (Tap waits for release; Pan adds slop).
  const gesture = Gesture.Manual().onTouchesDown((e) => {
    'worklet';
    if (startPerf.value < 0 || finished.value) return;
    const now = performance.now() - startPerf.value;
    for (const t of e.changedTouches) {
      const l = lane(t.x);
      const tMs = now - calibrationMs;
      judge.modify((st) => {
        lastGrade.value = applyTap(notes, st, l, tMs); // worklet closures copy locals, so write through a SharedValue
        return st;
      });
      inputs.modify((arr) => {
        arr.push({ lane: l, tMs });
        return arr;
      });
      flashAt.modify((a) => {
        a[l] = now;
        return a;
      });
      scheduleOnRN(pushHud, judge.value.score, judge.value.combo, lastGrade.value);
    }
  });

  return (
    <View style={s.wrap}>
      <View style={s.hud}>
        <Text style={s.score}>{hud.score}</Text>
        <Text style={[s.grade, { color: hud.grade >= 0 ? GRADE_COLOR[hud.grade] : 'transparent' }]}>
          {hud.grade >= 0 ? GRADE_LABEL[hud.grade] : '-'}
        </Text>
        <Text style={s.combo}>{hud.combo > 1 ? `${hud.combo}x COMBO` : ' '}</Text>
      </View>
      <GestureDetector gesture={gesture}>
        <View collapsable={false}>
          <RhythmCanvas notes={notes} geo={geo} songMs={songMs} judge={judge} flashAt={flashAt} />
        </View>
      </GestureDetector>
    </View>
  );
};

const s = StyleSheet.create({
  wrap: { alignItems: 'center', backgroundColor: colors.bg },
  hud: { alignItems: 'center', paddingVertical: 8 },
  score: { color: colors.text, fontFamily: 'monospace', fontSize: 28, fontWeight: '700' },
  grade: { fontFamily: 'monospace', fontWeight: '700', fontSize: 16, height: 20 },
  combo: { color: colors.yellow, fontFamily: 'monospace', fontSize: 13, height: 18 },
});
