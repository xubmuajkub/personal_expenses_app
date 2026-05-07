jest.mock('@/lib/env', () => ({
  env: {
    SUPABASE_URL: 'https://x.supabase.co',
    SUPABASE_ANON_KEY: 'k',
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

import { getSupabase, resetSupabaseClientForTests } from '@/lib/supabase';

describe('supabase client', () => {
  afterEach(() => resetSupabaseClientForTests());

  it('returns a singleton', () => {
    const a = getSupabase();
    const b = getSupabase();
    expect(a).toBe(b);
  });
});
