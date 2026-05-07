import { Pressable } from 'react-native';
import { Text } from './Text';
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
      style={{
        paddingHorizontal: space(3),
        paddingVertical: space(2),
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: selected ? color.fg : color.hairline,
        backgroundColor: selected ? color.fg : color.surfaceQuiet,
        marginRight: space(2),
        marginBottom: space(2),
      }}
    >
      <Text variant="caption" tone={selected ? 'onDark' : 'fg'}>
        {label}
      </Text>
    </Pressable>
  );
}
