import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import CampusMap from '../CampusMap';
import type { Coordinates } from '../../lib/sightings';

const TIME_OPTIONS = [0, 5, 15, 30, 60];

type Props = {
  photoUri: string;
  location: Coordinates;
  minutesAgo: number;
  note: string;
  busy: boolean;
  error: string | null;
  onMinutesAgoChange: (minutes: number) => void;
  onNoteChange: (note: string) => void;
};

// Step 3. Scrollable: a recap of the photo and location (in the order they were
// picked), then when it was seen and optional details.
export default function DetailsStep({ photoUri, location, minutesAgo, note, busy, error, onMinutesAgoChange, onNoteChange }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Photo</Text>
      <View style={styles.photoFrame}>
        <Image accessibilityLabel="Selected sighting photo" source={{ uri: photoUri }} style={styles.photo} resizeMode="contain" />
      </View>

      <Text style={styles.label}>Location</Text>
      {/* Preview only: touches pass through so the page still scrolls. */}
      <View style={styles.mapFrame} pointerEvents="none">
        <CampusMap selectedLocation={location} />
      </View>

      <Text style={[styles.label, styles.section]}>When did you see it?</Text>
      <View style={styles.chips}>
        {TIME_OPTIONS.map(minutes => (
          <Pressable
            key={minutes}
            accessibilityRole="button"
            accessibilityState={{ selected: minutesAgo === minutes }}
            disabled={busy}
            onPress={() => onMinutesAgoChange(minutes)}
            style={minutesAgo === minutes ? [styles.chip, styles.chipSelected] : styles.chip}
          >
            <Text style={styles.chipText}>{minutes === 0 ? 'Just now' : `${minutes}m ago`}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, styles.section]}>Details <Text style={styles.optional}>(optional)</Text></Text>
      <TextInput
        accessibilityLabel="Sighting details"
        placeholder="What should others know?"
        placeholderTextColor="#BCA3AA"
        multiline
        maxLength={280}
        value={note}
        editable={!busy}
        onChangeText={onNoteChange}
        style={styles.input}
      />

      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <Text style={styles.hint}>
        Your photo, location, and details will be shared with everyone signed in to USnitch. Reports stay on the map for 24 hours.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 32, gap: 10, width: '100%', maxWidth: 660, alignSelf: 'center' },
  label: { color: '#fff', fontSize: 16, fontWeight: '600' },
  section: { marginTop: 14 },
  optional: { color: '#BCA3AA', fontWeight: '400' },
  photoFrame: { height: 200, borderRadius: 14, overflow: 'hidden', backgroundColor: '#211B20' },
  photo: { width: '100%', height: '100%' },
  mapFrame: { height: 160, borderRadius: 14, overflow: 'hidden' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 999, backgroundColor: '#43333A', borderWidth: 1, borderColor: '#5E4750' },
  chipSelected: { backgroundColor: '#AB2528', borderColor: '#E4332D' },
  chipText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#94727C', borderRadius: 12, color: '#fff', padding: 14, fontSize: 16, minHeight: 100, textAlignVertical: 'top' },
  error: { color: '#FFB4AB', lineHeight: 22 },
  hint: { color: '#D7BEC5', fontSize: 13, lineHeight: 20, marginTop: 6 },
});
