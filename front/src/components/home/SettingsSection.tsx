import { Pressable, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';

type Props = { onSignOut: () => void; signingOut: boolean };

export default function SettingsSection({ onSignOut, signingOut }: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>Settings</Text>
      <View style={styles.card}>
        <Pressable accessibilityRole="button" onPress={onSignOut} disabled={signingOut} style={styles.row}>
          <Text style={styles.danger}>{signingOut ? 'Signing out…' : 'Sign out'}</Text>
        </Pressable>
      </View>
      <Text style={styles.version}>USnitch {Constants.expoConfig?.version ?? ''}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  title: { color: '#fff', fontSize: 17, fontWeight: '700' },
  card: { borderRadius: 14, backgroundColor: '#43333A', borderWidth: 1, borderColor: '#5E4750', overflow: 'hidden' },
  row: { paddingHorizontal: 16, paddingVertical: 15 },
  danger: { color: '#FB503F', fontSize: 16, fontWeight: '600' },
  version: { color: '#BCA3AA', fontSize: 12, textAlign: 'center' },
});
