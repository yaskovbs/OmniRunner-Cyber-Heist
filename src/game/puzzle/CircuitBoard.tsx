import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { NeonButton } from '@/components/ui';
import { colors } from '@/theme/theme';
import { E, generateBoard, isSolved, N, powered, rotate, S, W, type Board } from './circuit';

const CELL = 58;

const Arm = ({ dir, on }: { dir: number; on: boolean }) => {
  const c = on ? colors.cyan : '#3B4466';
  const base = { position: 'absolute' as const, backgroundColor: c };
  const mid = CELL / 2;
  const t = 6;
  if (dir === N) return <View style={[base, { left: mid - t / 2, top: 0, width: t, height: mid + t / 2 }]} />;
  if (dir === S) return <View style={[base, { left: mid - t / 2, top: mid - t / 2, width: t, height: mid + t / 2 }]} />;
  if (dir === W) return <View style={[base, { top: mid - t / 2, left: 0, height: t, width: mid + t / 2 }]} />;
  return <View style={[base, { top: mid - t / 2, left: mid - t / 2, height: t, width: mid + t / 2 }]} />;
};

interface Props {
  size?: number;
  seed: number;
  onSolved: (moves: number, ms: number) => void;
}

export const CircuitBoard = ({ size = 5, seed, onSolved }: Props) => {
  const initial = useMemo(() => generateBoard(size, seed), [size, seed]);
  const [board, setBoard] = useState<Board>(initial);
  const [moves, setMoves] = useState(0);
  const startedAt = useRef(Date.now());
  const done = useRef(false);

  useEffect(() => {
    setBoard(initial);
    setMoves(0);
    done.current = false;
    startedAt.current = Date.now();
  }, [initial]);

  const lit = useMemo(() => powered(board), [board]);
  const solved = isSolved(board);

  const tap = (i: number) => {
    if (done.current) return;
    Haptics.selectionAsync().catch(() => {});
    const tiles = board.tiles.slice();
    tiles[i] = rotate(tiles[i]);
    const next = { ...board, tiles };
    setBoard(next);
    setMoves((m) => m + 1);
    if (isSolved(next)) {
      done.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onSolved(moves + 1, Date.now() - startedAt.current);
    }
  };

  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={s.hint}>{solved ? 'FIREWALL BREACHED' : 'Rotate tiles to route power from ⚡ to ◎'}</Text>
      <View style={s.row}>
        <Text style={[s.port, { color: colors.yellow }]}>⚡</Text>
        <View style={{ width: CELL * size, height: CELL * size, flexDirection: 'row', flexWrap: 'wrap' }}>
          {board.tiles.map((m, i) => (
            <Pressable key={i} onPress={() => tap(i)} style={s.cell}>
              {[N, E, S, W].map((d) => (m & d ? <Arm key={d} dir={d} on={lit.has(i)} /> : null))}
              <View style={[s.hub, { backgroundColor: lit.has(i) ? colors.cyan : '#3B4466' }]} />
            </Pressable>
          ))}
        </View>
        <Text style={[s.port, { color: solved ? colors.cyan : colors.dim }]}>◎</Text>
      </View>
      <Text style={s.hint}>{`Moves: ${moves}`}</Text>
      {!solved && <NeonButton label="RESET BOARD" tone="pink" onPress={() => { setBoard(initial); setMoves(0); }} style={{ marginTop: 8 }} />}
    </View>
  );
};

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  port: { fontSize: 22, width: 28, textAlign: 'center', marginTop: 16 },
  cell: { width: CELL, height: CELL, borderWidth: 1, borderColor: 'rgba(0,255,204,0.12)', backgroundColor: '#0B0B1A' },
  hub: { position: 'absolute', width: 10, height: 10, borderRadius: 5, left: CELL / 2 - 5, top: CELL / 2 - 5 },
  hint: { color: colors.dim, fontFamily: 'monospace', fontSize: 12, marginVertical: 8 },
});
