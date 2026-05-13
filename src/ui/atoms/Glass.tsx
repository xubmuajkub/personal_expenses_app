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

/**
 * Glass — frosted-glass surface (BlurView + tint overlay + optional border).
 *
 * Layout: a clipping wrapper holds three absolutely-positioned siblings + content.
 * The first sibling is a View tagged with the caller's `testID` that also carries
 * the resolved `intensity`/`tint` values as React props. This makes the atom
 * inspectable from tests (host props are the only thing react-native-testing-library
 * exposes) without forcing test code to reach into BlurView's internal native node.
 */
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
  const containerStyle: ViewStyle = {
    borderRadius: R[radius],
    overflow: 'hidden',
  };
  const fill: ViewStyle = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 };
  return (
    <View testID={testID ? `${testID}-wrap` : undefined} style={[containerStyle, style]}>
      <BlurView intensity={b.intensity} tint={b.tint} style={fill} />
      {/*
        Inspection node. Mirrors the BlurView's intensity/tint as React props so
        tests can assert against `getByTestId(testID).props.intensity`. Renders
        nothing visible (transparent fill, pointer-events disabled).
      */}
      <View
        testID={testID}
        pointerEvents="none"
        style={fill}
        // @ts-expect-error intentional non-View props for test introspection
        intensity={b.intensity}
        tint={b.tint}
      />
      <View
        testID={testID ? `${testID}-overlay` : undefined}
        pointerEvents="none"
        style={[
          { ...fill, backgroundColor: tintColor, borderRadius: R[radius] },
          border ? { borderWidth: 1, borderColor: color.glassBorder } : null,
        ]}
      />
      <View>{children}</View>
    </View>
  );
}
