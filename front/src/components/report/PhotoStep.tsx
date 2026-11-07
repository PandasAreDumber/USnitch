import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraIcon, GalleryIcon } from './icons';
import { NEXT_BUTTON_SPACE } from './NextButton';

type Props = {
  photoUri: string | null;
  preparing: boolean;
  error: string | null;
  onTakePhoto: () => void;
  onChoosePhoto: () => void;
};

// Step 1. Fits on one screen: two large choices, or the picked photo with
// options to swap it.
export default function PhotoStep({ photoUri, preparing, error, onTakePhoto, onChoosePhoto }: Props) {
  const insets = useSafeAreaInsets();
  // With a photo, leave room at the bottom for the floating Next button.
  const bottomSpace = insets.bottom + (photoUri ? NEXT_BUTTON_SPACE : 20);

  return (
    <View style={[styles.container, { paddingBottom: bottomSpace }]}>
      {photoUri ? (
        <>
          <View style={styles.previewFrame}>
            <Image accessibilityLabel="Selected sighting photo" source={{ uri: photoUri }} style={styles.preview} resizeMode="contain" />
          </View>
          <View style={styles.swapRow}>
            <Pressable accessibilityRole="button" onPress={onTakePhoto} disabled={preparing} style={styles.swapButton}>
              <CameraIcon size={20} />
              <Text style={styles.swapText}>Retake</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onChoosePhoto} disabled={preparing} style={styles.swapButton}>
              <GalleryIcon size={20} />
              <Text style={styles.swapText}>Choose another</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.heading}>Add a photo of the vehicle</Text>
          <Pressable accessibilityRole="button" onPress={onTakePhoto} disabled={preparing} style={[styles.choice, styles.takeChoice]}>
            <CameraIcon size={52} />
            <Text style={styles.choiceTitle}>Take photo</Text>
            <Text style={styles.choiceHint}>Use your camera now</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onChoosePhoto} disabled={preparing} style={[styles.choice, styles.libraryChoice]}>
            <GalleryIcon size={52} color="#D7A49E" />
            <Text style={styles.choiceTitle}>Choose photo</Text>
            <Text style={styles.choiceHint}>Pick one from your library</Text>
          </Pressable>
        </>
      )}

      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}

      {preparing && (
        <View style={styles.preparing}>
          <ActivityIndicator color="#FB503F" size="large" />
          <Text style={styles.preparingText}>Preparing photo…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 14, width: '100%', maxWidth: 660, alignSelf: 'center' },
  heading: { color: '#fff', fontSize: 17, fontWeight: '600' },
  choice: { flex: 1, borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16 },
  takeChoice: { backgroundColor: '#E4332D' }, // Permanent Geranium Lake
  libraryChoice: { backgroundColor: '#43333A', borderWidth: 2, borderColor: '#D7A49E' }, // Mantle, Mellow Rose
  choiceTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  choiceHint: { color: '#F3E3E0', fontSize: 14 },
  previewFrame: { flex: 1, borderRadius: 16, overflow: 'hidden', backgroundColor: '#211B20' },
  preview: { width: '100%', height: '100%' },
  swapRow: { flexDirection: 'row', gap: 10 },
  swapButton: { flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#A16963' },
  swapText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  error: { color: '#FFB4AB', fontSize: 14, lineHeight: 20 },
  preparing: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#33262CDD', alignItems: 'center', justifyContent: 'center', gap: 12 },
  preparingText: { color: '#fff', fontSize: 15 },
});
