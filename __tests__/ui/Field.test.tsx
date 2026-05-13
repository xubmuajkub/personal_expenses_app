import { fireEvent, render } from '@testing-library/react-native';
import { Field } from '@/ui/Field';

describe('Field', () => {
  it('shows label and value', () => {
    const { getByDisplayValue, getByText } = render(
      <Field label="Amount" value="42" onChangeText={() => {}} />,
    );
    expect(getByText('Amount')).toBeTruthy();
    expect(getByDisplayValue('42')).toBeTruthy();
  });
  it('reports change events', () => {
    const fn = jest.fn();
    const { getByDisplayValue } = render(<Field label="X" value="a" onChangeText={fn} />);
    fireEvent.changeText(getByDisplayValue('a'), 'b');
    expect(fn).toHaveBeenCalledWith('b');
  });
  it('shows error message when error prop provided', () => {
    const { getByText } = render(
      <Field label="L" value="" onChangeText={() => {}} error="Required" />,
    );
    expect(getByText('Required')).toBeTruthy();
  });
});
