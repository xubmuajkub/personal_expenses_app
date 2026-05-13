import { Text as RNText, type TextProps } from 'react-native';
import { typeStyles, color, type TypeStyleName } from './theme';

type Tone =
  | 'fg' | 'default' | 'muted' | 'success' | 'danger' | 'onPulse'
  // Legacy v1 tone names — kept for backward compatibility with existing screens.
  | 'indigo' | 'pink' | 'onDark';

type Props = TextProps & {
  variant?: TypeStyleName;
  tone?: Tone;
  caps?: boolean;
};

const tones: Record<Tone, string> = {
  fg: color.fg,
  default: color.fg,
  muted: color.muted,
  success: color.success,
  danger: color.danger,
  onPulse: color.fg,
  // Legacy aliases:
  indigo: color.pulseIndigo,
  pink: color.pulsePink,
  onDark: color.fg,
};

export function Text({ variant = 'body', tone = 'fg', caps, style, ...rest }: Props) {
  const t = typeStyles[variant];
  return (
    <RNText
      {...rest}
      style={[
        t,
        { color: tones[tone] },
        tone === 'onPulse' && { textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 8 },
        caps && { textTransform: 'uppercase' },
        style,
      ]}
    />
  );
}
