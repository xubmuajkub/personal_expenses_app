import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { space } from '@/ui/theme';

type Align = 'start' | 'center' | 'end' | 'stretch';
type Justify = 'start' | 'center' | 'end' | 'between' | 'around';

const alignMap: Record<Align, ViewStyle['alignItems']> = {
  start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch',
};
const justifyMap: Record<Justify, ViewStyle['justifyContent']> = {
  start: 'flex-start', center: 'center', end: 'flex-end', between: 'space-between', around: 'space-around',
};

type Props = {
  direction?: 'row' | 'col';
  gap?: number;
  align?: Align;
  justify?: Justify;
  style?: ViewStyle;
  children?: ReactNode;
  testID?: string;
};

export function Stack({ direction = 'col', gap = 0, align, justify, style, children, testID }: Props) {
  return (
    <View
      testID={testID}
      style={[
        {
          flexDirection: direction === 'row' ? 'row' : 'column',
          gap: space(gap),
          alignItems: align ? alignMap[align] : undefined,
          justifyContent: justify ? justifyMap[justify] : undefined,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
