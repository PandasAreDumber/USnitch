import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { PARKING_LOTS, LOTS_BY_ID } from '../lib/parking';
import { DEFAULT_NOTIFICATION_PREFERENCES, parseNotificationPreferences, preferenceKey, type NotificationPreferences } from '../lib/notificationPreferences';

export type { NotificationPreferences } from '../lib/notificationPreferences';
export type { ParkingLot } from '../lib/parking';

export function useNotificationSettings(userId: string) {
  const [preferences, setPreferences] = useState(DEFAULT_NOTIFICATION_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const operation = useRef(false);
  const active = useRef(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  useEffect(() => {
    let current = true;
    void AsyncStorage.getItem(preferenceKey(userId)).then(value => {
      if (current) setPreferences(parseNotificationPreferences(value));
    }).catch(() => {
      if (current) setError('Could not restore saved settings. Choose your lot and save again.');
    }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [userId, reload]);

  useEffect(() => {
    // Best-effort retirement of a token from the previous native build. Never
    // block in-app alerts or sign-out on the legacy database being absent.
    void (async () => {
      const token = await AsyncStorage.getItem('usnitch.push-token');
      if (!token) return;
      const { error: removeError } = await supabase.from('push_devices').delete().eq('token', token);
      if (!removeError) await AsyncStorage.removeItem('usnitch.push-token');
    })().catch(() => {});
  }, [userId]);

  const save = useCallback(async (patch: Partial<NotificationPreferences>) => {
    if (operation.current || loading) return false;
    if (patch.parked_lot_id != null && !LOTS_BY_ID.has(patch.parked_lot_id)) return false;
    operation.current = true; setBusy(true); setError(null);
    try {
      const next = { ...preferences, ...patch };
      await AsyncStorage.setItem(preferenceKey(userId), JSON.stringify(next));
      if (active.current) setPreferences(next);
      return true;
    } catch {
      if (active.current) setError('Could not save settings on this device. Please try again.');
      return false;
    } finally { operation.current = false; if (active.current) setBusy(false); }
  }, [userId, loading, preferences]);

  return { preferences, lots: PARKING_LOTS, loading, busy, error, save, retry: () => {
    setLoading(true); setError(null); setReload(value => value + 1);
  } };
}
export type NotificationSettings = ReturnType<typeof useNotificationSettings>;
