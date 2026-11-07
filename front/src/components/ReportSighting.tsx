import { useState } from 'react';
import { ActivityIndicator, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as Location from 'expo-location';
import CampusMap from './CampusMap';
import { isCampusLocation, publishSighting, type Coordinates } from '../lib/sightings';

type Photo = { uri: string; base64: string };
type Props = { userId: string; onClose: () => void; onPublished: () => void };

export default function ReportSighting({ userId, onClose, onPublished }: Props) {
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [minutesAgo, setMinutesAgo] = useState(0);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disabled = busy || preparing;

  async function choosePhoto(camera: boolean) {
    if (disabled) return;
    setError(null);
    try {
      if (camera && Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) throw new Error('Camera access is off. Choose a photo from your library instead.');
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsMultipleSelection: false, quality: 1, exif: false };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets?.length) return;
      setPreparing(true);
      const asset = result.assets[0];
      const context = ImageManipulator.manipulate(asset.uri);
      const longestSide = Math.max(asset.width, asset.height);
      if (longestSide > 1600) context.resize(asset.width >= asset.height ? { width: 1600 } : { height: 1600 });
      const rendered = await context.renderAsync();
      const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
      if (!saved.base64) throw new Error('Could not prepare this image. Please choose another photo.');
      setPhoto({ uri: saved.uri, base64: saved.base64 });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not open the photo. Please try another image.');
    } finally { setPreparing(false); }
  }

  async function locateSighting() {
    setLocating(true); setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('Location access is off. Tap the map to place your sighting.');
      const position = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error('Location took too long. Tap the map to place your sighting.')), 12_000)),
      ]);
      if (!isCampusLocation(position.coords)) throw new Error('You’re outside the campus map area. Tap where you saw the vehicle on the map.');
      setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not get your location. Tap the map instead.');
    } finally { setLocating(false); }
  }

  async function publish() {
    if (!photo || !location || disabled) return;
    setBusy(true); setError(null);
    try {
      await publishSighting({
        userId, base64: photo.base64, location, note,
        observedAt: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
      });
      onPublished();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not publish this sighting. Please try again.');
    } finally { setBusy(false); }
  }

  return (
    <Modal animationType="slide" onRequestClose={() => { if (!disabled) onClose(); }}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title}>Report a sighting</Text>
          <Pressable accessibilityRole="button" onPress={onClose} disabled={disabled} style={styles.close}><Text style={styles.closeText}>Cancel</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.intro}>A photo and a pin help everyone see what’s happening.</Text>
          <Text style={styles.label}>1. Add a photo</Text>
          {photo && <Image accessibilityLabel="Selected sighting photo" source={{ uri: photo.uri }} style={styles.preview} resizeMode="contain" />}
          <View style={styles.row}>
            <Pressable accessibilityRole="button" onPress={() => { void choosePhoto(false); }} disabled={disabled} style={styles.secondary}><Text style={styles.buttonText}>{photo ? 'Change photo' : 'Choose photo'}</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => { void choosePhoto(true); }} disabled={disabled} style={styles.secondary}><Text style={styles.buttonText}>Take photo</Text></Pressable>
            {preparing && <ActivityIndicator color="#FB503F" />}
          </View>
          <Text style={styles.label}>2. Where did you see it?</Text>
          <Text style={styles.hint}>Tap the map to place or adjust the pin.</Text>
          <View style={styles.map} pointerEvents={busy ? 'none' : 'auto'}>
            <CampusMap pickingLocation selectedLocation={location} onLocationSelected={(point) => {
              if (isCampusLocation(point)) { setLocation(point); setError(null); }
              else setError('Place the pin inside the campus map area.');
            }} />
          </View>
          <View style={styles.row}>
            <Pressable accessibilityRole="button" onPress={() => { void locateSighting(); }} disabled={locating || disabled} style={styles.secondary}>
              <Text style={styles.buttonText}>{locating ? 'Finding location…' : 'Use my location'}</Text>
            </Pressable>
            <Text style={styles.coordinate}>{location ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : 'No pin selected'}</Text>
          </View>
          <Text style={styles.label}>3. When did you see it?</Text>
          <View style={styles.row}>
            {[0, 5, 15, 30, 60].map(minutes => (
              <Pressable accessibilityRole="button" accessibilityState={{ selected: minutesAgo === minutes }} key={minutes} disabled={busy} onPress={() => setMinutesAgo(minutes)} style={[styles.chip, minutesAgo === minutes && styles.selected]}>
                <Text style={styles.buttonText}>{minutes === 0 ? 'Just now' : `${minutes}m ago`}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Details <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput accessibilityLabel="Sighting details" placeholder="What should others know?" placeholderTextColor="#BCA3AA" multiline maxLength={280} value={note} editable={!busy} onChangeText={setNote} style={styles.input} />
          {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <Text style={styles.hint}>Your photo, location, and details will be shared with everyone signed in to USnitch. Reports stay on the map for 24 hours.</Text>
          <Pressable accessibilityRole="button" disabled={!photo || !location || disabled} onPress={() => { void publish(); }} style={[styles.publish, (!photo || !location || disabled) && styles.disabled]}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.publishText}>Publish sighting</Text>}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#33262C' }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#614750' },
  title: { color: '#fff', fontSize: 21, fontWeight: '700' }, close: { padding: 12 }, closeText: { color: '#D7A49E', fontSize: 16 },
  content: { padding: 20, width: '100%', maxWidth: 660, alignSelf: 'center', paddingBottom: 40, gap: 12 }, intro: { color: '#D7BEC5', fontSize: 15, lineHeight: 22 },
  label: { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 12 }, hint: { color: '#D7BEC5', fontSize: 13, lineHeight: 20 },
  preview: { height: 180, width: '100%', backgroundColor: '#211B20', borderRadius: 12 }, row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  secondary: { paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#94727C', borderRadius: 10 }, buttonText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  map: { height: 250, overflow: 'hidden', borderRadius: 12 }, coordinate: { color: '#D7BEC5', fontSize: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 12, borderRadius: 10, backgroundColor: '#43333A' }, selected: { backgroundColor: '#AB2528' },
  input: { borderWidth: 1, borderColor: '#94727C', borderRadius: 10, color: '#fff', padding: 14, fontSize: 16, minHeight: 90, textAlignVertical: 'top' },
  optional: { color: '#BCA3AA', fontWeight: '400' }, error: { color: '#FFB4AB', lineHeight: 22 },
  publish: { borderRadius: 12, backgroundColor: '#E4332D', padding: 17, alignItems: 'center', marginTop: 8 }, publishText: { color: '#fff', fontSize: 16, fontWeight: '700' }, disabled: { opacity: 0.45 },
});
