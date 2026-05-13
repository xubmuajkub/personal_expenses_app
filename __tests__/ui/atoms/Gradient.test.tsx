import { render } from '@testing-library/react-native';
import { Gradient } from '@/ui/atoms/Gradient';
import { Text } from 'react-native';

describe('Gradient atom', () => {
  it('renders children', () => {
    const { getByText } = render(<Gradient preset="hero"><Text>hi</Text></Gradient>);
    expect(getByText('hi')).toBeTruthy();
  });
});
