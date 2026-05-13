import { fireEvent, render } from '@testing-library/react-native';
import { Button } from '@/ui/Button';

describe('Button', () => {
  it('renders title and fires onPress', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Save" onPress={onPress} />);
    fireEvent.press(getByText('Save'));
    expect(onPress).toHaveBeenCalled();
  });

  it('legacy "accent" variant still renders title', () => {
    const { getByText } = render(<Button title="Acc" variant="accent" onPress={() => {}} />);
    expect(getByText('Acc')).toBeTruthy();
  });

  it('legacy "secondary" variant still renders title', () => {
    const { getByText } = render(<Button title="Sec" variant="secondary" onPress={() => {}} />);
    expect(getByText('Sec')).toBeTruthy();
  });

  it('danger variant renders', () => {
    const { getByText } = render(<Button title="Del" variant="danger" onPress={() => {}} />);
    expect(getByText('Del')).toBeTruthy();
  });

  it('glass variant renders', () => {
    const { getByText } = render(<Button title="Glass" variant="glass" onPress={() => {}} />);
    expect(getByText('Glass')).toBeTruthy();
  });

  it('ghost variant renders', () => {
    const { getByText } = render(<Button title="Ghost" variant="ghost" onPress={() => {}} />);
    expect(getByText('Ghost')).toBeTruthy();
  });

  it('disabled state is reflected in accessibilityState', () => {
    const { getByRole } = render(<Button title="x" onPress={() => {}} disabled />);
    expect(getByRole('button').props.accessibilityState.disabled).toBe(true);
  });

  it('loading state is reflected in accessibilityState.busy', () => {
    const { getByRole } = render(<Button title="x" onPress={() => {}} loading />);
    expect(getByRole('button').props.accessibilityState.busy).toBe(true);
  });

  it('accessibilityLabel defaults to title', () => {
    const { getByRole } = render(<Button title="Save" onPress={() => {}} />);
    expect(getByRole('button').props.accessibilityLabel).toBe('Save');
  });

  it('accessibilityLabel override is respected', () => {
    const { getByRole } = render(<Button title="Save" accessibilityLabel="Save changes" onPress={() => {}} />);
    expect(getByRole('button').props.accessibilityLabel).toBe('Save changes');
  });
});
