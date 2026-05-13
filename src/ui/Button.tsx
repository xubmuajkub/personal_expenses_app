import { Pressable, ActivityIndicator, View, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { Glass } from './atoms/Glass';
import { Gradient } from './atoms/Gradient';
import { color, radius, shadow, space } from './theme';

export type ButtonVariant =
  | 'primary' | 'glass' | 'ghost' | 'danger'
  // Legacy v1 aliases — kept for backward compatibility with existing screens.
  | 'accent' | 'secondary';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

function resolveVariant(v: ButtonVariant): 'primary' | 'glass' | 'ghost' | 'danger' {
  if (v === 'accent') return 'primary';
  if (v === 'secondary') return 'glass';
  return v;
}

const baseLayout: ViewStyle = {
  paddingVertical: 14,
  paddingHorizontal: 18,
  borderRadius: radius.pill,
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 48,
};

export function Button({
  title, onPress, loading, disabled, variant = 'primary', style, accessibilityLabel,
}: Props) {
  const v = resolveVariant(variant);
  const isInactive = !!loading || !!disabled;
  const inner = (
    <View style={[baseLayout, isInactive && { opacity: 0.55 }]}>
      {loading ? <ActivityIndicator color={color.fg} /> : <Text variant="bodyLg" tone="default">{title}</Text>}
    </View>
  );
  return (
    <Pressable
      onPress={onPress}
      disabled={isInactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isInactive, busy: !!loading }}
      style={({ pressed }) => [pressed && { opacity: 0.85 }, style]}
    >
      {v === 'primary' && (
        <Gradient preset="pulse" style={[baseLayout, shadow.glow, { padding: 0 }]}>
          {inner}
        </Gradient>
      )}
      {v === 'glass' && <Glass intensity="med" radius="pill">{inner}</Glass>}
      {v === 'ghost' && <View style={[baseLayout, { borderWidth: 1, borderColor: color.glassBorder }]}>{inner}</View>}
      {v === 'danger' && <View style={[baseLayout, { backgroundColor: color.danger, paddingHorizontal: space(5) }]}>{inner}</View>}
    </Pressable>
  );
}
