export const SIGHTING_TIME_WINDOWS = [
  { minutes: 15, label: 'Past 15 minutes', shortLabel: 'Past 15 min' },
  { minutes: 30, label: 'Past 30 minutes', shortLabel: 'Past 30 min' },
  { minutes: 60, label: 'Past 1 hour', shortLabel: 'Past 1 hour' },
  { minutes: 1440, label: 'Past 24 hours', shortLabel: 'Past 24 hours' },
] as const;

export type SightingTimeWindow = (typeof SIGHTING_TIME_WINDOWS)[number]['minutes'];

export function filterSightingsByTime<T extends { observed_at: string }>(
  sightings: T[],
  minutes: SightingTimeWindow,
  asOf: number,
): T[] {
  const cutoff = asOf - minutes * 60_000;
  return sightings.filter(sighting => Date.parse(sighting.observed_at) >= cutoff);
}
