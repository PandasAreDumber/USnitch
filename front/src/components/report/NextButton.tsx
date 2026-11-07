import { Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRightIcon } from './icons';

// Leaves room for this in content that the button floats over.
export const NEXT_BUTTON_SPACE = 84;

type Props = { onPress: () => void; disabled?: boolean };

// "Next →" pill floating in the bottom-right corner of a report step.
export default function NextButton({ onPress, disabled }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={[styles.button, { bottom: insets.bottom + 20 }, disabled && styles.disabled]}
    >
      <Text style={styles.text}>Next</Text>
      <ArrowRightIcon size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 52,
    paddingLeft: 22,
    paddingRight: 18,
    borderRadius: 26,
    backgroundColor: '#E4332D',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  disabled: { opacity: 0.45 },
  text: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
