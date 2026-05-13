import { useId } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle, Filter, FeGaussianBlur } from 'react-native-svg';

type Props = {
  color: string;
  size: number;
  opacity?: number;
  blur?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Pulse({ color, size, opacity = 0.55, blur = 40, style, testID }: Props) {
  const id = `pulse-${useId()}`;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;
  return (
    <Svg
      width={size}
      height={size}
      {...(style ? { style } : {})}
      {...(testID ? { testID } : {})}
      pointerEvents="none"
    >
      <Defs>
        <RadialGradient id={`grad-${id}`} cx={cx} cy={cy} r={r} fx={cx} fy={cy} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
        <Filter id={`flt-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <FeGaussianBlur stdDeviation={blur} />
        </Filter>
      </Defs>
      <Circle cx={cx} cy={cy} r={r} fill={`url(#grad-${id})`} filter={`url(#flt-${id})`} />
    </Svg>
  );
}
