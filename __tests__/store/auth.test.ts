const mockAuth = {
  getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
  onAuthStateChange: jest.fn(),
  signOut: jest.fn().mockResolvedValue({ error: null }),
};
jest.mock('@/lib/supabase', () => ({ getSupabase: () => ({ auth: mockAuth }) }));

import { useAuth } from '@/store/auth';

describe('auth store', () => {
  beforeEach(() => {
    useAuth.setState({ session: null, user: null, loading: true });
    jest.clearAllMocks();
    mockAuth.getSession.mockResolvedValue({ data: { session: null } });
    mockAuth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });
  });

  it('initialises with no session', async () => {
    await useAuth.getState().init();
    expect(useAuth.getState().user).toBeNull();
    expect(useAuth.getState().loading).toBe(false);
  });

  it('loading starts true', () => {
    expect(useAuth.getState().loading).toBe(true);
  });

  it('signOut calls supabase signOut', async () => {
    await useAuth.getState().signOut();
    expect(mockAuth.signOut).toHaveBeenCalled();
  });

  it('sets user when session present', async () => {
    const fakeUser = { id: 'user-1', email: 'test@test.com' };
    const fakeSession = { user: fakeUser, access_token: 'tok' };
    mockAuth.getSession.mockResolvedValue({ data: { session: fakeSession } });
    await useAuth.getState().init();
    expect(useAuth.getState().user?.id).toBe('user-1');
    expect(useAuth.getState().loading).toBe(false);
  });
});
