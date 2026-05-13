import { useState } from 'react';
import { View, TextInput, type TextInputProps } from 'react-native';
import { Text } from './Text';
import { Glass } from './atoms/Glass';
import { color, radius, space } from './theme';

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
};

export function Field({ label, value, onChangeText, error, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: space(3) }}>
      <Text variant="caption" tone="muted" style={{ marginBottom: space(1) }}>{label}</Text>
      <Glass
        intensity="soft"
        radius="md"
        border
        style={{
          borderRadius: radius.md,
          paddingHorizontal: space(3),
          paddingVertical: space(2),
          borderWidth: 1,
          borderColor: error ? color.danger : focused ? color.pulseIndigo : color.glassBorder,
        }}
      >
        <TextInput
          {...rest}
          value={value}
          onChangeText={onChangeText}
          onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
          placeholderTextColor={color.muted}
          style={{ color: color.fg, fontSize: 16, lineHeight: 22, minHeight: 28 }}
        />
      </Glass>
      {error ? <Text variant="caption" tone="danger" style={{ marginTop: space(1) }}>{error}</Text> : null}
    </View>
  );
}
