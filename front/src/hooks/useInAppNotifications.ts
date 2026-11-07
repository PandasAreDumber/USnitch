import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Sighting } from '../lib/sightings';
import type { NotificationPreferences } from '../lib/notificationPreferences';
import { InAppAlertTracker, isCurrentPredictionTime, notificationAllowed, parsePredictionCooldowns, type InAppNotification } from '../lib/inAppNotifications';

type Inputs = {
  userId: string; preferences: NotificationPreferences; settingsLoading: boolean;
  sightings: Sighting[]; sightingsLoading: boolean; sightingsError: string | null;
  scores: Record<string, number>; predictionsLoading: boolean; predictionsError: string | null; predictionsUpdatedAt: number | null;
  paused: boolean;
};
type State = { history: InAppNotification[]; queue: InAppNotification[]; now: number };

export function useInAppNotifications(input: Inputs) {
  const { userId, preferences, settingsLoading, sightings, sightingsLoading, sightingsError,
    scores, predictionsLoading, predictionsError, predictionsUpdatedAt, paused } = input;
  const [tracker] = useState(() => new InAppAlertTracker());
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<State>(() => ({ history: [], queue: [], now: Date.now() }));
  const [foreground, setForeground] = useState(AppState.currentState !== 'background');
  const [inboxOpen, setInboxOpen] = useState(false);
  const cooldownKey = `usnitch.in-app-cooldowns.v1.${userId}`;

  const append = useCallback((items: InAppNotification[]) => {
    if (!items.length) return;
    const now = Date.now();
    setState(previous => {
      const existing = new Set(previous.history.map(item => item.id));
      const fresh = items.filter(item => !existing.has(item.id));
      return { now, history: [...fresh].reverse().concat(previous.history).slice(0, 20),
        queue: [...previous.queue.filter(item => item.expiresAt > now), ...fresh].slice(0, 5) };
    });
  }, []);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(cooldownKey).then(value => {
      Object.assign(tracker.predictionCooldowns, parsePredictionCooldowns(value, Date.now()));
    }).catch(() => { /* In-memory cooldowns still prevent repeats in this session. */ })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [cooldownKey, tracker]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', status => {
      setForeground(status === 'active');
      if (status === 'active') setState(value => ({ ...value, now: Date.now() }));
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) setState(previous => ({ ...previous, now: Date.now(),
        queue: previous.queue.filter(item => notificationAllowed(item, preferences, Date.now())) }));
    });
    return () => { active = false; };
  }, [preferences]);

  useEffect(() => {
    if (!ready || settingsLoading || sightingsLoading || sightingsError) return;
    let active = true;
    // Feed callbacks settle before processing; cancelled effects never enqueue.
    void Promise.resolve().then(() => {
      if (active) append(tracker.sightings(sightings, userId, preferences, Date.now()));
    });
    return () => { active = false; };
  }, [ready, settingsLoading, sightingsLoading, sightingsError, sightings, userId, preferences, tracker, append]);

  useEffect(() => {
    if (!ready || settingsLoading || predictionsLoading || predictionsError || predictionsUpdatedAt === null) return;
    let active = true;
    void Promise.resolve().then(() => {
      const now = Date.now();
      if (!active || !isCurrentPredictionTime(predictionsUpdatedAt, now)) return;
      const items = tracker.prediction(scores, preferences, now);
      append(items);
      if (items.length) void AsyncStorage.setItem(cooldownKey, JSON.stringify(tracker.predictionCooldowns)).catch(() => {});
    });
    return () => { active = false; };
  }, [ready, settingsLoading, predictionsLoading, predictionsError, predictionsUpdatedAt, scores, preferences, tracker, append, cooldownKey]);

  // Re-check toggles, cleared/changed lots, and expiry before showing queued alerts.
  const banner = foreground && !paused && !inboxOpen
    ? state.queue.find(item => notificationAllowed(item, preferences, state.now)) ?? null : null;
  const dismiss = useCallback((id: string) => {
    setState(previous => ({ ...previous, now: Date.now(), queue: previous.queue.filter(item => item.id !== id) }));
  }, []);
  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => dismiss(banner.id), Math.max(0, Math.min(8_000, banner.expiresAt - Date.now())));
    return () => clearTimeout(timer);
  }, [banner, dismiss]);

  const markRead = useCallback((id: string) => {
    setState(previous => ({ ...previous, now: Date.now(), queue: previous.queue.filter(item => item.id !== id),
      history: previous.history.map(item => item.id === id ? { ...item, read: true } : item) }));
  }, []);
  const openInbox = useCallback(() => {
    setInboxOpen(true);
    setState(previous => ({ ...previous, queue: [], history: previous.history.map(item => ({ ...item, read: true })) }));
  }, []);
  const preview = useCallback(() => {
    const now = Date.now();
    append([{ id: `preview:${now}`, kind: 'preview', title: 'Preview: enforcement alert',
      body: 'Your in-app notifications work! New sightings and higher-risk predictions will appear here while you use USnitch.',
      createdAt: now, expiresAt: now + 5 * 60_000, read: false }]);
  }, [append]);

  return { banner, history: state.history, unreadCount: state.history.filter(item => !item.read).length,
    inboxOpen, openInbox, closeInbox: () => setInboxOpen(false), dismiss, markRead, preview };
}
export type InAppNotifications = ReturnType<typeof useInAppNotifications>;
