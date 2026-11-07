import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { isCampusLocation, publishSighting, type Coordinates } from '../lib/sightings';
import ConfirmDialog, { type ConfirmOptions } from './report/ConfirmDialog';
import DetailsStep from './report/DetailsStep';
import LocationStep from './report/LocationStep';
import NextButton from './report/NextButton';
import PhotoStep from './report/PhotoStep';
import ReportHeader from './report/ReportHeader';
import StepFooter from './report/StepFooter';

type Photo = { uri: string; base64: string };
type Step = 1 | 2 | 3;
type Props = { userId: string; onClose: () => void; onPublished: () => void };

const STEP_TITLES: Record<Step, string> = {
  1: 'Report a sighting',
  2: 'Choose location',
  3: 'When did you see it?',
};

// Three-page report flow: photo → location → time & details. State lives here
// so moving back and forth between pages keeps what the user already picked.
export default function ReportSighting({ userId, onClose, onPublished }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [minutesAgo, setMinutesAgo] = useState(0);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);

  function goTo(next: Step) {
    setError(null);
    setStep(next);
  }

  function requestClose() {
    if (busy) return;
    // Nothing to lose yet, so no warning.
    if (step === 1 && !photo) { onClose(); return; }
    setConfirm({
      title: 'Discard this report?',
      message: 'Your photo and location won’t be saved.',
      confirmLabel: 'Discard',
      onConfirm: onClose,
    });
  }

  function requestBack() {
    if (busy) return;
    if (step === 2) {
      setConfirm({
        title: 'Go back to your photo?',
        message: 'You can change your photo. Your pin will stay where you put it.',
        confirmLabel: 'Go back',
        onConfirm: () => goTo(1),
      });
    } else if (step === 3) {
      setConfirm({
        title: 'Go back to the location?',
        message: 'You can move the pin. Your time and details will be kept.',
        confirmLabel: 'Go back',
        onConfirm: () => goTo(2),
      });
    }
  }

  async function choosePhoto(camera: boolean) {
    if (busy || preparing) return;
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
      if (!permission.granted) throw new Error('Location access is off. Drag the map to put the pin where you saw it.');
      const position = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<never>((_resolve, reject) => setTimeout(() => reject(new Error('Location took too long. Drag the map to put the pin where you saw it.')), 12_000)),
      ]);
      if (!isCampusLocation(position.coords)) throw new Error('You’re outside the campus map area. Drag the map to put the pin where you saw the vehicle.');
      setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not get your location. Drag the map to place the pin instead.');
    } finally { setLocating(false); }
  }

  async function publish() {
    if (!photo || !location || busy) return;
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
    <Modal
      animationType="slide"
      onRequestClose={() => {
        // Android back button: dismiss a warning first, otherwise act like the header buttons.
        if (confirm) setConfirm(null);
        else if (step > 1) requestBack();
        else requestClose();
      }}
    >
      {/* A Modal is its own native window; it needs its own provider for real safe-area insets. */}
      <SafeAreaProvider>
      <View style={styles.screen}>
        <ReportHeader
          title={STEP_TITLES[step]}
          step={step}
          totalSteps={3}
          onBack={step > 1 ? requestBack : undefined}
          onClose={requestClose}
          disabled={busy}
        />

        {step === 1 && (
          <View style={styles.body}>
            <PhotoStep
              photoUri={photo?.uri ?? null}
              preparing={preparing}
              error={error}
              onTakePhoto={() => { void choosePhoto(true); }}
              onChoosePhoto={() => { void choosePhoto(false); }}
            />
            {/* Appears once there's a photo; the two big choices own the page until then. */}
            {photo && !preparing && <NextButton onPress={() => goTo(2)} />}
          </View>
        )}

        {step === 2 && (
          <View style={styles.body}>
            <LocationStep
              location={location}
              locating={locating}
              error={error}
              onLocationSelected={(point) => {
                if (isCampusLocation(point)) { setLocation(point); setError(null); }
                else { setLocation(null); setError('Move the pin inside the campus map area.'); }
              }}
              onUseMyLocation={() => { void locateSighting(); }}
            />
            <NextButton disabled={!location || locating} onPress={() => goTo(3)} />
          </View>
        )}

        {step === 3 && photo && location && (
          <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <DetailsStep
              photoUri={photo.uri}
              location={location}
              minutesAgo={minutesAgo}
              note={note}
              busy={busy}
              error={error}
              onMinutesAgoChange={setMinutesAgo}
              onNoteChange={setNote}
            />
            <StepFooter label="Publish sighting" busy={busy} onPress={() => { void publish(); }} />
          </KeyboardAvoidingView>
        )}

        {confirm && (
          <ConfirmDialog
            {...confirm}
            onCancel={() => setConfirm(null)}
            onConfirm={() => { setConfirm(null); confirm.onConfirm(); }}
          />
        )}
      </View>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#33262C' },
  body: { flex: 1 },
});
