import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackIcon, CloseIcon } from './icons';

type Props = {
  title: string;
  step: number;
  totalSteps: number;
  onBack?: () => void;
  onClose: () => void;
  disabled?: boolean;
};

// Red Square bar: optional back arrow on the left, centered title with step dots,
// and an X on the right.
export default function ReportHeader({ title, step, totalSteps, onBack, onClose, disabled }: Props) {
  return (
    <SafeAreaView edges={['top']} style={styles.area}>
      <View style={styles.bar}>
        <View style={styles.side}>
          {onBack && (
            <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} disabled={disabled} hitSlop={8} style={disabled ? [styles.iconButton, styles.disabled] : styles.iconButton}>
              <BackIcon size={26} />
            </Pressable>
          )}
        </View>
        <View style={styles.center}>
          <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>{title}</Text>
          <View style={styles.dots} accessibilityLabel={`Step ${step} of ${totalSteps}`}>
            {Array.from({ length: totalSteps }, (_, i) => (
              <View key={i} style={i + 1 === step ? [styles.dot, styles.dotActive] : i + 1 < step ? [styles.dot, styles.dotDone] : styles.dot} />
            ))}
          </View>
        </View>
        <View style={[styles.side, styles.right]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Exit report" onPress={onClose} disabled={disabled} hitSlop={8} style={disabled ? [styles.iconButton, styles.disabled] : styles.iconButton}>
            <CloseIcon size={24} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  area: { backgroundColor: '#AB2528' }, // Red Square, matching the app header
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  side: { width: 48 },
  right: { alignItems: 'flex-end' },
  center: { flex: 1, alignItems: 'center', gap: 6 },
  title: { color: '#fff', fontSize: 18, fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF40' },
  dotDone: { backgroundColor: '#D7A49E' },
  dotActive: { width: 18, backgroundColor: '#FFFFFF' },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.45 },
});
