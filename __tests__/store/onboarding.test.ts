const mockStorage: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => mockStorage[key] ?? null),
  setItem: jest.fn(async (key: string, value: string) => { mockStorage[key] = value; }),
}));

import { useOnboarding } from '@/store/onboarding';

describe('onboarding store', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    useOnboarding.setState({ completed: false, loading: true });
  });

  it('starts not completed', () => {
    expect(useOnboarding.getState().completed).toBe(false);
  });

  it('load returns false when not set', async () => {
    await useOnboarding.getState().load();
    expect(useOnboarding.getState().completed).toBe(false);
  });

  it('finish sets completed to true and persists', async () => {
    await useOnboarding.getState().finish();
    expect(useOnboarding.getState().completed).toBe(true);
    expect(mockStorage['onboarding_v1']).toBe('1');
  });

  it('load restores completed after finish', async () => {
    await useOnboarding.getState().finish();
    useOnboarding.setState({ completed: false });
    await useOnboarding.getState().load();
    expect(useOnboarding.getState().completed).toBe(true);
  });
});
