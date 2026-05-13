import { View } from 'react-native';
import { Text } from './Text';
import { color, space, type TypeStyleName } from './theme';

type Tone = 'fg' | 'indigo' | 'success' | 'danger' | 'onPulse' | 'onDark';

type Props = {
  label: string;
  value: string;
  sub?: string;
  valueVariant?: TypeStyleName;
  tone?: Tone;
};

export function StatTriple({
  label,
  value,
  sub,
  valueVariant = 'numHero',
  tone,
}: Props) {
  // `onDark` is a legacy alias kept so existing screens compile; behaves like `onPulse`.
  const isOnPulse = tone === 'onPulse' || tone === 'onDark';
  const labelTone = isOnPulse ? 'onPulse' : 'muted';
  const valueTone = tone ?? 'fg';
  // Highlight income deltas (sub-text starting with `+`) with pulse-pink.
  const subColor = sub?.startsWith('+') ? color.pulsePink : color.muted;

  return (
    <View style={{ gap: space(1) }}>
      <Text variant="caption" tone={labelTone} caps>
        {label}
      </Text>
      <Text variant={valueVariant} tone={valueTone}>
        {value}
      </Text>
      {sub ? (
        <Text variant="body" style={{ color: subColor }}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}
