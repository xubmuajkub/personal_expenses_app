import { render } from '@testing-library/react-native';
import { Pulse } from '@/ui/atoms/Pulse';

describe('Pulse atom', () => {
  it('renders an SVG container of the requested size', () => {
    const { getByTestId } = render(<Pulse color="#ED93B3" size={120} testID="p" />);
    const node = getByTestId('p');
    expect(node.props.width).toBe(120);
    expect(node.props.height).toBe(120);
  });
});
