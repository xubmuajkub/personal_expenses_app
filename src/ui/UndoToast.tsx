import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Text } from './Text';
import { color, space, radius, shadow } from './theme';
import { useToasts, type ToastEntry } from '@/store/toasts';

// ─── Imperative helper ───────────────────────────────────────────────────────

let _idCounter = 0;

export function showUndoToast(opts: {
  title: string;
  actionLabel: string;
  ttlMs: number;
  onAction: () => void | Promise<void>;
}): void {
  const id = `toast-${++_idCounter}`;
  useToasts.getState().push({ id, ...opts });
}

// ─── Single toast card ───────────────────────────────────────────────────────

function ToastCard({ entry }: { entry: ToastEntry }) {
  const { dismiss } = useToasts();
  const translateY = useSharedValue(80);
  const opacity = useSharedValue(0);

  // Run only on mount — shared values and entry props are stable for the lifetime of this card
  useEffect(() => {
    translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
    opacity.value = withTiming(1, { duration: 200 });

    const timer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 200 }, (done) => {
        if (done) runOnJS(dismiss)(entry.id);
      });
    }, entry.ttlMs);

    return () => clearTimeout(timer);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  async function handleAction() {
    dismiss(entry.id);
    await entry.onAction();
  }

  return (
    <Animated.View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: color.fg,
          borderRadius: radius.md,
          paddingVertical: space(3),
          paddingHorizontal: space(4),
          marginBottom: space(2),
          ...shadow.s2,
        },
        animStyle,
      ]}
    >
      <Text variant="body" tone="onDark" style={{ flex: 1 }} numberOfLines={2}>
        {entry.title}
      </Text>
      <Pressable onPress={handleAction} style={{ marginLeft: space(3) }}>
        <Text variant="bodyLg" tone="onDark">{entry.actionLabel}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Host — mount once in _layout.tsx ────────────────────────────────────────

export function ToastHost() {
  const queue = useToasts((s) => s.queue);
  // Show only the latest two toasts to avoid clutter
  const visible = queue.slice(-2);

  if (visible.length === 0) return null;

  return (
    <View
      style={{
        position: 'absolute',
        bottom: space(10),
        left: space(4),
        right: space(4),
        zIndex: 9999,
        pointerEvents: 'box-none',
      }}
    >
      {visible.map((entry) => (
        <ToastCard key={entry.id} entry={entry} />
      ))}
    </View>
  );
}
