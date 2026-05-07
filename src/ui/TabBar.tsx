import { View, Pressable } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { color, radius, shadow } from './theme';
import { Text } from './Text';

const ICON_LABELS: Record<string, string> = {
  index: 'Home',
  transactions: 'Transactions',
  add: '+',
  budgets: 'Budgets',
  more: 'More',
};

export function TabBar({ state, navigation }: BottomTabBarProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        height: 76,
        paddingHorizontal: 12,
        paddingBottom: 12,
        backgroundColor: color.surface,
        borderTopLeftRadius: radius.lg,
        borderTopRightRadius: radius.lg,
        ...shadow.s2,
      }}
    >
      {state.routes.map((route, idx) => {
        const isAdd = route.name === 'add';
        const focused = state.index === idx;
        const label = ICON_LABELS[route.name] ?? route.name;

        if (isAdd) {
          return (
            <Pressable
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              accessibilityRole="button"
              accessibilityLabel="Add transaction"
              style={{
                width: 56, height: 56, borderRadius: 28,
                backgroundColor: color.fg,
                alignItems: 'center', justifyContent: 'center',
                marginTop: -28,
                ...shadow.glow,
              }}
            >
              <Text variant="display3" tone="onDark">+</Text>
            </Pressable>
          );
        }

        return (
          <Pressable
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}
          >
            <Text variant="caption" tone={focused ? 'fg' : 'muted'} caps>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
