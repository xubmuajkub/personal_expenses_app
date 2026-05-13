import type { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradient as G } from '@/ui/theme';

export type GradientPreset = keyof typeof G;

type Props = {
  preset: GradientPreset;
  style?: ViewStyle;
  children?: ReactNode;
  testID?: string;
};

export function Gradient({ preset, style, children, testID }: Props) {
  const g = G[preset];
  return (
    <LinearGradient
      colors={g.colors as unknown as readonly [string, string, ...string[]]}
      locations={g.locations as unknown as readonly [number, number, ...number[]]}
      start={g.start}
      end={g.end}
      style={style}
      testID={testID}
    >
      {children}
    </LinearGradient>
  );
}
