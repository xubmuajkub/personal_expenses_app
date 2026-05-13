import { render } from '@testing-library/react-native';
import { Text } from '@/ui/Text';
import { color } from '@/ui/theme';

function flatStyle(node: { props: { style: unknown } }): Record<string, unknown> {
  const s = node.props.style;
  if (Array.isArray(s)) return Object.assign({}, ...(s.filter(Boolean) as object[]));
  return (s ?? {}) as Record<string, unknown>;
}

describe('Text', () => {
  it('default tone is white', () => {
    const { getByText } = render(<Text>hi</Text>);
    expect(flatStyle(getByText('hi')).color).toBe(color.fg);
  });

  it('muted tone maps to color.muted', () => {
    const { getByText } = render(<Text tone="muted">hi</Text>);
    expect(flatStyle(getByText('hi')).color).toBe(color.muted);
  });

  it('legacy tone "onDark" still resolves (aliased to fg)', () => {
    const { getByText } = render(<Text tone="onDark">hi</Text>);
    expect(flatStyle(getByText('hi')).color).toBe(color.fg);
  });

  it('legacy tone "indigo" resolves to pulseIndigo', () => {
    const { getByText } = render(<Text tone="indigo">hi</Text>);
    expect(flatStyle(getByText('hi')).color).toBe(color.pulseIndigo);
  });

  it('legacy tone "pink" resolves to pulsePink', () => {
    const { getByText } = render(<Text tone="pink">hi</Text>);
    expect(flatStyle(getByText('hi')).color).toBe(color.pulsePink);
  });

  it('success/danger semantic tones still work', () => {
    const { getByText: a } = render(<Text tone="success">a</Text>);
    expect(flatStyle(a('a')).color).toBe(color.success);
    const { getByText: b } = render(<Text tone="danger">b</Text>);
    expect(flatStyle(b('b')).color).toBe(color.danger);
  });

  it('onPulse tone uses fg color and adds a text shadow for legibility over gradient', () => {
    const { getByText } = render(<Text tone="onPulse">hi</Text>);
    const s = flatStyle(getByText('hi'));
    expect(s.color).toBe(color.fg);
    expect(s.textShadowColor).toBeDefined();
  });
});
