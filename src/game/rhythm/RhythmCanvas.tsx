import React from 'react';
import { Canvas, Line, RoundedRect, Rect, vec } from '@shopify/react-native-skia';
import { SharedValue, useDerivedValue } from 'react-native-reanimated';
import { LANE_COUNT, type RhythmNote } from '@/shared/beatmap';
import type { JudgeState } from '@/shared/judge';
import { colors } from '@/theme/theme';

export const NOTE_TRAVEL_MS = 1400;
export const TOP = 20;

export interface Geometry {
  width: number;
  height: number;
  hitY: number;
  startX: number;
  laneW: number;
}

export function makeGeometry(width: number, height: number): Geometry {
  const trackW = width * 0.92;
  return { width, height, hitY: height - 90, startX: (width - trackW) / 2, laneW: trackW / LANE_COUNT };
}

interface NoteProps {
  note: RhythmNote;
  geo: Geometry;
  songMs: SharedValue<number>;
  judge: SharedValue<JudgeState>;
}

const NoteView = ({ note, geo, songMs, judge }: NoteProps) => {
  const y = useDerivedValue(() => {
    const remaining = note.targetTimeMs - songMs.value;
    return geo.hitY - (remaining / NOTE_TRAVEL_MS) * (geo.hitY - TOP) - 11;
  });
  const opacity = useDerivedValue(() => {
    const remaining = note.targetTimeMs - songMs.value;
    if (judge.value.hit[note.id] === 1) return 0;
    if (remaining > NOTE_TRAVEL_MS || remaining < -260) return 0;
    return remaining < 0 ? Math.max(0, 1 + remaining / 260) * 0.5 : 1;
  });
  return (
    <RoundedRect
      x={geo.startX + note.lane * geo.laneW + 6}
      y={y}
      width={geo.laneW - 12}
      height={22}
      r={6}
      color={note.lane % 2 ? colors.pink : colors.purple}
      opacity={opacity}
    />
  );
};

const LaneGlow = ({ lane, geo, songMs, flashAt }: { lane: number; geo: Geometry; songMs: SharedValue<number>; flashAt: SharedValue<number[]> }) => {
  const opacity = useDerivedValue(() => Math.max(0, 1 - (songMs.value - flashAt.value[lane]) / 220) * 0.55);
  return <Rect x={geo.startX + lane * geo.laneW} y={TOP} width={geo.laneW} height={geo.hitY - TOP + 40} color={colors.cyan} opacity={opacity} />;
};

interface Props {
  notes: RhythmNote[];
  geo: Geometry;
  songMs: SharedValue<number>;
  judge: SharedValue<JudgeState>;
  flashAt: SharedValue<number[]>;
}

export const RhythmCanvas = ({ notes, geo, songMs, judge, flashAt }: Props) => (
  <Canvas style={{ width: geo.width, height: geo.height }}>
    {Array.from({ length: LANE_COUNT }).map((_, l) => (
      <LaneGlow key={`g${l}`} lane={l} geo={geo} songMs={songMs} flashAt={flashAt} />
    ))}
    {Array.from({ length: LANE_COUNT + 1 }).map((_, i) => (
      <Line
        key={`l${i}`}
        p1={vec(geo.startX + i * geo.laneW, TOP)}
        p2={vec(geo.startX + i * geo.laneW, geo.hitY + 40)}
        color="rgba(0,255,204,0.22)"
        strokeWidth={2}
      />
    ))}
    <Line p1={vec(geo.startX, geo.hitY)} p2={vec(geo.startX + geo.laneW * LANE_COUNT, geo.hitY)} color={colors.cyan} strokeWidth={4} />
    {notes.map((n) => (
      <NoteView key={n.id} note={n} geo={geo} songMs={songMs} judge={judge} />
    ))}
  </Canvas>
);
