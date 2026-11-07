import { Pressable, StyleSheet, Text, View } from 'react-native';

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
};

type Props = ConfirmOptions & { onCancel: () => void };

// In-app confirmation drawn over the report screens. Alert.alert isn't used
// because it does nothing on web.
export default function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: Props) {
  return (
    <View style={styles.backdrop}>
      <View accessibilityRole="alert" style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={onCancel} style={[styles.button, styles.cancel]}>
            <Text style={styles.cancelText}>Stay here</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onConfirm} style={[styles.button, styles.confirm]}>
            <Text style={styles.confirmText}>{confirmLabel}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#000000AA', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, backgroundColor: '#43333A', borderRadius: 16, padding: 20, gap: 10, borderWidth: 1, borderColor: '#A16963' },
  title: { color: '#fff', fontSize: 18, fontWeight: '700' },
  message: { color: '#E8D3D7', fontSize: 15, lineHeight: 21 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  button: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  cancel: { borderWidth: 1, borderColor: '#D7A49E' },
  cancelText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  confirm: { backgroundColor: '#E4332D' },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
