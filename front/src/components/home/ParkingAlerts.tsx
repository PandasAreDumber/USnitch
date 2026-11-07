import { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NotificationSettings, NotificationPreferences } from '../../hooks/useNotificationSettings';

export default function ParkingAlerts({ alerts, signingOut = false, onPreviewNotification }: { alerts: NotificationSettings; signingOut?: boolean; onPreviewNotification: () => void }) {
  const [choosing, setChoosing] = useState(false);
  const [search, setSearch] = useState('');
  const insets = useSafeAreaInsets();
  const parked = alerts.lots.find(lot => lot.Lot_ID === alerts.preferences.parked_lot_id);
  const disabled = alerts.loading || alerts.busy || signingOut || !alerts.lots.length;
  const choices = alerts.lots.filter(lot => `${lot.lot_number} ${lot.name} ${lot.facility_type === 'garage' ? 'garage' : 'lot'}`.toLowerCase().includes(search.toLowerCase()));
  const toggles: { key: keyof Pick<NotificationPreferences, 'all_sightings' | 'parked_sightings' | 'predictions'>; title: string; detail: string }[] = [
    { key: 'all_sightings', title: 'All new sightings', detail: 'Alerts when someone else reports enforcement on campus.' },
    { key: 'parked_sightings', title: 'Sightings at my parked lot', detail: 'Get a targeted alert for the lot where your car is parked.' },
    { key: 'predictions', title: 'Higher risk at my parked lot', detail: 'Alerts when the current enforcement prediction is high. At most once every two hours per lot.' },
  ];
  return <View style={styles.section}>
    <Text style={styles.heading}>My parked car</Text>
    <View style={styles.card}>
      <Pressable accessibilityRole="button" disabled={disabled} onPress={() => { setSearch(''); setChoosing(true); }} style={styles.row}>
        <Text style={styles.label}>{parked ? `${parked.name} · ${parked.facility_type === 'garage' ? 'Garage' : 'Lot'} ${parked.lot_number}` : 'Choose where you parked'}</Text>
        <Text style={styles.accent}>{alerts.loading ? 'Loading…' : 'Choose lot ›'}</Text>
      </Pressable>
      <Text style={styles.hint}>You can also tap a lot on the map and choose “Park my car here”. Your selection stays saved until you change or clear it.</Text>
      {parked && <Pressable accessibilityRole="button" disabled={disabled} onPress={() => { void alerts.save({ parked_lot_id: null }); }} style={styles.row}><Text style={styles.accent}>I’ve moved my car · Clear lot</Text></Pressable>}
    </View>
    <Text style={styles.heading}>In-app notifications</Text>
    <View style={styles.card}>
      <View style={styles.toggle}>
        <View style={styles.copy}><Text style={styles.label}>Show in-app alerts</Text><Text style={styles.detail}>Custom banners while you use USnitch. Works in Expo Go.</Text></View>
        <Switch accessibilityLabel="Show in-app alerts" value={alerts.preferences.enabled} disabled={disabled} trackColor={{ false: '#69515C', true: '#C8483D' }} thumbColor="#fff" onValueChange={value => { void alerts.save({ enabled: value }); }} />
      </View>
      {toggles.map(toggle => <View key={toggle.key} style={styles.toggle}>
        <View style={styles.copy}><Text style={styles.label}>{toggle.title}</Text><Text style={styles.detail}>{toggle.detail}</Text></View>
        <Switch accessibilityLabel={toggle.title} value={alerts.preferences[toggle.key]} disabled={disabled} trackColor={{ false: '#69515C', true: '#C8483D' }} thumbColor="#fff" onValueChange={value => { void alerts.save({ [toggle.key]: value }); }} />
      </View>)}
      <Pressable accessibilityRole="button" disabled={disabled || !alerts.preferences.enabled} onPress={onPreviewNotification} style={styles.row}><Text style={styles.accent}>Preview notification</Text></Pressable>
      <Text style={styles.hint}>Alerts appear while the app is open. Find recent alerts in the header’s Alerts button. Your parked lot and preferences are saved on this device for your account.</Text>
      {alerts.error && <View style={styles.row}><Text accessibilityRole="alert" style={styles.error}>{alerts.error}</Text><Pressable accessibilityRole="button" onPress={alerts.retry}><Text style={styles.accent}>Retry settings</Text></Pressable></View>}
    </View>
    <Modal visible={choosing} transparent animationType="slide" onRequestClose={() => setChoosing(false)}>
      <View style={styles.backdrop}><View accessibilityViewIsModal style={[styles.modal, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.modalHeader}><Text style={styles.heading}>Where is your car parked?</Text><Pressable accessibilityRole="button" onPress={() => setChoosing(false)} style={styles.close}><Text style={styles.accent}>Done</Text></Pressable></View>
        <TextInput accessibilityLabel="Search parking lots" placeholder="Search by lot name or number" placeholderTextColor="#BCA3AA" value={search} onChangeText={setSearch} style={styles.search} autoCorrect={false} />
        {alerts.error && <Text accessibilityRole="alert" style={styles.error}>{alerts.error}</Text>}
        <FlatList data={choices} keyExtractor={lot => lot.Lot_ID} keyboardShouldPersistTaps="handled" ListEmptyComponent={<Text style={styles.hint}>No matching lots.</Text>} renderItem={({ item: lot }) => <Pressable disabled={disabled} accessibilityRole="radio" accessibilityState={{ checked: alerts.preferences.parked_lot_id === lot.Lot_ID }} style={styles.lot} onPress={() => { void alerts.save({ parked_lot_id: lot.Lot_ID }).then(saved => { if (saved) setChoosing(false); }); }}>
          <View style={styles.copy}><Text style={styles.label}>{lot.name}</Text><Text style={styles.detail}>{lot.facility_type === 'garage' ? 'Garage' : 'Lot'} {lot.lot_number}</Text></View>
          {alerts.preferences.parked_lot_id === lot.Lot_ID && <Text style={styles.accent}>✓ Parked here</Text>}
        </Pressable>} />
      </View></View>
    </Modal>
    {alerts.loading && <ActivityIndicator color="#FB503F" />}
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: 12 }, heading: { color: '#fff', fontSize: 17, fontWeight: '700' },
  card: { borderRadius: 14, backgroundColor: '#43333A', borderWidth: 1, borderColor: '#5E4750', overflow: 'hidden' },
  row: { padding: 16, gap: 10 }, label: { color: '#fff', fontSize: 15, fontWeight: '600' },
  accent: { color: '#FF9B8F', fontSize: 14, fontWeight: '600' },
  hint: { color: '#D7BEC5', fontSize: 13, lineHeight: 19, paddingHorizontal: 16, paddingBottom: 16 },
  detail: { color: '#D7BEC5', fontSize: 12, lineHeight: 18, marginTop: 5 },
  copy: { flex: 1 }, toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: '#5E4750' },
  error: { color: '#FFB4AB', fontSize: 13 }, backdrop: { flex: 1, backgroundColor: '#0009', justifyContent: 'flex-end' },
  modal: { height: '90%', backgroundColor: '#33262C', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, close: { padding: 12 },
  search: { color: '#fff', backgroundColor: '#43333A', borderWidth: 1, borderColor: '#69515C', padding: 14, borderRadius: 12, marginVertical: 12 },
  lot: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#5E4750', flexDirection: 'row', alignItems: 'center', gap: 12 },
});
