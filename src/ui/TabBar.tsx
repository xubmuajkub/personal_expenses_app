import { Pressable, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Glass } from './atoms/Glass';
import { Gradient } from './atoms/Gradient';
import { Text } from './Text';
import { color, radius, shadow, space } from './theme';

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // The `add` route is a redirect to /txn/new; we render the + button instead.
  const visibleRoutes = state.routes
    .map((route, idx) => ({ route, idx }))
    .filter(({ route }) => route.name !== 'add');
  return (
    <View
      style={{
        position: 'absolute',
        left: space(4),
        right: space(4),
        bottom: insets.bottom + space(4),
      }}
    >
      <Glass
        intensity="strong"
        radius="pill"
        border
        style={{ borderRadius: radius.pill, ...shadow.s2 }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: space(3),
            paddingVertical: space(2),
            gap: space(2),
          }}
        >
          {visibleRoutes.map(({ route, idx }) => {
            const isFocused = state.index === idx;
            const descriptor = descriptors[route.key];
            const options = descriptor ? descriptor.options : {};
            const tabBarLabel = options.tabBarLabel;
            const label =
              typeof tabBarLabel === 'string'
                ? tabBarLabel
                : (options.title ?? route.name);
            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ selected: isFocused }}
                onPress={() => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!isFocused && !event.defaultPrevented) {
                    navigation.navigate(route.name as never);
                  }
                }}
                style={{ flex: 1, alignItems: 'center', paddingVertical: space(2) }}
              >
                <Text variant="caption" tone={isFocused ? 'default' : 'muted'}>
                  {label}
                </Text>
                {isFocused ? (
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      marginTop: 4,
                      backgroundColor: color.pulseIndigo,
                    }}
                  />
                ) : null}
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add transaction"
            onPress={() => router.push('/txn/new')}
            style={{ marginLeft: space(1) }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Gradient
                preset="pulse"
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />
              <Plus size={22} color={color.fg} />
            </View>
          </Pressable>
        </View>
      </Glass>
    </View>
  );
}
