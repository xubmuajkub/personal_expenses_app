import type { ReactNode } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from './Text';
import { color, space } from './theme';

type Props = {
  title: string;
  children: ReactNode;
};

export function Sheet({ title, children }: Props) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: color.bg }}
    >
      <ScrollView
        contentContainerStyle={{ padding: space(5), paddingBottom: space(15) }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ marginBottom: space(4) }}>
          <Text variant="display3">{title}</Text>
        </View>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
