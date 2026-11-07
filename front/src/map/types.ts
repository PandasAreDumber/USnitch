import type { Coordinates, Sighting } from '../lib/sightings';

export type MapSighting = Pick<Sighting, 'id' | 'latitude' | 'longitude' | 'observed_at'>;
export type CampusMapProps = {
  onReady?: () => void;
  sightings?: MapSighting[];
  pickingLocation?: boolean;
  selectedLocation?: Coordinates | null;
  onLocationSelected?: (location: Coordinates) => void;
  onSightingSelected?: (id: string) => void;
};

export function getMapState(props: CampusMapProps) {
  return {
    type: 'usnitch-state',
    sightings: props.sightings ?? [],
    pickingLocation: props.pickingLocation ?? false,
    selectedLocation: props.selectedLocation ?? null,
  };
}

export function handleMapMessage(raw: unknown, props: CampusMapProps) {
  if (raw === 'map-ready') { props.onReady?.(); return; }
  try {
    const message = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!message || typeof message !== 'object') return;
    if (message.type === 'sighting-selected' && typeof message.id === 'string') props.onSightingSelected?.(message.id);
    if (message.type === 'location-selected' && props.pickingLocation && Number.isFinite(message.latitude) && Number.isFinite(message.longitude)) {
      props.onLocationSelected?.({ latitude: message.latitude, longitude: message.longitude });
    }
  } catch { /* Ignore unrelated iframe/WebView messages. */ }
}
