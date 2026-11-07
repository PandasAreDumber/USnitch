import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { getSightingPhoto, type Sighting } from '../lib/sightings';
import { CloseIcon } from './report/icons';

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
      {/* A Modal is its own native window, so it needs its own provider to get the
          real safe-area insets; without it the header could sit under the notch. */}
      <SafeAreaProvider>
        <View style={styles.screen}>
          <SafeAreaView edges={['top', 'left', 'right']} style={styles.headerArea}>
            <View style={styles.header}>
              <View style={styles.side} />
              <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>Sighting</Text>
              <View style={[styles.side, styles.right]}>
                <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={12} style={styles.iconButton}>
                  <CloseIcon size={24} />
                </Pressable>
              </View>
            </View>
          </SafeAreaView>
          <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.body}>
            <ScrollView contentContainerStyle={styles.content}>
              <View style={styles.photo}>
                {!url && !error && <ActivityIndicator accessibilityLabel="Loading sighting photo" size="large" color="#FB503F" />}
                {url && !error && <Image accessibilityLabel="Parking enforcement sighting photo" source={{ uri: url }} resizeMode="contain" style={styles.image} onError={() => setError(true)} />}
                {error && <View style={styles.failure}><Text style={styles.text}>Could not load the photo.</Text><Pressable accessibilityRole="button" onPress={() => { setUrl(null); setError(false); setAttempt(value => value + 1); }} style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable></View>}
              </View>
              <Text style={styles.label}>Observed</Text>
              <Text style={styles.text}>{new Date(sighting.observed_at).toLocaleString()}</Text>
              <Text style={styles.label}>Location</Text>
              <Text style={styles.text}>{sighting.latitude.toFixed(5)}, {sighting.longitude.toFixed(5)}</Text>
              {sighting.note ? <><Text style={styles.label}>Details</Text><Text style={styles.text}>{sighting.note}</Text></> : null}
              <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeText}>Close</Text>
              </Pressable>
            </ScrollView>
          </SafeAreaView>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#33262C' }, body: { flex: 1 },
  headerArea: { backgroundColor: '#AB2528' }, // Red Square, matching the app header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  side: { width: 48 }, right: { alignItems: 'flex-end' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', color: '#fff', fontSize: 18, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 32, gap: 8, width: '100%', maxWidth: 720, alignSelf: 'center' }, photo: { height: 360, backgroundColor: '#211B20', borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' }, failure: { alignItems: 'center', gap: 8 }, label: { color: '#D7A49E', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginTop: 16 },
  retry: { padding: 12 }, retryText: { color: '#D7A49E', fontSize: 16 },
  text: { color: '#fff', fontSize: 16, lineHeight: 24 }, caption: { color: '#BCA3AA', fontSize: 13, lineHeight: 21, marginTop: 24 },
  closeButton: { marginTop: 20, borderRadius: 14, borderWidth: 1, borderColor: '#D7A49E', paddingVertical: 15, alignItems: 'center' },
  closeText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
