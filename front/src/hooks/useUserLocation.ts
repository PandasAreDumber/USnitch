import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import type { UserMapLocation } from '../map/types';

type State = { location: UserMapLocation | null; loading: boolean; error: string | null };

// Foreground only. Coordinates are used for the map and never sent to Supabase.
export function useUserLocation() {
  const [state, setState] = useState<State>({ location: null, loading: true, error: null });
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    let generation = 0;
    let requested = false;
    let backgrounded = AppState.currentState === 'background';
    let subscription: Location.LocationSubscription | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    function stop() {
      generation++;
      subscription?.remove(); subscription = undefined;
      clearTimeout(timeout);
    }
    async function start() {
      stop();
      const run = generation;
      const current = () => active && run === generation;
      try {
        // Re-check permission on returning from Settings; prompt only on initial
        // entry or an explicit retry, not every time the app becomes active.
        const permission = requested ? await Location.getForegroundPermissionsAsync()
          : await Location.requestForegroundPermissionsAsync();
        requested = true;
        if (!current()) return;
        if (!permission.granted) {
          setState({ location: null, loading: false, error: 'Location access is off. Allow location in your device settings to show your blue dot.' });
          return;
        }
        if (!await Location.hasServicesEnabledAsync()) {
          if (current()) setState({ location: null, loading: false, error: 'Turn on location services to show your blue dot.' });
          return;
        }
        if (!current()) return;
        setState({ location: null, loading: true, error: null });
        timeout = setTimeout(() => {
          if (current()) setState(value => value.location ? value : { location: null, loading: false, error: 'Still finding your location. Try again with a clearer GPS signal.' });
        }, 15_000);
        const watch = await Location.watchPositionAsync({
          accuracy: Location.Accuracy.Balanced, distanceInterval: 5, timeInterval: 5_000,
        }, position => {
          if (!current() || Date.now() - position.timestamp > 60_000) return;
          const { latitude, longitude, accuracy } = position.coords;
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
          clearTimeout(timeout);
          setState({ location: { latitude, longitude, accuracy: accuracy != null && Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : null }, loading: false, error: null });
        }, () => {
          if (current()) {
            clearTimeout(timeout);
            setState({ location: null, loading: false, error: 'Could not update your location. Check location access and try again.' });
          }
        });
        if (current()) subscription = watch;
        else watch.remove();
      } catch {
        if (current()) {
          clearTimeout(timeout);
          setState({ location: null, loading: false, error: 'Could not get your location. Check location access and try again.' });
        }
      }
    }
    if (!backgrounded) void start();
    const listener = AppState.addEventListener('change', status => {
      if (status === 'background') {
        backgrounded = true; stop();
        setState({ location: null, loading: true, error: null });
      } else if (status === 'active' && backgrounded) {
        backgrounded = false; void start();
      }
    });
    return () => { active = false; stop(); listener.remove(); };
  }, [retryCount]);

  return { ...state, retry: () => { setState({ location: null, loading: true, error: null }); setRetryCount(count => count + 1); } };
}
