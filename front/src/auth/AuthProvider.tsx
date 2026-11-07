import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from '../lib/supabase';

type AuthState = { session: Session | null; loading: boolean; error: string | null };
const AuthContext = createContext<AuthState>({ session: null, loading: true, error: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: supabaseConfigured, error: supabaseConfigured ? null : 'Supabase is not configured. Add the project URL and publishable key to front/.env.local, then restart Expo.' });

  useEffect(() => {
    if (!supabaseConfigured) return;
    let active = true;
    let authEventReceived = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventReceived = true;
      if (active) setState({ session, loading: false, error: null });
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (active && !authEventReceived) setState({ session: data.session, loading: false, error: error?.message ?? null });
    }).catch(() => {
      if (active && !authEventReceived) setState({ session: null, loading: false, error: 'Could not restore your session. Please sign in again.' });
    });
    if (Platform.OS !== 'web' && AppState.currentState === 'active') supabase.auth.startAutoRefresh();
    const listener = Platform.OS !== 'web' ? AppState.addEventListener('change', (status) => {
      if (status === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    }) : null;
    return () => {
      active = false;
      subscription.unsubscribe();
      listener?.remove();
      if (Platform.OS !== 'web') supabase.auth.stopAutoRefresh();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
