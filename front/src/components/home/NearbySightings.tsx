import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { getSightingPhoto, type Coordinates, type Sighting } from '../../lib/sightings';

const COUNT = 3;
const METERS_PER_FOOT = 0.3048;
const FEET_PER_MILE = 5280;

type Props = {
  sightings: Sighting[];
  // Only look up the user's location once the panel has been opened.
  active: boolean;
  onSelect: (sighting: Sighting) => void;
  emptyMessage?: string;
};

// The three closest reports to the user, one per reporter, as photos side by side.
export default function NearbySightings({ sightings, active, onSelect, emptyMessage = 'No reports in the past 24 hours.' }: Props) {
  const [here, setHere] = useState<Coordinates | null>(null);
  const [locating, setLocating] = useState(false);
  const [checked, setChecked] = useState(false);

  async function readPosition() {
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setHere({ latitude: position.coords.latitude, longitude: position.coords.longitude });
  }

  // Asks for permission; only on a tap, never on its own.
  async function locate() {
    setLocating(true);
    try {
      const status = await Location.requestForegroundPermissionsAsync();
      if (status.granted) await readPosition();
    } catch { /* Fall back to the latest reports. */ } finally { setLocating(false); }
  }

  useEffect(() => {
    // The first time the panel opens, use the location if it's already allowed.
    if (!active || checked) return;
    let live = true;
    Location.getForegroundPermissionsAsync()
      .then(status => (live && status.granted ? readPosition() : undefined))
      .catch(() => { /* Fall back to the latest reports. */ })
      .finally(() => { if (live) setChecked(true); });
    return () => { live = false; };
  }, [active, checked]);

  const nearest = useMemo(() => {
    const ranked = sightings
      .map(sighting => ({ sighting, distance: here ? distanceMeters(here, sighting) : null }))
      .sort((a, b) => a.distance !== null && b.distance !== null
        ? a.distance - b.distance
        : Date.parse(b.sighting.observed_at) - Date.parse(a.sighting.observed_at));
    // One per person, so a single reporter's burst doesn't fill all three.
    const seen = new Set<string>();
    return ranked.filter(({ sighting }) => !seen.has(sighting.user_id) && seen.add(sighting.user_id)).slice(0, COUNT);
  }, [sightings, here]);

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{here ? 'Closest reports to you' : 'Latest reports'}</Text>
      {!here && (
        <Pressable accessibilityRole="button" onPress={() => { void locate(); }} disabled={locating} style={styles.locate}>
          <Text style={styles.locateText}>{locating ? 'Finding you…' : 'Use my location to show the closest'}</Text>
        </Pressable>
      )}
      {nearest.length === 0 ? (
        <Text style={styles.empty}>{emptyMessage}</Text>
      ) : (
        <View style={styles.row}>
          {nearest.map(({ sighting, distance }) => (
            <Thumbnail key={sighting.id} sighting={sighting} distance={distance} onPress={() => onSelect(sighting)} />
          ))}
          {/* Keep thumbnails the same width when there are fewer than three. */}
          {Array.from({ length: COUNT - nearest.length }, (_, i) => <View key={`gap-${i}`} style={styles.cell} />)}
        </View>
      )}
    </View>
  );
}

function Thumbnail({ sighting, distance, onPress }: { sighting: Sighting; distance: number | null; onPress: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    getSightingPhoto(sighting.photo_path).then(value => { if (live) setUrl(value); }).catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [sighting.photo_path]);

  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Open sighting photo" onPress={onPress} style={styles.cell}>
      <View style={styles.photo}>
        {url && !failed && <Image source={{ uri: url }} style={styles.image} resizeMode="cover" onError={() => setFailed(true)} />}
        {!url && !failed && <ActivityIndicator color="#FB503F" />}
        {failed && <Text style={styles.failed}>No photo</Text>}
      </View>
      <Text style={styles.meta} numberOfLines={1}>{distance !== null ? formatDistance(distance) : timeAgo(sighting.observed_at)}</Text>
    </Pressable>
  );
}

function distanceMeters(a: Coordinates, b: Coordinates) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

function formatDistance(meters: number) {
  const feet = meters / METERS_PER_FOOT;
  if (feet < 1000) return `${Math.round(feet / 10) * 10} ft away`;
  return `${(feet / FEET_PER_MILE).toFixed(1)} mi away`;
}

function timeAgo(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  title: { color: '#fff', fontSize: 17, fontWeight: '700' },
  locate: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: '#D7A49E' },
  locateText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  empty: { color: '#D7BEC5', fontSize: 14 },
  row: { flexDirection: 'row', gap: 10 },
  cell: { flex: 1, gap: 6 },
  photo: { aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: '#211B20', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  failed: { color: '#BCA3AA', fontSize: 12 },
  meta: { color: '#F3E3E0', fontSize: 12, textAlign: 'center' },
});
