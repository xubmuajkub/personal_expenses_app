import { fireEvent, render } from '@testing-library/react-native';
import { Chip } from '@/ui/Chip';

describe('Chip', () => {
  it('reflects selected state via accessibilityState', () => {
    const { getByRole } = render(<Chip label="Food" selected onPress={() => {}} />);
    expect(getByRole('button').props.accessibilityState.selected).toBe(true);
  });
  it('fires onPress', () => {
    const fn = jest.fn();
    const { getByText } = render(<Chip label="Tap" onPress={fn} />);
    fireEvent.press(getByText('Tap'));
    expect(fn).toHaveBeenCalled();
  });
  it('renders label', () => {
    const { getByText } = render(<Chip label="Filter" onPress={() => {}} />);
    expect(getByText('Filter')).toBeTruthy();
  });
});
