import { render } from '@testing-library/react-native';
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

  it('default intensity maps to blur.med.intensity on inner BlurView', () => {
    const { getByTestId } = render(<Glass testID="g"><Text>x</Text></Glass>);
    expect(getByTestId('g').props.intensity).toBe(blur.med.intensity);
    expect(getByTestId('g').props.tint).toBe('dark');
  });

  it('strong intensity maps correctly', () => {
    const { getByTestId } = render(<Glass intensity="strong" testID="g" />);
    expect(getByTestId('g').props.intensity).toBe(blur.strong.intensity);
  });

  it('overlay uses glassBorder color when border=true', () => {
    const { getByTestId } = render(<Glass intensity="med" border testID="g"><Text>x</Text></Glass>);
    const style = flatStyle(getByTestId('g-overlay'));
    expect(style.borderColor).toBe(color.glassBorder);
    expect(style.borderWidth).toBe(1);
  });
});
