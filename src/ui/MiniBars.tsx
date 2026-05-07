import { View } from 'react-native';
import { color, radius } from './theme';

export function MiniBars({ values, height = 56 }: { values: number[]; height?: number }) {
  const max = Math.max(1, ...values);
  return (
    <View style={{ height, flexDirection: 'row', alignItems: 'flex-end' }}>
      {values.map((v, i) => {
        const isLast = i === values.length - 1;
        const h = Math.round((v / max) * height);
        return (
          <View key={i}
            style={{
              width: 8, marginRight: 4, height: Math.max(2, h),
              backgroundColor: isLast ? color.indigo500 : color.lilac300,
              borderTopLeftRadius: radius.sm, borderTopRightRadius: radius.sm,
            }} />
        );
      })}
    </View>
  );
}
