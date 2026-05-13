import { render } from '@testing-library/react-native';
import { Stack } from '@/ui/atoms/Stack';
import { Text } from 'react-native';

function flatStyle(node: { props: { style: unknown } }): Record<string, unknown> {
  const s = node.props.style;
  if (Array.isArray(s)) return Object.assign({}, ...(s.filter(Boolean) as object[]));
  return (s ?? {}) as Record<string, unknown>;
}

describe('Stack atom', () => {
  it('renders children in column by default', () => {
    const { getByTestId } = render(
      <Stack testID="s"><Text>a</Text></Stack>,
    );
    expect(flatStyle(getByTestId('s')).flexDirection).toBe('column');
  });

  it('uses space(n) for gap', () => {
    const { getByTestId } = render(<Stack gap={3} testID="s" />);
    expect(flatStyle(getByTestId('s')).gap).toBe(12);
  });
});
