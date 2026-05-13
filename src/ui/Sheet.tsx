import type { ReactNode } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Gradient } from './atoms/Gradient';
import { Glass } from './atoms/Glass';
import { Text } from './Text';
import { color, radius, space } from './theme';

type Props = {
  title: string;
  children: ReactNode;
  testID?: string;
};

export function Sheet({ title, children, testID }: Props) {
  return (
    <View testID={testID} style={{ flex: 1, backgroundColor: color.bg }}>
      <Gradient
        preset="sheet"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: space(4), paddingBottom: space(15) }}
          keyboardShouldPersistTaps="handled"
        >
          <Glass
            intensity="strong"
            radius="xl"
            border
            style={{ borderRadius: radius.xl }}
          >
            <View style={{ alignItems: 'center', paddingTop: space(2) }}>
              <View
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: color.glassBorder,
                }}
              />
            </View>
            <View style={{ padding: space(4) }}>
              <View style={{ marginBottom: space(4) }}>
                <Text variant="display3">{title}</Text>
              </View>
              {children}
            </View>
          </Glass>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
