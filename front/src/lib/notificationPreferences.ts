import { LOTS_BY_ID } from './parking';

export type NotificationPreferences = {
  enabled: boolean;
  parked_lot_id: string | null;
  all_sightings: boolean;
  parked_sightings: boolean;
  predictions: boolean;
};
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true, parked_lot_id: null, all_sightings: true, parked_sightings: true, predictions: true,
};
export const preferenceKey = (userId: string) => `usnitch.in-app-preferences.v1.${userId}`;

export function parseNotificationPreferences(value: string | null): NotificationPreferences {
  const result = { ...DEFAULT_NOTIFICATION_PREFERENCES };
  if (!value) return result;
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid saved preferences');
  const data = parsed as Record<string, unknown>;
  for (const key of ['enabled', 'all_sightings', 'parked_sightings', 'predictions'] as const) {
    if (typeof data[key] === 'boolean') result[key] = data[key];
  }
  if (typeof data.parked_lot_id === 'string' && LOTS_BY_ID.has(data.parked_lot_id)) result.parked_lot_id = data.parked_lot_id;
  return result;
}
