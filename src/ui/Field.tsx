import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { Text } from './Text';
import { color, radius, space } from './theme';

type Props = TextInputProps & {
  label: string;
  error?: string;
};

export function Field({ label, error, style, ...rest }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ marginBottom: space(3) }}>
      <Text variant="caption" tone="muted" caps style={{ marginBottom: space(1.5) }}>
        {label}
      </Text>
      <TextInput
        {...rest}
        onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
        style={[
          {
            borderWidth: 1,
            borderColor: error ? color.danger : focused ? color.indigo500 : color.hairline,
            borderRadius: radius.md,
            paddingHorizontal: space(3),
            paddingVertical: space(2.5),
            fontSize: 15,
            fontFamily: 'Geist',
            color: color.fg,
            backgroundColor: color.surface,
          },
          style,
        ]}
        placeholderTextColor={color.muted}
        autoCapitalize="none"
      />
      {error ? (
        <Text variant="caption" tone="danger" style={{ marginTop: space(1) }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
