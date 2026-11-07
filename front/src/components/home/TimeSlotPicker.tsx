import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Wheel, { WHEEL_ITEM_HEIGHT, type WheelItem } from './Wheel';
import { DAYS_AHEAD, currentSlot, formatDay, formatSlotRange, type TimeSlot } from './timeSlots';

const HOURS: WheelItem<number>[] = Array.from({ length: 12 }, (_, i) => ({ label: String(i + 1), value: i + 1 }));
const MINUTES: WheelItem<number>[] = [{ label: '00', value: 0 }, { label: '30', value: 30 }];
type Period = 'AM' | 'PM';
const PERIODS: WheelItem<Period>[] = [{ label: 'AM', value: 'AM' }, { label: 'PM', value: 'PM' }];

type Props = {
  selected: TimeSlot | null;
  onSelect: (slot: TimeSlot | null) => void;
};

// Pick a day (today through a week out), then a time on alarm-clock style
// wheels in 30-minute steps. "All" shows every report from the past 24h.
export default function TimeSlotPicker({ selected, onSelect }: Props) {
  const days = useMemo(() => Array.from({ length: DAYS_AHEAD }, (_, day) => ({ day, label: formatDay(day) })), []);

  const start = selected?.start ?? currentSlot().start;
  const hour24 = Math.floor(start / 60);
  const hour12 = hour24 % 12 || 12;
  const minute = start % 60;
  const period: Period = hour24 < 12 ? 'AM' : 'PM';

  function setTime(next: { hour12?: number; minute?: number; period?: Period }) {
    if (!selected) return;
    const h12 = next.hour12 ?? hour12;
    const p = next.period ?? period;
    const h24 = (h12 % 12) + (p === 'PM' ? 12 : 0);
    onSelect({ day: selected.day, start: h24 * 60 + (next.minute ?? minute) });
  }

  return (
    <View style={styles.section}>
      <Text style={styles.title}>When are you parking?</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="All" active={!selected} onPress={() => onSelect(null)} />
        {days.map(({ day, label }) => (
          <Chip key={day} label={label} active={selected?.day === day} onPress={() => onSelect({ day, start })} />
        ))}
      </ScrollView>

      {selected ? (
        <>
          <View style={styles.clock}>
            <View pointerEvents="none" style={styles.band} />
            <Wheel accessibilityLabel="Hour" items={HOURS} value={hour12} onChange={h => setTime({ hour12: h })} width={64} />
            <Text style={styles.colon}>:</Text>
            <Wheel accessibilityLabel="Minute" items={MINUTES} value={minute} onChange={m => setTime({ minute: m })} width={64} />
            <Wheel accessibilityLabel="AM or PM" items={PERIODS} value={period} onChange={p => setTime({ period: p })} width={64} />
          </View>
          <Text style={styles.hint}>Showing reports from around {formatSlotRange(selected)}.</Text>
        </>
      ) : (
        <Text style={styles.hint}>Pick a day to choose a time and see where enforcement was reported around then.</Text>
      )}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={active ? [styles.chip, styles.chipActive] : styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  title: { color: '#fff', fontSize: 17, fontWeight: '700' },
  hint: { color: '#D7BEC5', fontSize: 13, lineHeight: 19 },
  chips: { gap: 8, paddingVertical: 2 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: '#43333A', borderWidth: 1, borderColor: '#5E4750' },
  chipActive: { backgroundColor: '#AB2528', borderColor: '#E4332D' },
  chipText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  clock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 4 },
  // One shared highlight across all three wheels, like a clock app's selection bar.
  band: {
    position: 'absolute', left: 0, right: 0, top: '50%', marginTop: -WHEEL_ITEM_HEIGHT / 2, height: WHEEL_ITEM_HEIGHT,
    borderRadius: 12, backgroundColor: '#AB252855', borderWidth: 1, borderColor: '#E4332D88',
  },
  colon: { color: '#fff', fontSize: 23, fontWeight: '700', marginHorizontal: -6 },
});
