import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradient as G } from '@/ui/theme';

export type GradientPreset = keyof typeof G;

type Props = {
  preset: GradientPreset;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  testID?: string;
};

export function Gradient({ preset, style, children, testID }: Props) {
  const g = G[preset];
  return (
    <LinearGradient
      colors={g.colors}
      locations={g.locations}
      start={g.start}
      end={g.end}
      style={style}
      testID={testID}
    >
      {children}
    </LinearGradient>
  );
}
