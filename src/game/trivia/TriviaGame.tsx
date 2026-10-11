import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Bar, Panel } from '@/components/ui';
import { useAnswer } from '@/api/hooks';
import type { PublicQuestion } from '@/server/mockServer';
import { QUESTION_LIMIT_MS, type TouchMeta } from '@/shared/triviaGuard';
import { colors } from '@/theme/theme';
import { SkiaCard } from './SkiaCard';

interface Props {
  sessionId: string;
  questions: PublicQuestion[];
  onDone: () => void;
}

const hidden = { accessible: false, importantForAccessibility: 'no-hide-descendants', accessibilityElementsHidden: true } as const;

/** The phone never knows the answer: it sends {questionId, selectedOptionIndex, timeTakenMs, touch} and the server judges. */
export const TriviaGame = ({ sessionId, questions, onDone }: Props) => {
  const { width } = useWindowDimensions();
  const cardW = width - 32 - 34;
  const answer = useAnswer();
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<boolean | null>(null);
  const [left, setLeft] = useState(QUESTION_LIMIT_MS);
  const shownAt = useRef(Date.now());
  const busy = useRef(false);
  const q = questions[idx];

  const submit = async (choice: number, touch: TouchMeta) => {
    if (busy.current) return;
    busy.current = true;
    setPicked(choice);
    const res = await answer.mutateAsync({
      sessionId,
      answer: { questionId: q.id, selectedOptionIndex: choice, timeTakenMs: Date.now() - shownAt.current, touch },
    });
    setVerdict(res.correct);
    Haptics.notificationAsync(res.correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => {});
    setTimeout(() => {
      if (idx + 1 >= questions.length) return onDone();
      setIdx(idx + 1);
      setPicked(null);
      setVerdict(null);
      setLeft(QUESTION_LIMIT_MS);
      shownAt.current = Date.now();
      busy.current = false;
    }, 700);
  };

  useEffect(() => {
    if (picked !== null) return;
    const id = setInterval(() => {
      const rem = QUESTION_LIMIT_MS - (Date.now() - shownAt.current);
      if (rem <= 0) {
        clearInterval(id);
        submit(-1, { x: -1, y: -1, force: 0 });
      } else setLeft(rem);
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, picked]);

  return (
    <Panel title={`Decrypt archive ${idx + 1}/${questions.length}`}>
      <Bar value={left / 1000} max={QUESTION_LIMIT_MS / 1000} color={left < 2500 ? colors.red : colors.cyan} label="NETWORK EXPOSURE" />
      {q.kind === 'emoji' ? (
        // Emoji sequences are hard for OCR/LLM pipelines; they stay native for reliable colour-emoji rendering
        // and are hidden from accessibility services like the rest of the question UI.
        <View {...hidden}><Text style={s.emoji}>{q.prompt}</Text></View>
      ) : (
        <View style={s.prompt} {...hidden}>
          <SkiaCard text={q.prompt} width={cardW + 2} fontSize={16} seed={q.id * 31 + idx} align="center" />
        </View>
      )}
      {q.options.map((o, i) => {
        const reveal = picked !== null;
        const border = !reveal ? colors.cyan : i === picked ? (verdict === null ? colors.yellow : verdict ? colors.cyan : colors.pink) : '#2A2F55';
        return (
          <Pressable
            key={i}
            {...hidden}
            disabled={reveal}
            onPressIn={(e) => submit(i, { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY, force: (e.nativeEvent as { force?: number }).force ?? 0 })}
            style={[s.option, { borderColor: border }]}
          >
            <SkiaCard text={o} width={cardW} fontSize={15} seed={q.id * 97 + i} />
          </Pressable>
        );
      })}
    </Panel>
  );
};

const s = StyleSheet.create({
  emoji: { fontSize: 54, textAlign: 'center', marginVertical: 12 },
  prompt: { marginVertical: 10, borderRadius: 8, overflow: 'hidden' },
  option: { borderWidth: 1.5, borderRadius: 8, marginTop: 8, overflow: 'hidden' },
});
