import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, spacing } from '@/theme/theme';

export const Panel = ({ title, children, style }: { title?: string; children: React.ReactNode; style?: ViewStyle }) => (
  <View style={[s.panel, style]}>
    {title ? <Text style={s.panelTitle}>{`// ${title.toUpperCase()}`}</Text> : null}
    {children}
  </View>
);

type BtnProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'cyan' | 'pink' | 'yellow';
  style?: ViewStyle;
};

export const NeonButton = ({ label, onPress, disabled, tone = 'cyan', style }: BtnProps) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    style={({ pressed }) => [
      s.btn,
      { borderColor: colors[tone] },
      pressed && { backgroundColor: colors[tone] + '33' },
      disabled && { opacity: 0.35 },
      style,
    ]}
  >
    <Text style={[s.btnText, { color: colors[tone] }]}>{label}</Text>
  </Pressable>
);

export const Bar = ({ value, max, color = colors.cyan, label }: { value: number; max: number; color?: string; label: string }) => {
  const pct = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  return (
    <View style={{ marginVertical: spacing.xs }}>
      <View style={s.barHead}>
        <Text style={s.dim}>{label}</Text>
        <Text style={s.dim}>{`${Math.floor(value)} / ${max}`}</Text>
      </View>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
};

export const Stat = ({ label, value, color = colors.text }: { label: string; value: string | number; color?: string }) => (
  <View style={s.stat}>
    <Text style={[s.statValue, { color }]}>{value}</Text>
    <Text style={s.dim}>{label}</Text>
  </View>
);

export const Screen = ({ children }: { children: React.ReactNode }) => <View style={s.screen}>{children}</View>;

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  panel: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  panelTitle: { color: colors.cyan, fontFamily: 'monospace', fontSize: 12, marginBottom: spacing.sm, letterSpacing: 1 },
  btn: { borderWidth: 1.5, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 18, alignItems: 'center' },
  btnText: { fontFamily: 'monospace', fontWeight: '700', letterSpacing: 1 },
  barHead: { flexDirection: 'row', justifyContent: 'space-between' },
  barTrack: { height: 10, backgroundColor: '#000', borderRadius: 5, overflow: 'hidden', marginTop: 4 },
  barFill: { height: '100%', borderRadius: 5 },
  dim: { color: colors.dim, fontFamily: 'monospace', fontSize: 12 },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontFamily: 'monospace', fontSize: 22, fontWeight: '700' },
});
