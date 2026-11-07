import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = { label: string; onPress: () => void; disabled?: boolean; busy?: boolean };

// Full-width primary action pinned to the bottom of a report step.
export default function StepFooter({ label, onPress, disabled, busy }: Props) {
  const off = disabled || busy;
  return (
    <SafeAreaView edges={['bottom']} style={styles.area}>
      <View style={styles.inner}>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: off, busy }} disabled={off} onPress={onPress} style={off ? [styles.button, styles.disabled] : styles.button}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.text}>{label}</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  area: { backgroundColor: '#33262C', borderTopWidth: 1, borderColor: '#4E3A42' },
  inner: { paddingHorizontal: 20, paddingVertical: 12, width: '100%', maxWidth: 660, alignSelf: 'center' },
  button: { borderRadius: 14, backgroundColor: '#E4332D', paddingVertical: 16, alignItems: 'center' },
  disabled: { opacity: 0.4 },
  text: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
