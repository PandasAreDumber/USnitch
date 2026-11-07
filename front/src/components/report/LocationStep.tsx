import { Pressable, StyleSheet, Text, View } from 'react-native';
import CampusMap from '../CampusMap';
import type { Coordinates } from '../../lib/sightings';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LocateIcon } from './icons';

// Height of the coordinates + "Use my location" stack; the map credits sit above it.
const CONTROLS_HEIGHT = 100;

type Props = {
  location: Coordinates | null;
  locating: boolean;
  error: string | null;
  onLocationSelected: (point: Coordinates) => void;
  onUseMyLocation: () => void;
};

// Step 2. The map fills the screen; its center pin marks the picked spot.
export default function LocationStep({ location, locating, error, onLocationSelected, onUseMyLocation }: Props) {
  const insets = useSafeAreaInsets();
  // Bottom row lines up with the floating Next button in the right corner.
  const bottom = insets.bottom + 20;

  return (
    <View style={styles.container}>
      <CampusMap pickingLocation selectedLocation={location} onLocationSelected={onLocationSelected} bottomInset={bottom + CONTROLS_HEIGHT} />

      <View style={styles.topOverlay} pointerEvents="box-none">
        <View style={styles.hint}>
          <Text style={styles.hintText}>Drag the map to put the pin where you saw it</Text>
        </View>
      </View>

      <View style={[styles.bottomOverlay, { bottom }]} pointerEvents="box-none">
        {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        <Text style={styles.coordinate}>
          {location ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : 'Move the pin onto campus'}
        </Text>
        <Pressable accessibilityRole="button" onPress={onUseMyLocation} disabled={locating} style={locating ? [styles.locate, styles.disabled] : styles.locate}>
          <LocateIcon />
          <Text style={styles.locateText}>{locating ? 'Finding you…' : 'Use my location'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  topOverlay: { position: 'absolute', top: 12, left: 12, right: 12, alignItems: 'center' },
  hint: { backgroundColor: '#33262CF2', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  hintText: { color: '#F3E3E0', fontSize: 13 },
  // Right edge leaves room for the Next button.
  bottomOverlay: { position: 'absolute', left: 20, right: 150, gap: 8, alignItems: 'flex-start' },
  locate: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 52, backgroundColor: '#43333A', borderWidth: 1, borderColor: '#D7A49E', borderRadius: 26, paddingHorizontal: 16 },
  locateText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  coordinate: { color: '#F3E3E0', fontSize: 12, backgroundColor: '#33262CE6', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, overflow: 'hidden' },
  error: { color: '#FFB4AB', fontSize: 14, backgroundColor: '#4B2930F2', borderRadius: 10, padding: 10, overflow: 'hidden' },
  disabled: { opacity: 0.5 },
});
