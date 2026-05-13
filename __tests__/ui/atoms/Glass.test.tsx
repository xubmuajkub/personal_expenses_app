import { render } from '@testing-library/react-native';
import { BlurView } from 'expo-blur';
import { Glass } from '@/ui/atoms/Glass';
import { blur, color } from '@/ui/theme';
import { Text } from 'react-native';

function flatStyle(node: { props: { style: unknown } }): Record<string, unknown> {
  const s = node.props.style;
  if (Array.isArray(s)) return Object.assign({}, ...(s.filter(Boolean) as object[]));
  return (s ?? {}) as Record<string, unknown>;
}

describe('Glass atom', () => {
  it('renders children', () => {
    const { getByText } = render(<Glass><Text>hello</Text></Glass>);
    expect(getByText('hello')).toBeTruthy();
  });

  it('default intensity maps to blur.med on inner BlurView', () => {
    const { UNSAFE_getByType } = render(<Glass><Text>x</Text></Glass>);
    const bv = UNSAFE_getByType(BlurView);
    expect(bv.props.intensity).toBe(blur.med.intensity);
    expect(bv.props.tint).toBe('dark');
  });

  it('strong intensity maps correctly', () => {
    const { UNSAFE_getByType } = render(<Glass intensity="strong"><Text>x</Text></Glass>);
    expect(UNSAFE_getByType(BlurView).props.intensity).toBe(blur.strong.intensity);
  });

  it('overlay uses glassBorder color when border=true', () => {
    const { getByTestId } = render(<Glass intensity="med" border testID="g"><Text>x</Text></Glass>);
    const style = flatStyle(getByTestId('g-overlay'));
    expect(style.borderColor).toBe(color.glassBorder);
    expect(style.borderWidth).toBe(1);
  });

  it('testID lands on outer wrapper', () => {
    const { getByTestId } = render(<Glass testID="g"><Text>x</Text></Glass>);
    expect(getByTestId('g')).toBeTruthy();
  });
});
