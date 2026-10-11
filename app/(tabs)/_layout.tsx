import React from 'react';
import { Text } from 'react-native';
import { Tabs } from 'expo-router';
import { colors } from '@/theme/theme';

const icon = (glyph: string) => ({ color }: { color: import('react-native').ColorValue }) => <Text style={{ color, fontSize: 18 }}>{glyph}</Text>;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.panel },
        headerTintColor: colors.cyan,
        headerTitleStyle: { fontFamily: 'monospace' },
        tabBarStyle: { backgroundColor: colors.panel, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.cyan,
        tabBarInactiveTintColor: colors.dim,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'The Hub', tabBarIcon: icon('◈') }} />
      <Tabs.Screen name="terminal" options={{ title: 'Terminal', tabBarIcon: icon('▤') }} />
      <Tabs.Screen name="vault" options={{ title: 'Vault', tabBarIcon: icon('▣') }} />
      <Tabs.Screen name="market" options={{ title: 'Black Market', tabBarIcon: icon('◉') }} />
    </Tabs>
  );
}
