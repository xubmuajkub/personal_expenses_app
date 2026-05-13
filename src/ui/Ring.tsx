import { useId } from 'react';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { View } from 'react-native';
import { color, gradient } from './theme';

/**
 * Ring renders a circular progress ring. By default the progress arc is filled
 * with the Soft Pulse gradient (pink → lilac → indigo → deep); set `danger` to
 * surface an over-budget state, or pass `fillColor` to force an explicit solid
 * stroke (used by category dots in the budgets list).
 */
export function Ring({
  value, size = 84, stroke = 6, danger = false, fillColor, children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  danger?: boolean;
  fillColor?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(value, 1));
  const overBudget = danger || value > 1;

  // Unique gradient id per instance so multiple Rings can coexist on one screen.
  const gradId = `ring-pulse-grad-${useId()}`;

  // Resolve the stroke: explicit fillColor wins, then danger, then gradient.
  const useGradient = !fillColor && !overBudget;
  const solidStroke = fillColor ?? (overBudget ? color.danger : color.pulseIndigo);
  const progressStroke = useGradient ? `url(#${gradId})` : solidStroke;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg
        width={size}
        height={size}
        style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
      >
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
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color.glassMed}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={progressStroke}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
        />
      </Svg>
      {children}
    </View>
  );
}
