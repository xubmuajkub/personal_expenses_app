import Svg, { Circle } from 'react-native-svg';
import { View } from 'react-native';
import { color } from './theme';

export function Ring({
  value, size = 84, stroke = 6, danger = false, fillColor, children,
}: { value: number; size?: number; stroke?: number; danger?: boolean; fillColor?: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(value, 1));
  const fill = fillColor ?? (danger || value > 1 ? color.danger : color.indigo700);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size/2} cy={size/2} r={r} stroke={color.hairline} strokeWidth={stroke} fill="none" />
        <Circle cx={size/2} cy={size/2} r={r} stroke={fill} strokeWidth={stroke} fill="none"
                strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} />
      </Svg>
      {children}
    </View>
  );
}
