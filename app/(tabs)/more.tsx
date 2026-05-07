import { View } from 'react-native';
import { Text } from '@/ui/Text';
import { color } from '@/ui/theme';

export default function MoreTab() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.bg }}>
      <Text variant="display3">More</Text>
    </View>
  );
}
