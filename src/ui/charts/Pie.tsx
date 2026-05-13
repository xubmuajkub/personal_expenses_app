import { View } from 'react-native';
import Svg, { Path, Circle, G, Text as SvgText } from 'react-native-svg';
import { color as themeColor } from '@/ui/theme';

export interface PieDatum {
  x: string;
  y: number;
  color?: string | undefined;
}

const PALETTE = [
  themeColor.pulseIndigo,
  themeColor.pulseLilac,
  themeColor.pulsePink,
  themeColor.pulseDeep,
  themeColor.catBills,
  themeColor.catShopping,
];

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slicePath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startDeg: number,
  endDeg: number,
): string {
  const o1 = polarToCartesian(cx, cy, outerR, startDeg);
  const o2 = polarToCartesian(cx, cy, outerR, endDeg);
  const i1 = polarToCartesian(cx, cy, innerR, endDeg);
  const i2 = polarToCartesian(cx, cy, innerR, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${o1.x} ${o1.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${o2.x} ${o2.y}`,
    `L ${i1.x} ${i1.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${i2.x} ${i2.y}`,
    'Z',
  ].join(' ');
}

type Props = {
  data: PieDatum[];
  height?: number;
  innerRadius?: number;
};

export function Pie({ data, height = 240, innerRadius = 60 }: Props) {
  const size = height;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 8;

  const total = data.reduce((s, d) => s + d.y, 0);

  if (total === 0) {
    return (
      <View style={{ width: size, height: size, alignSelf: 'center' }}>
        <Svg width={size} height={size}>
          <Circle cx={cx} cy={cy} r={outerR} fill={themeColor.hairline} />
          <Circle cx={cx} cy={cy} r={innerRadius} fill={themeColor.bg} />
        </Svg>
      </View>
    );
  }

  let currentDeg = 0;
  const slices = data.map((d, i) => {
    const sweep = (d.y / total) * 360;
    const start = currentDeg;
    const end = currentDeg + sweep;
    currentDeg = end;
    return { ...d, start, end, fill: d.color ?? PALETTE[i % PALETTE.length]! };
  });

  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }}>
      <Svg width={size} height={size}>
        <G>
          {slices.map((s, i) => (
            <Path
              key={i}
              d={slicePath(cx, cy, outerR, innerRadius, s.start, s.end)}
              fill={s.fill}
            />
          ))}
        </G>
        {/* Donut hole */}
        <Circle cx={cx} cy={cy} r={innerRadius} fill={themeColor.bg} />
        {/* Labels at radius 120 only for slices > 8% */}
        {slices
          .filter((s) => s.end - s.start > 28)
          .map((s, i) => {
            const mid = (s.start + s.end) / 2;
            const labelPos = polarToCartesian(cx, cy, (outerR + innerRadius) / 2, mid);
            return (
              <SvgText
                key={`lbl-${i}`}
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                alignmentBaseline="middle"
                fontSize={10}
                fill={themeColor.fg}
                fontWeight="600"
              >
                {`${Math.round((s.y / total) * 100)}%`}
              </SvgText>
            );
          })}
      </Svg>
    </View>
  );
}
