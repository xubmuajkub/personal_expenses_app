import { render } from '@testing-library/react-native';
import { Surface } from '@/ui/atoms/Surface';
import { color } from '@/ui/theme';
import { Text } from 'react-native';

function flatStyle(node: { props: { style: unknown } }): Record<string, unknown> {
  const s = node.props.style;
  if (Array.isArray(s)) return Object.assign({}, ...(s.filter(Boolean) as object[]));
  return (s ?? {}) as Record<string, unknown>;
}

describe('Surface atom', () => {
  it('raised variant uses bgRaised background', () => {
    const { getByTestId } = render(<Surface testID="s" variant="raised"><Text>x</Text></Surface>);
    expect(flatStyle(getByTestId('s')).backgroundColor).toBe(color.bgRaised);
  });
  it('flat variant has transparent background and hairline bottom border', () => {
    const { getByTestId } = render(<Surface testID="s" variant="flat"><Text>x</Text></Surface>);
    const style = flatStyle(getByTestId('s'));
    expect(style.backgroundColor).toBe('transparent');
    expect(style.borderBottomColor).toBe(color.hairline);
  });
});
