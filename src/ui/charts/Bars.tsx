import { View } from 'react-native';
import Svg, { Rect, Line, G, Text as SvgText } from 'react-native-svg';
import { color as themeColor } from '@/ui/theme';

export interface BarDatum {
  x: string;
  y: number;
}

type Props = {
  data: BarDatum[];
  height?: number;
  barColor?: string;
};

const PAD_LEFT = 8;
const PAD_RIGHT = 8;
const PAD_TOP = 16;
const PAD_BOTTOM = 36;

export function Bars({ data, height = 200, barColor = themeColor.indigo500 }: Props) {
  if (data.length === 0) {
    return <View style={{ height }} />;
  }

  const maxY = Math.max(...data.map((d) => d.y), 1);
  const chartW = 320;
  const chartH = height;
  const plotW = chartW - PAD_LEFT - PAD_RIGHT;
  const plotH = chartH - PAD_TOP - PAD_BOTTOM;

  const slotW = plotW / data.length;
  const barW = Math.max(slotW * 0.6, 4);

  return (
    <View style={{ alignSelf: 'stretch' }}>
      <Svg width="100%" height={chartH} viewBox={`0 0 ${chartW} ${chartH}`}>
        {/* Baseline */}
        <Line
          x1={PAD_LEFT}
          y1={PAD_TOP + plotH}
          x2={chartW - PAD_RIGHT}
          y2={PAD_TOP + plotH}
          stroke={themeColor.hairline}
          strokeWidth={1}
        />
        <G>
          {data.map((d, i) => {
            const barH = (d.y / maxY) * plotH;
            const x = PAD_LEFT + i * slotW + slotW / 2 - barW / 2;
            const y = PAD_TOP + plotH - barH;
            const midX = PAD_LEFT + i * slotW + slotW / 2;
            return (
              <G key={i}>
                <Rect
                  x={x}
                  y={y}
                  width={barW}
                  height={barH}
                  rx={3}
                  fill={barColor}
                  opacity={0.9}
                />
                <SvgText
                  x={midX}
                  y={PAD_TOP + plotH + 14}
                  textAnchor="middle"
                  fontSize={9}
                  fill={themeColor.muted}
                  fontWeight="500"
                >
                  {d.x.length > 4 ? d.x.slice(2) : d.x}
                </SvgText>
              </G>
            );
          })}
        </G>
      </Svg>
    </View>
  );
}
