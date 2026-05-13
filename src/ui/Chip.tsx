import { Pressable } from 'react-native';
import { Text } from './Text';
import { Glass } from './atoms/Glass';
import { color, radius, space } from './theme';

type Props = {
  label: string;
  selected?: boolean;
  onPress: () => void;
};

export function Chip({ label, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={{ marginRight: space(2), marginBottom: space(2) }}
    >
      <Glass
        intensity={selected ? 'strong' : 'soft'}
        radius="pill"
        border
        style={{
          paddingHorizontal: space(3),
          paddingVertical: space(2),
          borderRadius: radius.pill,
          minHeight: 32,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant="caption" style={{ color: selected ? color.fg : color.fgQuiet }}>
          {label}
        </Text>
      </Glass>
    </Pressable>
  );
}
