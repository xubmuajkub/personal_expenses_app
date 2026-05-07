describe('env', () => {
  beforeEach(() => jest.resetModules());

  it('throws when SUPABASE_URL missing', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'k';
    expect(() => require('../src/lib/env').env).toThrow(/SUPABASE_URL/);
  });

  it('returns value when set', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'k';
    const { env } = require('../src/lib/env');
    expect(env.SUPABASE_URL).toBe('https://x.supabase.co');
  });
});
