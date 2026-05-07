import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  init: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  session: null,
  user: null,
  loading: true,
  async init() {
    const sb = getSupabase();
    const { data } = await sb.auth.getSession();
    set({ session: data.session, user: data.session?.user ?? null, loading: false });
    // Subscription intentionally lives for the full app lifetime — no cleanup needed.
    sb.auth.onAuthStateChange((_evt, session) => {
      set({ session, user: session?.user ?? null });
    });
  },
  async signOut() {
    await getSupabase().auth.signOut();
  },
}));
