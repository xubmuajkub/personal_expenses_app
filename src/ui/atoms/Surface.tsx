import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { color, radius as R, shadow } from '@/ui/theme';

type Props = {
  variant?: 'raised' | 'flat';
  radius?: keyof typeof R;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  testID?: string;
};

export function Surface({ variant = 'raised', radius = 'lg', style, children, testID }: Props) {
  const variantStyle: ViewStyle =
    variant === 'raised'
      ? { backgroundColor: color.bgRaised, borderRadius: R[radius], ...shadow.s1 }
      : { backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: color.hairline };
  return (
    <View testID={testID} style={[variantStyle, style]}>
      {children}
    </View>
  );
}
