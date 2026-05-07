import { Text as RNText, type TextProps } from 'react-native';
import { typeStyles, color, type TypeStyleName } from './theme';

type Tone = 'fg' | 'muted' | 'indigo' | 'pink' | 'success' | 'danger' | 'onDark';

type Props = TextProps & {
  variant?: TypeStyleName;
  tone?: Tone;
  caps?: boolean;
};

const tones: Record<Tone, string> = {
  fg: color.fg, muted: color.muted,
  indigo: color.indigo500, pink: color.pink500,
  success: color.success, danger: color.danger,
  onDark: color.onDarkFg,
};

export function Text({ variant = 'body', tone = 'fg', caps, style, ...rest }: Props) {
  const t = typeStyles[variant];
  return (
    <RNText
      {...rest}
      style={[
        t,
        { color: tones[tone] },
        caps && { textTransform: 'uppercase' },
        style,
      ]}
    />
  );
}
