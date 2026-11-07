import type { Coordinates, Sighting } from '../lib/sightings';

export type MapSighting = Pick<Sighting, 'id' | 'latitude' | 'longitude' | 'observed_at'>;
export type UserMapLocation = Coordinates & { accuracy: number | null };
export type CampusMapProps = {
  onReady?: () => void;
  sightings?: MapSighting[];
  // Enforcement likelihood per lot id (0.05–1) from the prediction server; colors lot outlines.
  likelihoods?: Record<string, number>;
  pickingLocation?: boolean;
  selectedLocation?: Coordinates | null;
  onLocationSelected?: (location: Coordinates) => void;
  onSightingSelected?: (id: string) => void;
  parkedLotId?: string | null;
  canPark?: boolean;
  parkingBusy?: boolean;
  parkingError?: string | null;
  onParkAtLot?: (lotId: string) => void;
  userLocation?: UserMapLocation | null;
  // Incremented only for an explicit recenter request, so GPS updates don't pan the map.
  locationFocusRequest?: number;
  // Space (px) covered by UI along the map's bottom edge; the map credits sit above it.
  bottomInset?: number;
};

export function getMapState(props: CampusMapProps) {
  return {
    type: 'usnitch-state',
    sightings: props.sightings ?? [],
    likelihoods: props.likelihoods ?? null,
    pickingLocation: props.pickingLocation ?? false,
    selectedLocation: props.selectedLocation ?? null,
    parkedLotId: props.parkedLotId ?? null,
    canPark: props.canPark ?? false,
    parkingBusy: props.parkingBusy ?? false,
    parkingError: props.parkingError ?? null,
    userLocation: props.userLocation ?? null,
    locationFocusRequest: props.locationFocusRequest ?? 0,
  };
}

export function handleMapMessage(raw: unknown, props: CampusMapProps) {
  if (raw === 'map-ready') { props.onReady?.(); return; }
  try {
    const message = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!message || typeof message !== 'object') return;
    if (message.type === 'sighting-selected' && typeof message.id === 'string') props.onSightingSelected?.(message.id);
    if (message.type === 'park-at-lot' && !props.pickingLocation && props.canPark && !props.parkingBusy && typeof message.id === 'string') {
      props.onParkAtLot?.(message.id);
    }
    if (message.type === 'location-selected' && props.pickingLocation && Number.isFinite(message.latitude) && Number.isFinite(message.longitude)) {
      props.onLocationSelected?.({ latitude: message.latitude, longitude: message.longitude });
    }
  } catch { /* Ignore unrelated iframe/WebView messages. */ }
}
