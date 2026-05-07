import { View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { aurora, radius } from './theme';

export function AuroraArch({
  height = 280, style, topRadius = radius.lg, bottomRadius = radius.md,
}: {
  height?: number; style?: ViewStyle; topRadius?: number; bottomRadius?: number;
}) {
  return (
    <View
      pointerEvents="none"
      style={[
        {
          height,
          overflow: 'hidden',
          borderTopLeftRadius: topRadius,
          borderTopRightRadius: topRadius,
          borderBottomLeftRadius: bottomRadius,
          borderBottomRightRadius: bottomRadius,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={aurora.stops as unknown as [string, string, ...string[]]}
        locations={aurora.locations as unknown as [number, number, ...number[]]}
        start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
        style={{ flex: 1 }}
      />
    </View>
  );
}
