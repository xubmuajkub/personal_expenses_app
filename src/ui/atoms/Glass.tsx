import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { blur as Blur, color, radius as R } from '@/ui/theme';

type Intensity = 'soft' | 'med' | 'strong';
type Tint = 'glassSoft' | 'glassMed' | 'glassStrong';
const defaultTintForIntensity: Record<Intensity, Tint> = {
  soft: 'glassSoft', med: 'glassMed', strong: 'glassStrong',
};

type Props = {
  intensity?: Intensity;
  radius?: keyof typeof R;
  tint?: Tint;
  border?: boolean;
  style?: ViewStyle;
  children?: ReactNode;
  testID?: string;
};

export function Glass({
  intensity = 'med',
  radius = 'lg',
  tint,
  border = true,
  style,
  children,
  testID,
}: Props) {
  const b = Blur[intensity];
  const tintColor = color[tint ?? defaultTintForIntensity[intensity]];
  return (
    <View
      testID={testID}
      style={[{ borderRadius: R[radius], overflow: 'hidden' }, style]}
    >
      <BlurView
        intensity={b.intensity}
        tint={b.tint}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View
        testID={testID ? `${testID}-overlay` : undefined}
        pointerEvents="none"
        style={[
          { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: tintColor },
          border ? { borderWidth: 1, borderColor: color.glassBorder } : null,
        ]}
      />
      <View>{children}</View>
    </View>
  );
}
