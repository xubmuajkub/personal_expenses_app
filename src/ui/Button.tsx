import { Pressable, ActivityIndicator, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { color, radius } from './theme';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

const base: ViewStyle = {
  paddingVertical: 14,
  paddingHorizontal: 18,
  borderRadius: radius.pill,
  alignItems: 'center',
  justifyContent: 'center',
};

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: { backgroundColor: color.fg },
  accent:  { backgroundColor: color.indigo700 },
  secondary: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.hairline,
  },
  ghost: { backgroundColor: 'transparent' },
};

export function Button({ title, onPress, loading, disabled, variant = 'primary', style, accessibilityLabel }: Props) {
  const isLight = variant === 'secondary' || variant === 'ghost';
  const spinnerColor = isLight ? color.indigo500 : color.onDarkFg;
  const textTone = (() => {
    if (variant === 'ghost') return 'indigo' as const;
    if (variant === 'secondary') return 'fg' as const;
    return 'onDark' as const;
  })();

  return (
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!loading || !!disabled, busy: !!loading }}
      style={[base, variantStyles[variant], (loading || disabled) && { opacity: 0.6 }, style]}
    >
      {loading
        ? <ActivityIndicator color={spinnerColor} />
        : <Text variant="bodyLg" tone={textTone}>{title}</Text>
      }
    </Pressable>
  );
}
