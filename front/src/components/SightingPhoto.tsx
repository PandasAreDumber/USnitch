import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSightingPhoto, type Sighting } from '../lib/sightings';

export default function SightingPhoto({ sighting, onClose }: { sighting: Sighting; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void getSightingPhoto(sighting.photo_path).then(value => { if (active) setUrl(value); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [sighting.photo_path, attempt]);
  return (
    <Modal animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title}>Parking enforcement sighting</Text>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.button}><Text style={styles.buttonText}>Close</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.photo}>
            {!url && !error && <ActivityIndicator accessibilityLabel="Loading sighting photo" size="large" color="#FB503F" />}
            {url && !error && <Image accessibilityLabel="Parking enforcement sighting photo" source={{ uri: url }} resizeMode="contain" style={styles.image} onError={() => setError(true)} />}
            {error && <View style={styles.failure}><Text style={styles.text}>Could not load the photo.</Text><Pressable accessibilityRole="button" onPress={() => { setUrl(null); setError(false); setAttempt(value => value + 1); }} style={styles.button}><Text style={styles.buttonText}>Try again</Text></Pressable></View>}
          </View>
          <Text style={styles.label}>Observed</Text>
          <Text style={styles.text}>{new Date(sighting.observed_at).toLocaleString()}</Text>
          <Text style={styles.label}>Location</Text>
          <Text style={styles.text}>{sighting.latitude.toFixed(5)}, {sighting.longitude.toFixed(5)}</Text>
          {sighting.note ? <><Text style={styles.label}>Details</Text><Text style={styles.text}>{sighting.note}</Text></> : null}
          <Text style={styles.caption}>A community report of where enforcement was seen at that time.</Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#33262C' }, header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', padding: 16, gap: 8 },
  title: { color: '#fff', fontSize: 19, fontWeight: '700', flexShrink: 1 }, button: { padding: 12 }, buttonText: { color: '#D7A49E', fontSize: 16 },
  content: { padding: 20, gap: 8, width: '100%', maxWidth: 720, alignSelf: 'center' }, photo: { height: 360, backgroundColor: '#211B20', borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' }, failure: { alignItems: 'center', gap: 8 }, label: { color: '#D7A49E', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginTop: 16 },
  text: { color: '#fff', fontSize: 16, lineHeight: 24 }, caption: { color: '#BCA3AA', fontSize: 13, lineHeight: 21, marginTop: 24 },
});
