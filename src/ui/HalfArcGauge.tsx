import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { color, gradient } from './theme';

interface Props {
  value: number;          // 0..1
  size?: number;
  stroke?: number;
  trackColor?: string;
  fillColor?: string;
  children?: React.ReactNode;
}

/**
 * HalfArcGauge renders a 140° downward-opening arc. The progress arc is filled
 * with the Soft Pulse gradient (pink → lilac → indigo → deep) by default; pass
 * `fillColor` to force a solid stroke (used for danger/over-budget surfaces).
 */
export function HalfArcGauge({
  value, size = 120, stroke = 6,
  trackColor = color.glassMed, fillColor, children,
}: Props) {
  const cx = size / 2;
  const cy = size * 0.7;        // arc opens downward, center pushed down
  const r = (size / 2) - stroke;
  const startAngle = 200;       // degrees, from positive X axis
  const endAngle = 340;
  const sweep = endAngle - startAngle;
  const path = (from: number, to: number) => describeArc(cx, cy, r, from, to);
  const valueEnd = startAngle + sweep * Math.max(0, Math.min(value, 1));

  const gradId = `gauge-pulse-grad-${useId()}`;
  const useGradient = !fillColor;
  const progressStroke = fillColor ?? `url(#${gradId})`;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {useGradient ? (
          <Defs>
            <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
              {gradient.pulse.colors.map((col, i) => (
                <Stop
                  key={col}
                  offset={String(gradient.pulse.locations[i] ?? 0)}
                  stopColor={col}
                />
              ))}
            </LinearGradient>
          </Defs>
        ) : null}
        <Path
          d={path(startAngle, endAngle)}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d={path(startAngle, valueEnd)}
          stroke={progressStroke}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
        />
      </Svg>
      <View style={{ marginTop: 8, alignItems: 'center' }}>{children}</View>
    </View>
  );
}

function describeArc(cx: number, cy: number, r: number, start: number, end: number): string {
  const polar = (deg: number) => {
    const rad = (deg - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const s = polar(end);
  const e = polar(start);
  const large = end - start <= 180 ? 0 : 1;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y}`;
}
