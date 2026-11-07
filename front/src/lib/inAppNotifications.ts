import type { Sighting } from './sightings';
import type { NotificationPreferences } from './notificationPreferences';
import { LOTS_BY_ID, nearestParkingLot } from './parking';

export const ALERT_WINDOW_MS = 30 * 60_000;
export const PREDICTION_COOLDOWN_MS = 2 * 60 * 60_000;
export const PREDICTION_THRESHOLD = 0.7;
export function isCurrentPredictionTime(scoredAt: number, now: number) {
  return Number.isFinite(scoredAt) && now - scoredAt <= 6 * 60_000
    && Math.floor(scoredAt / ALERT_WINDOW_MS) === Math.floor(now / ALERT_WINDOW_MS);
}
export type InAppNotification = {
  id: string; kind: 'sighting' | 'prediction' | 'preview'; title: string; body: string;
  createdAt: number; expiresAt: number; read: boolean; lotId?: string; sighting?: Sighting;
};

export function notificationAllowed(item: InAppNotification, prefs: NotificationPreferences, now: number) {
  if (item.expiresAt <= now || !prefs.enabled) return false;
  if (item.kind === 'preview') return true;
  if (item.kind === 'prediction') return prefs.predictions && item.lotId === prefs.parked_lot_id;
  return prefs.all_sightings || (prefs.parked_sightings && item.lotId === prefs.parked_lot_id);
}

export function parsePredictionCooldowns(value: string | null, now: number): Record<string, number> {
  if (!value) return {};
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object') return {};
  return Object.fromEntries(Object.entries(parsed).filter(([lot, time]) =>
    LOTS_BY_ID.has(lot) && typeof time === 'number' && Number.isFinite(time)
    && time <= now && now - time < PREDICTION_COOLDOWN_MS));
}

// Pure tracker shared by Realtime refreshes and polling: one alert per report.
export class InAppAlertTracker {
  private seen = new Map<string, number>();
  private initialized = false;
  constructor(readonly predictionCooldowns: Record<string, number> = {}) {}

  sightings(rows: Sighting[], userId: string, prefs: NotificationPreferences, now: number): InAppNotification[] {
    if (!this.initialized) {
      this.initialized = true;
      rows.forEach(row => this.seen.set(row.id, now));
      return []; // Opening the map must not replay the entire historical feed.
    }
    const alerts: InAppNotification[] = [];
    for (const row of [...rows].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))) {
      if (this.seen.has(row.id)) continue;
      this.seen.set(row.id, now);
      const observed = Date.parse(row.observed_at);
      if (row.user_id === userId || !Number.isFinite(observed) || observed < now - ALERT_WINDOW_MS || observed > now + 5 * 60_000) continue;
      const lot = nearestParkingLot(row);
      if (!lot) continue;
      const parked = prefs.parked_sightings && lot.Lot_ID === prefs.parked_lot_id;
      const item: InAppNotification = {
        id: `sighting:${row.id}`, kind: 'sighting', lotId: lot.Lot_ID, sighting: row,
        title: parked ? 'Enforcement at your parked lot' : 'New enforcement sighting',
        body: `Someone reported parking enforcement near ${lot.name}. Tap to see the sighting.`,
        createdAt: now, expiresAt: observed + ALERT_WINDOW_MS, read: false,
      };
      if (notificationAllowed(item, prefs, now)) alerts.push(item);
    }
    // Keep IDs even if a row briefly disappears during overlapping feed pages.
    for (const [id, seenAt] of this.seen) if (now - seenAt > 24 * 60 * 60_000) this.seen.delete(id);
    return alerts;
  }

  prediction(scores: Record<string, number>, prefs: NotificationPreferences, now: number): InAppNotification[] {
    const lot = prefs.parked_lot_id ? LOTS_BY_ID.get(prefs.parked_lot_id) : null;
    if (!lot || !prefs.enabled || !prefs.predictions) return [];
    const score = scores[lot.Lot_ID];
    if (!Number.isFinite(score) || score < PREDICTION_THRESHOLD) return [];
    const last = this.predictionCooldowns[lot.Lot_ID];
    if (last != null && now - last < PREDICTION_COOLDOWN_MS) return [];
    this.predictionCooldowns[lot.Lot_ID] = now;
    const slot = Math.floor(now / ALERT_WINDOW_MS);
    return [{ id: `prediction:${lot.Lot_ID}:${slot}`, kind: 'prediction', lotId: lot.Lot_ID,
      title: 'Higher enforcement risk at your parked lot',
      body: `Enforcement is predicted to be more likely near ${lot.name} during the current 30-minute window.`,
      createdAt: now, expiresAt: (slot + 1) * ALERT_WINDOW_MS, read: false }];
  }
}
