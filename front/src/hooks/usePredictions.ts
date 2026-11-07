import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { fetchPredictions, toLikelihoodMap } from '../lib/predictions';

const REFRESH_MS = 5 * 60_000;

type State = { likelihoods: Record<string, number>; loading: boolean; error: string | null; updatedAt: number | null };

// Enforcement likelihood per lot from the prediction server, for `time`
// (a slot start) or for right now when no time is given. Refreshes every few
// minutes and when the app comes back to the foreground, since the model uses
// the latest sightings.
export function usePredictions(time: Date | null, enabled = true) {
  const [state, setState] = useState<State>({ likelihoods: {}, loading: true, error: null, updatedAt: null });
  const reload = useRef<() => void>(() => {});
  const timeKey = time ? time.getTime() : null;

  useEffect(() => {
    if (!enabled) { reload.current = () => {}; return; }
    let controller: AbortController | null = null;
    function load() {
      controller?.abort();
      const current = new AbortController();
      controller = current;
      setState(value => ({ ...value, loading: true }));
      fetchPredictions(timeKey === null ? undefined : new Date(timeKey), current.signal)
        .then(result => {
          if (current.signal.aborted) return;
          // Keep the time actually scored, so alerting can reject a previous slot.
          setState({ likelihoods: toLikelihoodMap(result.lots), loading: false, error: null, updatedAt: Date.parse(result.time) });
        })
        .catch((error: Error) => {
          if (current.signal.aborted) return;
          setState(value => ({ ...value, loading: false, error: error.message || 'Could not load predictions.' }));
        });
    }
    reload.current = load;
    load();
    const timer = setInterval(load, REFRESH_MS);
    const listener = AppState.addEventListener('change', status => { if (status === 'active') load(); });
    return () => { controller?.abort(); clearInterval(timer); listener.remove(); };
  }, [timeKey, enabled]);

  const refresh = useCallback(() => reload.current(), []);
  return { ...state, refresh };
}
