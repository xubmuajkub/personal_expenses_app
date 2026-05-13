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
import { Glass } from './atoms/Glass';
import { color, space, shadow } from './theme';
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
//
// The Glass (BlurView) lives inside this Animated.View, whose translateY is
// driven by a fixed-duration spring/timing — NOT by a continuous gesture. Per
// soft-pulse spec §9, the perf rule is "don't put BlurView under a gesture-
// driven translate"; show/dismiss timings are fine.

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
    <Animated.View style={[{ marginBottom: space(2) }, shadow.s2, animStyle]}>
      <Glass intensity="strong" radius="lg" border>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: space(3),
            paddingHorizontal: space(4),
          }}
        >
          <Text variant="body" style={{ flex: 1 }} numberOfLines={2}>
            {entry.title}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={handleAction}
            style={{ marginLeft: space(3) }}
          >
            <Text variant="bodyLg" style={{ color: color.pulseIndigo }}>
              {entry.actionLabel}
            </Text>
          </Pressable>
        </View>
      </Glass>
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
