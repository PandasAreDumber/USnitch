import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

export const WHEEL_ITEM_HEIGHT = 38;
const VISIBLE_ITEMS = 5; // odd, so one item sits in the middle
// Wait this long after scrolling stops before settling on an item.
const SETTLE_MS = 120;

export type WheelItem<T> = { label: string; value: T };

type Props<T> = {
  items: WheelItem<T>[];
  value: T;
  onChange: (value: T) => void;
  width: number;
  accessibilityLabel: string;
};

// One column of an alarm-clock style picker: scroll (or tap) an item into the
// middle band to choose it.
export default function Wheel<T>({ items, value, onChange, width, accessibilityLabel }: Props<T>) {
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedIndex = Math.max(0, items.findIndex(item => item.value === value));
  // Which item is in the middle right now, for highlighting while scrolling.
  const [centerIndex, setCenterIndex] = useState(selectedIndex);

  // Keep the wheel on the chosen value when it changes from outside.
  useEffect(() => {
    scroll.current?.scrollTo({ y: selectedIndex * WHEEL_ITEM_HEIGHT, animated: false });
  }, [selectedIndex]);

  useEffect(() => () => { if (settleTimer.current) clearTimeout(settleTimer.current); }, []);

  function scrollToIndex(index: number) {
    scroll.current?.scrollTo({ y: index * WHEEL_ITEM_HEIGHT, animated: true });
  }

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = clamp(Math.round(event.nativeEvent.contentOffset.y / WHEEL_ITEM_HEIGHT), 0, items.length - 1);
    setCenterIndex(index);
    if (settleTimer.current) clearTimeout(settleTimer.current);
    // Web has no snap-on-release, so snap here once scrolling has stopped.
    settleTimer.current = setTimeout(() => {
      scrollToIndex(index);
      if (index !== selectedIndex) onChange(items[index].value);
    }, SETTLE_MS);
  }

  return (
    <View style={[styles.frame, { width }]} accessibilityLabel={accessibilityLabel}>
      <ScrollView
        ref={scroll}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        nestedScrollEnabled
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onContentSizeChange={() => scroll.current?.scrollTo({ y: selectedIndex * WHEEL_ITEM_HEIGHT, animated: false })}
        contentContainerStyle={styles.content}
      >
        {items.map((item, index) => {
          const distance = Math.abs(index - centerIndex);
          return (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityState={{ selected: index === selectedIndex }}
              onPress={() => scrollToIndex(index)}
              style={styles.item}
            >
              <Text style={[styles.label, distance === 0 ? styles.center : { opacity: distance === 1 ? 0.55 : 0.25 }]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

const PAD = WHEEL_ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2);

const styles = StyleSheet.create({
  frame: { height: WHEEL_ITEM_HEIGHT * VISIBLE_ITEMS, overflow: 'hidden' },
  // Padding lets the first and last items reach the middle band.
  content: { paddingVertical: PAD },
  item: { height: WHEEL_ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  label: { color: '#fff', fontSize: 20, fontWeight: '500' },
  center: { fontSize: 23, fontWeight: '700' },
});
