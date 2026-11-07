import type { Sighting } from '../../lib/sightings';

export const SLOT_MINUTES = 30;
export const DAYS_AHEAD = 7; // today plus the next six days
const DAY_MINUTES = 24 * 60;

// A 30-minute window: `day` days from today, starting `start` minutes after
// midnight (local time).
export type TimeSlot = { day: number; start: number };

export function currentSlot(now = new Date()): TimeSlot {
  const minutes = now.getHours() * 60 + now.getMinutes();
  return { day: 0, start: minutes - (minutes % SLOT_MINUTES) };
}

// The slot's start as a real date, e.g. for asking a prediction model.
export function slotDate(slot: TimeSlot, now = new Date()) {
  const date = new Date(now);
  date.setDate(date.getDate() + slot.day);
  date.setHours(Math.floor(slot.start / 60), slot.start % 60, 0, 0);
  return date;
}

export function formatDay(day: number, now = new Date()) {
  if (day === 0) return 'Today';
  if (day === 1) return 'Tomorrow';
  const date = new Date(now);
  date.setDate(date.getDate() + day);
  return date.toLocaleDateString([], { weekday: 'short', month: 'numeric', day: 'numeric' });
}

export function formatSlotTime(minutes: number) {
  const date = new Date();
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatSlotRange(slot: TimeSlot) {
  const end = (slot.start + SLOT_MINUTES) % DAY_MINUTES;
  return `${formatDay(slot.day)} ${formatSlotTime(slot.start)} – ${formatSlotTime(end)}`;
}

// Sightings whose time of day falls in the slot. Reports only last 24 hours, so
// this shows where enforcement was seen around that time of day most recently;
// the day only matters once predictions are hooked up (see slotDate).
export function sightingsInSlot<T extends Pick<Sighting, 'observed_at'>>(sightings: T[], slot: TimeSlot) {
  return sightings.filter(sighting => {
    const seen = new Date(sighting.observed_at);
    const minutes = seen.getHours() * 60 + seen.getMinutes();
    return minutes >= slot.start && minutes < slot.start + SLOT_MINUTES;
  });
}
