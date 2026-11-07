import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../lib/supabase';
import { listSightings, SIGHTING_WINDOW_MS, type Sighting } from '../lib/sightings';

type FeedState = { userId: string | undefined; sightings: Sighting[]; loading: boolean; error: string | null; live: boolean };
const initialState = (userId?: string): FeedState => ({ userId, sightings: [], loading: Boolean(userId), error: null, live: false });

export function useSightings(userId: string | undefined) {
  const [state, setState] = useState<FeedState>(() => initialState());
  const reload = useRef<() => Promise<void>>(async () => {});
  const refresh = useCallback(() => reload.current(), []);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    let pending = false;
    let queued = false;
    const previous = (value: FeedState) => value.userId === userId ? value : initialState(userId);
    async function load() {
      if (!active) return;
      if (pending) { queued = true; return; }
      pending = true;
      try {
        const rows = await listSightings();
        if (active) setState(value => ({ ...previous(value), sightings: rows, loading: false, error: null }));
      } catch {
        if (active) setState(value => ({ ...previous(value), loading: false, error: 'Could not refresh sightings. Check your connection and try again.' }));
      } finally {
        pending = false;
        if (active && queued) { queued = false; void load(); }
      }
    }
    reload.current = load;
    const channel = supabase.channel(`sightings:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sightings' }, () => { void load(); });
    // Resolve the current session before the initial channel join.
    void supabase.realtime.setAuth().then(() => {
      if (!active) return;
      channel.subscribe((status) => {
        if (!active) return;
        setState(value => ({ ...previous(value), live: status === 'SUBSCRIBED' }));
        if (status === 'SUBSCRIBED') void load();
      });
    }).catch(() => { /* Periodic refresh remains available if the socket fails. */ });
    void load();
    // Recover after dropped sockets and remove reports as they age off the map.
    const timer = setInterval(() => {
      setState(value => ({ ...previous(value), sightings: previous(value).sightings.filter(row => Date.parse(row.observed_at) >= Date.now() - SIGHTING_WINDOW_MS) }));
      void load();
    }, 30_000);
    const listener = AppState.addEventListener('change', status => { if (status === 'active') void load(); });
    return () => {
      active = false;
      reload.current = async () => {};
      clearInterval(timer);
      listener.remove();
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  // Never render the previous account's cached feed during an account change.
  return { ...(state.userId === userId ? state : initialState(userId)), refresh };
}
