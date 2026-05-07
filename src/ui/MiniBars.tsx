import { View } from 'react-native';
import { color, radius } from './theme';

/**
 * MiniBars renders a strip of vertical bars sized proportionally to `values`.
 * The LAST entry in `values` is treated as today and rendered in indigo;
 * all earlier entries are rendered in lilac. Callers must order values
 * chronologically with the most recent point last.
 */
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
