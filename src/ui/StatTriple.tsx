import { View } from 'react-native';
import { Text } from './Text';

export function StatTriple({
  label, value, sub, valueVariant = 'numHero', tone,
}: {
  label: string; value: string; sub?: string;
  valueVariant?: 'numHero' | 'display1' | 'display2' | 'display3';
  tone?: 'fg' | 'indigo' | 'success' | 'danger' | 'onDark';
}) {
  return (
    <View>
      <Text variant="caption" tone={tone === 'onDark' ? 'onDark' : 'muted'} caps>{label}</Text>
      <Text variant={valueVariant} tone={tone ?? 'fg'} style={{ marginTop: 4 }}>{value}</Text>
      {sub ? (
        <Text variant="body" tone={tone === 'onDark' ? 'onDark' : 'muted'} style={{ marginTop: 4 }}>{sub}</Text>
      ) : null}
    </View>
  );
}
