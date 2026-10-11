import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Bar, NeonButton, Panel } from '@/components/ui';
import { colors } from '@/theme/theme';
import { pickQuestions } from './questions';

export interface TriviaResult {
  answered: number;
  correct: number;
  avgMs: number;
}

const TIME_LIMIT_MS = 12000;

export const TriviaGame = ({ seed, onDone }: { seed: number; onDone: (r: TriviaResult) => void }) => {
  const questions = useMemo(() => pickQuestions(seed), [seed]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [left, setLeft] = useState(TIME_LIMIT_MS);
  const stats = useRef({ correct: 0, times: [] as number[] });
  const shownAt = useRef(Date.now());
  const q = questions[idx];

  const finish = (answeredCount: number) => {
    const t = stats.current.times;
    onDone({
      answered: answeredCount,
      correct: stats.current.correct,
      avgMs: t.length ? t.reduce((a, b) => a + b, 0) / t.length : TIME_LIMIT_MS,
    });
  };

  const advance = (chosen: number | null) => {
    const took = Date.now() - shownAt.current;
    const ok = chosen === q.answer;
    if (chosen !== null) stats.current.times.push(took);
    if (ok) stats.current.correct++;
    Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => {});
    setPicked(chosen ?? -1);
    setTimeout(() => {
      if (idx + 1 >= questions.length) return finish(questions.length);
      setIdx(idx + 1);
      setPicked(null);
      setLeft(TIME_LIMIT_MS);
      shownAt.current = Date.now();
    }, 700);
  };

  useEffect(() => {
    if (picked !== null) return;
    const id = setInterval(() => {
      const rem = TIME_LIMIT_MS - (Date.now() - shownAt.current);
      if (rem <= 0) {
        clearInterval(id);
        advance(null);
      } else setLeft(rem);
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, picked]);

  return (
    <Panel title={`Decrypt archive ${idx + 1}/${questions.length}`}>
      <Bar value={left / 1000} max={TIME_LIMIT_MS / 1000} color={left < 4000 ? colors.red : colors.cyan} label="NETWORK EXPOSURE" />
      <Text style={s.kind}>{q.kind === 'emoji' ? 'NAME THE MOVIE' : 'ONE-LINE PLOT'}</Text>
      <Text style={q.kind === 'emoji' ? s.emoji : s.prompt}>{q.prompt}</Text>
      {q.options.map((o, i) => {
        const reveal = picked !== null;
        const tone = !reveal ? 'cyan' : i === q.answer ? 'cyan' : i === picked ? 'pink' : 'yellow';
        return (
          <NeonButton
            key={i}
            label={o}
            tone={tone}
            disabled={reveal && i !== q.answer && i !== picked}
            onPress={() => picked === null && advance(i)}
            style={{ marginTop: 8 }}
          />
        );
      })}
    </Panel>
  );
};

const s = StyleSheet.create({
  kind: { color: colors.dim, fontFamily: 'monospace', fontSize: 11, marginTop: 10, textAlign: 'center' },
  emoji: { fontSize: 54, textAlign: 'center', marginVertical: 10 },
  prompt: { color: colors.text, fontSize: 17, textAlign: 'center', marginVertical: 14, fontFamily: 'monospace' },
});
