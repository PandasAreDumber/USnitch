import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

const BAR_COLOR = '#33262C';
const BAR_HEIGHT = 42;
// How far the hump rises above the bar, and how wide its base is.
const HUMP_RISE = 30;
const HUMP_WIDTH = 150;
const BUTTON_SIZE = 60;
// Share of the bottom safe area (the iPhone home bar) the footer pads by. The
// bar sits over the home bar area, so the full inset made it look too high.
const SAFE_AREA_SHARE = 0.4;

// The bar with a smooth hump in the middle, drawn as one shape so the curve
// blends into the flat edges on either side.
const HUMP_PATH = [
  `M0 ${HUMP_RISE}`,
  `C${HUMP_WIDTH * 0.25} ${HUMP_RISE} ${HUMP_WIDTH * 0.28} 0 ${HUMP_WIDTH / 2} 0`,
  `C${HUMP_WIDTH * 0.72} 0 ${HUMP_WIDTH * 0.75} ${HUMP_RISE} ${HUMP_WIDTH} ${HUMP_RISE}`,
  `L${HUMP_WIDTH} ${HUMP_RISE + BAR_HEIGHT}`,
  `L0 ${HUMP_RISE + BAR_HEIGHT}`,
  'Z',
].join(' ');

// Overlaps the content above it by this much, so the map shows on both sides of the hump.
export const REPORT_FOOTER_OVERLAP = HUMP_RISE;

type Props = { onReport: () => void };

export default function ReportFooter({ onReport }: Props) {
  const [pressed, setPressed] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.row} pointerEvents="box-none">
        <View style={styles.flat} />
        <Svg width={HUMP_WIDTH} height={HUMP_RISE + BAR_HEIGHT}>
          <Path d={HUMP_PATH} fill={BAR_COLOR} />
        </Svg>
        <View style={styles.flat} />

        {/* Plain style objects, not a style function: NativeWind drops function
            styles on Pressable on iOS, which left the button invisible. */}
        <View style={styles.buttonSlot} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Report a sighting"
            onPress={onReport}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}
            style={pressed ? [styles.button, styles.pressed] : styles.button}
          >
            <View style={styles.plusHorizontal} />
            <View style={styles.plusVertical} />
          </Pressable>
        </View>
      </View>
      <View style={[styles.safeArea, { height: Math.round(insets.bottom * SAFE_AREA_SHARE) + 1 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: -HUMP_RISE },
  row: { flexDirection: 'row', alignItems: 'flex-end', height: HUMP_RISE + BAR_HEIGHT },
  flat: { flex: 1, height: BAR_HEIGHT, backgroundColor: BAR_COLOR },
  // -1 closes the hairline gap some devices render between the SVG and the views.
  safeArea: { backgroundColor: BAR_COLOR, marginTop: -1 },
  // Full-width layer over the row that centers the button horizontally.
  buttonSlot: {
    position: 'absolute',
    top: (HUMP_RISE + BAR_HEIGHT - BUTTON_SIZE) / 2 - 2,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: '#E4332D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  pressed: { backgroundColor: '#AB2528', transform: [{ scale: 0.95 }] },
  plusHorizontal: { position: 'absolute', width: 26, height: 4, borderRadius: 2, backgroundColor: '#FFFFFF' },
  plusVertical: { position: 'absolute', width: 4, height: 26, borderRadius: 2, backgroundColor: '#FFFFFF' },
});
