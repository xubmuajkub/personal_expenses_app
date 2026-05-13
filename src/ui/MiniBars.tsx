import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { color } from './theme';

/**
 * MiniBars renders a strip of vertical bars sized proportionally to `values`.
 * The LAST entry in `values` is treated as today and rendered with a deeper
 * indigo→deep gradient; all earlier entries use a lilac→indigo gradient.
 * Callers must order values chronologically with the most recent point last.
 */
export function MiniBars({ values, height = 56 }: { values: number[]; height?: number }) {
  const max = Math.max(1, ...values);
  const barWidth = 8;
  const gap = 4;
  const width = values.length * (barWidth + gap);
  const uid = useId();
  const idBase = `mini-bars-grad-${uid}`;
  const idToday = `mini-bars-grad-today-${uid}`;
  return (
    <View style={{ height, width }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={idBase} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color.pulseLilac} />
            <Stop offset="1" stopColor={color.pulseIndigo} />
          </LinearGradient>
          <LinearGradient id={idToday} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color.pulseIndigo} />
            <Stop offset="1" stopColor={color.pulseDeep} />
          </LinearGradient>
        </Defs>
        {values.map((v, i) => {
          const isLast = i === values.length - 1;
          const h = Math.max(2, Math.round((v / max) * height));
          return (
            <Rect
              key={i}
              x={i * (barWidth + gap)}
              y={height - h}
              width={barWidth}
              height={h}
              rx={3}
              fill={`url(#${isLast ? idToday : idBase})`}
            />
          );
        })}
      </Svg>
    </View>
  );
}
