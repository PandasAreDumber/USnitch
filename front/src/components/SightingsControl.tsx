import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SIGHTING_TIME_WINDOWS, type SightingTimeWindow } from '../lib/sightingTimeWindow';

type Props = {
  count: number;
  loading: boolean;
  live: boolean;
  timeWindow: SightingTimeWindow;
  onTimeWindowChange: (minutes: SightingTimeWindow) => void;
};

export default function SightingsControl({ count, loading, live, timeWindow, onTimeWindowChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  const selected = SIGHTING_TIME_WINDOWS.find(option => option.minutes === timeWindow)!;

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]} pointerEvents="box-none">
      {expanded && <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close sighting time menu"
        onPress={() => setExpanded(false)}
        style={StyleSheet.absoluteFill}
      />}
      <View style={styles.anchor} pointerEvents="box-none">
        <View style={styles.box}>
          <View style={styles.row}>
            <View style={[styles.liveDot, !live && styles.offlineDot]} />
            <Text accessibilityLiveRegion="polite" style={styles.count}>
              {loading ? 'Loading sightings…' : `${count} sighting${count === 1 ? '' : 's'}`}
            </Text>
            <Text style={styles.live}>{live ? 'Live' : 'Syncing'}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Sighting time period: ${selected.label}`}
              accessibilityHint="Choose how far back to show sightings on the map"
              accessibilityState={{ expanded }}
              onPress={() => setExpanded(value => !value)}
              style={styles.trigger}
            >
              <Text style={styles.triggerText}>{selected.shortLabel}</Text>
              <Text style={styles.chevron}>{expanded ? '▴' : '▾'}</Text>
            </Pressable>
          </View>
          {expanded && <View style={styles.menu}>
            {SIGHTING_TIME_WINDOWS.map(option => (
              <Pressable
                key={option.minutes}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: option.minutes === timeWindow }}
                onPress={() => { onTimeWindowChange(option.minutes); setExpanded(false); }}
                style={[styles.option, option.minutes === timeWindow && styles.selectedOption]}
              >
                <Text style={styles.optionText}>{option.label}</Text>
                {option.minutes === timeWindow && <Text style={styles.check}>✓</Text>}
              </Pressable>
            ))}
          </View>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { zIndex: 2 },
  anchor: { position: 'absolute', top: 16, left: 16, right: 16, alignItems: 'flex-start' },
  box: { backgroundColor: '#33262CF2', borderRadius: 12, maxWidth: '100%', overflow: 'hidden' },
  row: { paddingLeft: 14, paddingRight: 6, paddingVertical: 6, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  liveDot: { backgroundColor: '#91D8A1', width: 7, height: 7, borderRadius: 4 },
  offlineDot: { backgroundColor: '#D7A49E' },
  count: { color: '#fff', fontSize: 13, fontWeight: '600' },
  live: { color: '#D7A49E', fontSize: 11 },
  trigger: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#60454F' },
  triggerText: { color: '#F3E3E0', fontSize: 12, fontWeight: '600' },
  chevron: { color: '#D7A49E', fontSize: 14 },
  menu: { borderTopWidth: 1, borderColor: '#73575F', padding: 6, gap: 2 },
  option: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderRadius: 8, gap: 16 },
  selectedOption: { backgroundColor: '#78444B' },
  optionText: { color: '#F3E3E0', fontSize: 14 },
  check: { color: '#F3E3E0', fontSize: 15 },
});
