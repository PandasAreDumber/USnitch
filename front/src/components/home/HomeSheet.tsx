import { useEffect, useState, type ReactNode } from 'react';
import { Animated, PanResponder, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

// Monastery-ish dark at 80% opacity, so the map shows through by 20%.
const SHEET_RGB = '51, 38, 44';
const SHEET_OPACITY = 0.8;
const SHEET_COLOR = `rgba(${SHEET_RGB}, ${SHEET_OPACITY})`;

const BAR_HEIGHT = 42;
// How far the hump rises above the bar, and how wide its base is.
const HUMP_RISE = 30;
const HUMP_WIDTH = 150;
const BUTTON_SIZE = 60;
// Share of the bottom safe area (the iPhone home bar) the bar pads by. The bar
// sits over the home bar area, so the full inset made it look too high.
const SAFE_AREA_SHARE = 0.4;

// The hump drawn as one shape so the curve blends into the flat bar on either side.
const HUMP_PATH = [
  `M0 ${HUMP_RISE}`,
  `C${HUMP_WIDTH * 0.25} ${HUMP_RISE} ${HUMP_WIDTH * 0.28} 0 ${HUMP_WIDTH / 2} 0`,
  `C${HUMP_WIDTH * 0.72} 0 ${HUMP_WIDTH * 0.75} ${HUMP_RISE} ${HUMP_WIDTH} ${HUMP_RISE}`,
  `L${HUMP_WIDTH} ${HUMP_RISE + BAR_HEIGHT}`,
  `L0 ${HUMP_RISE + BAR_HEIGHT}`,
  'Z',
].join(' ');

// Heights of the collapsed sheet, for laying out things that sit above it.
export function useSheetInsets() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.round(insets.bottom * SAFE_AREA_SHARE);
  return { bar: BAR_HEIGHT + bottomPad, hump: HUMP_RISE + BAR_HEIGHT + bottomPad };
}

// Web only: the map is an iframe, and once the mouse passes over it the iframe
// swallows the rest of the drag (including the release). Phones don't need this;
// a touch stays with the element it started on.
function setFramesIgnorePointer(ignore: boolean) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  document.querySelectorAll('iframe').forEach(frame => { frame.style.pointerEvents = ignore ? 'none' : ''; });
}

// Drag state lives in this closure rather than in React refs: the pan handlers
// run outside of rendering and only need the latest numbers.
function createSheetGesture(initialPanelHeight: number, onSettled: (open: boolean) => void) {
  let panelHeight = initialPanelHeight;
  let offset = initialPanelHeight; // 0 = open, panelHeight = closed
  let dragStart = 0;
  const translateY = new Animated.Value(initialPanelHeight);

  function settle(open: boolean) {
    offset = open ? 0 : panelHeight;
    onSettled(open);
    Animated.spring(translateY, {
      toValue: offset,
      useNativeDriver: Platform.OS !== 'web',
      bounciness: 0,
      speed: 18,
    }).start();
  }

  const pan = PanResponder.create({
    // The bar claims a press straight away (the + button and handle, being deeper,
    // still get their own taps first). Waiting for movement instead let mouse
    // drags on web turn into text selection.
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderGrant: () => { translateY.stopAnimation(); dragStart = offset; setFramesIgnorePointer(true); },
    onPanResponderMove: (_e, g) => {
      offset = Math.min(panelHeight, Math.max(0, dragStart + g.dy));
      translateY.setValue(offset);
    },
    onPanResponderRelease: (_e, g) => {
      setFramesIgnorePointer(false);
      // A quick flick wins; otherwise snap to whichever end is closer.
      if (g.vy < -0.4) settle(true);
      else if (g.vy > 0.4) settle(false);
      else settle(offset < panelHeight / 2);
    },
    onPanResponderTerminate: () => { setFramesIgnorePointer(false); settle(offset < panelHeight / 2); },
  });

  function setPanelHeight(height: number) {
    const wasOpen = offset < panelHeight / 2;
    panelHeight = height;
    offset = wasOpen ? 0 : height;
    translateY.setValue(offset);
  }

  return { translateY, pan, settle, setPanelHeight };
}

type Props = {
  onReport: () => void;
  onExpandedChange?: (expanded: boolean) => void;
  children: ReactNode;
};

// Bottom bar with the report button in its hump. Drag the bar up (or tap the
// handle) to reveal a panel of extra options underneath.
export default function HomeSheet({ onReport, onExpandedChange, children }: Props) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const bottomPad = Math.round(insets.bottom * SAFE_AREA_SHARE);
  const panelHeight = Math.round(Math.min(windowHeight * 0.62, 560));

  const [pressed, setPressed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [{ translateY, pan, settle, setPanelHeight }] = useState(() => createSheetGesture(panelHeight, setExpanded));

  useEffect(() => { setPanelHeight(panelHeight); }, [panelHeight, setPanelHeight]);
  useEffect(() => { onExpandedChange?.(expanded); }, [expanded, onExpandedChange]);

  return (
    <Animated.View
      style={[styles.sheet, { transform: [{ translateY }] }]}
      pointerEvents="box-none"
    >
      <View style={styles.row} pointerEvents="box-none" {...pan.panHandlers}>
        <View style={styles.flat} />
        <Svg width={HUMP_WIDTH} height={HUMP_RISE + BAR_HEIGHT}>
          <Path d={HUMP_PATH} fill={`rgb(${SHEET_RGB})`} fillOpacity={SHEET_OPACITY} />
        </Svg>
        <View style={styles.flat} />

        {/* Drag handle; also toggles on tap. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Hide options' : 'Show more options'}
          onPress={() => settle(!expanded)}
          hitSlop={10}
          style={styles.handleSlot}
        >
          <View style={styles.handle} />
        </Pressable>

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

      <View style={[styles.panel, { height: panelHeight + bottomPad }]}>
        <ScrollView
          contentContainerStyle={[styles.panelContent, { paddingTop: bottomPad + 8, paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, userSelect: 'none' },
  row: { flexDirection: 'row', alignItems: 'flex-end', height: HUMP_RISE + BAR_HEIGHT },
  flat: { flex: 1, height: BAR_HEIGHT, backgroundColor: SHEET_COLOR },
  panel: { backgroundColor: SHEET_COLOR },
  panelContent: { paddingHorizontal: 20, gap: 24, width: '100%', maxWidth: 660, alignSelf: 'center' },
  // Handle sits on the bar's right half so it doesn't fight the + button for taps.
  handleSlot: { position: 'absolute', bottom: BAR_HEIGHT / 2 - 12, right: 24, width: 48, height: 24, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 36, height: 5, borderRadius: 3, backgroundColor: '#D7A49E' },
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
