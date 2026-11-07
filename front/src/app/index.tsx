import { useMemo, useState } from 'react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../lib/supabase';
import { useSightings } from '../hooks/useSightings';
import { usePredictions } from '../hooks/usePredictions';
import { isCampusLocation, type Sighting } from '../lib/sightings';
import CampusMap from '../components/CampusMap';
import Header from '../components/Header';
import LoadingScreen from '../components/LoadingScreen';
import HomeSheet, { useSheetInsets } from '../components/home/HomeSheet';
import NearbySightings from '../components/home/NearbySightings';
import SettingsSection from '../components/home/SettingsSection';
import TimeSlotPicker from '../components/home/TimeSlotPicker';
import { formatSlotRange, sightingsInSlot, slotDate, type TimeSlot } from '../components/home/timeSlots';
import ReportSighting from '../components/ReportSighting';
import SightingPhoto from '../components/SightingPhoto';
import ParkingAlerts from '../components/home/ParkingAlerts';
import InAppNotifications from '../components/InAppNotifications';
import { useInAppNotifications } from '../hooks/useInAppNotifications';
import { useNotificationSettings } from '../hooks/useNotificationSettings';
import { useUserLocation } from '../hooks/useUserLocation';

export default function Campus() {
  const { session, loading: authLoading } = useAuth();
  if (authLoading) return <LoadingScreen />;
  if (!session) return <Redirect href="/sign-in" />;
  return <CampusScreen key={session.user.id} userId={session.user.id} />;
}

function CampusScreen({ userId }: { userId: string }) {
  const { sightings, loading, error, live, refresh } = useSightings(userId);
  const parking = useNotificationSettings(userId);
  const userLocation = useUserLocation();
  const [locationFocusRequest, setLocationFocusRequest] = useState(0);
  const [reporting, setReporting] = useState(false);
  const [selected, setSelected] = useState<Sighting | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [slot, setSlot] = useState<TimeSlot | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheet = useSheetInsets();
  // With a time picked, the map only shows reports from around that time of day.
  const visible = useMemo(() => (slot ? sightingsInSlot(sightings, slot) : sightings), [sightings, slot]);
  // Lot outlines are colored by the server's enforcement prediction for the picked slot (or now).
  const predictionTime = slot ? slotDate(slot) : null;
  const currentPredictions = usePredictions(null);
  const selectedPredictions = usePredictions(predictionTime, slot !== null);
  const predictions = slot ? selectedPredictions : currentPredictions;
  const notifications = useInAppNotifications({
    userId, preferences: parking.preferences, settingsLoading: parking.loading,
    sightings, sightingsLoading: loading, sightingsError: error,
    scores: currentPredictions.likelihoods, predictionsLoading: currentPredictions.loading,
    predictionsError: currentPredictions.error, predictionsUpdatedAt: currentPredictions.updatedAt,
    paused: reporting || selected !== null,
  });

  const outsideCampus = userLocation.location && !isCampusLocation(userLocation.location);
  const locationNotice = userLocation.error || (outsideCampus ? 'You’re outside the campus map area.' : null);

  async function signOut() {
    setSigningOut(true); setActionError(null);
    try {
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
      if (signOutError) throw signOutError;
    } catch { setActionError('Could not sign out. Check your connection and try again.'); }
    finally { setSigningOut(false); }
  }

  return (
    <View style={styles.screen}>
      <Header unreadCount={notifications.unreadCount} onOpenNotifications={notifications.openInbox} />
      <View style={styles.map}>
        <CampusMap sightings={visible} likelihoods={predictions.likelihoods} bottomInset={sheet.hump}
          userLocation={userLocation.location} locationFocusRequest={locationFocusRequest}
          parkedLotId={parking.preferences.parked_lot_id} canPark={!parking.loading && parking.lots.length > 0 && !signingOut}
          parkingBusy={parking.busy} parkingError={parking.error}
          onParkAtLot={id => {
            if (parking.lots.some(lot => lot.Lot_ID === id)) void parking.save({ parked_lot_id: id });
          }}
          onReady={() => setMapReady(true)} onSightingSelected={id => {
          const sighting = sightings.find(item => item.id === id);
          if (sighting) setSelected(sighting);
        }} />
        {!mapReady && <View pointerEvents="none" style={styles.mapLoading}><ActivityIndicator color="#FB503F" /><Text style={styles.muted}>Loading campus map…</Text></View>}
        <View pointerEvents="box-none" style={styles.topOverlay}>
          <View style={styles.mapInfo} pointerEvents="box-none">
            <View style={styles.status}>
              <View style={[styles.liveDot, !live && styles.offlineDot]} />
              <Text style={styles.statusText}>{loading ? 'Loading sightings…' : `${visible.length} sighting${visible.length === 1 ? '' : 's'} · ${slot ? formatSlotRange(slot) : 'past 24h'}`}</Text>
              <Text style={styles.statusHint}>{live ? 'Live' : 'Syncing'}</Text>
            </View>
            <View style={styles.heatLegend} accessibilityLabel="Lot outline colors: yellow is unlikely enforcement, red is most likely">
              <Text style={styles.heatLabel}>Enforcement</Text>
              <View style={styles.heatBar}>{HEAT_LEGEND.map(color => <View key={color} style={[styles.heatStep, { backgroundColor: color }]} />)}</View>
              <View style={styles.heatEnds}><Text style={styles.heatEnd}>Unlikely</Text><Text style={styles.heatEnd}>Most likely</Text></View>
              {predictions.error && <Pressable accessibilityRole="button" onPress={predictions.refresh}><Text style={styles.heatError}>{predictions.error} Tap to retry.</Text></Pressable>}
            </View>
          </View>
          <View style={styles.locationOverlay} pointerEvents="box-none">
            <Pressable accessibilityRole="button" accessibilityLabel="Show my current location" disabled={userLocation.loading} style={styles.locateButton} onPress={() => {
              if (userLocation.location && !outsideCampus) setLocationFocusRequest(value => value + 1);
              else userLocation.retry();
            }}>
              <View style={styles.userDot} /><Text style={styles.locateText}>{userLocation.loading ? 'Finding you…' : userLocation.error ? 'Enable location' : 'My location'}</Text>
            </Pressable>
            {locationNotice && <Text accessibilityRole="alert" style={styles.locationNotice}>{locationNotice}</Text>}
          </View>
        </View>
        <View style={[styles.bottomOverlay, { bottom: sheet.hump + 12 }]} pointerEvents="box-none">
          {published && <Pressable accessibilityRole="button" onPress={() => setPublished(false)} style={styles.success}><Text style={styles.successText}>Sighting published. Everyone can see it on the map.</Text><Text style={styles.muted}>Dismiss</Text></Pressable>}
          {(error || actionError) && <View style={styles.error}><Text accessibilityRole="alert" style={styles.errorText}>{actionError || error}</Text><Pressable accessibilityRole="button" onPress={() => { setActionError(null); void refresh(); }} style={styles.retry}><Text style={styles.retryText}>Retry</Text></Pressable></View>}
          <View style={styles.legend}><View style={styles.sightingDot} /><Text style={styles.legendText}>{visible.length ? 'Tap a yellow dot to see the photo' : slot ? 'No reports around this time.' : 'No sightings yet. Be the first to share one.'}</Text></View>
        </View>
        <HomeSheet onReport={() => { setReporting(true); setPublished(false); }} onExpandedChange={setSheetOpen}>
          <ParkingAlerts alerts={parking} signingOut={signingOut} onPreviewNotification={notifications.preview} />
          <TimeSlotPicker selected={slot} onSelect={setSlot} />
          <NearbySightings sightings={visible} active={sheetOpen} onSelect={setSelected} emptyMessage={slot ? 'No reports around this time.' : undefined} />
          <SettingsSection onSignOut={() => { void signOut(); }} signingOut={signingOut} />
        </HomeSheet>
      </View>
      {reporting && <ReportSighting userId={userId} onClose={() => setReporting(false)} onPublished={() => { setReporting(false); setPublished(true); void refresh(); }} />}
      {selected && <SightingPhoto sighting={selected} onClose={() => setSelected(null)} />}
      <InAppNotifications notifications={notifications} onOpen={item => {
        if (item.kind === 'preview') return;
        setSlot(null);
        setSelected(item.sighting ?? null);
        void refresh();
        currentPredictions.refresh();
      }} />
    </View>
  );
}

// Matches the heat scale in map/leafletHtml.ts (yellow → orange → red).
const HEAT_LEGEND = ['rgb(255,230,80)', 'rgb(255,185,55)', 'rgb(255,140,30)', 'rgb(243,85,30)', 'rgb(230,30,30)'];

const styles = StyleSheet.create({
  mapInfo: { flex: 1, minWidth: 144, alignItems: 'flex-start', gap: 8 },
  locationOverlay: { width: 132, alignItems: 'flex-end', gap: 8 },
  locateButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#33262CF2', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  userDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#2684FF', borderWidth: 2, borderColor: '#fff' },
  locateText: { color: '#fff', fontSize: 13, fontWeight: '600', flexShrink: 1 },
  locationNotice: { color: '#F3E3E0', backgroundColor: '#33262CF2', padding: 10, borderRadius: 10, fontSize: 12, lineHeight: 17 },
  heatLegend: { backgroundColor: '#33262CF2', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 6, width: 144 },
  heatLabel: { color: '#fff', fontSize: 12, fontWeight: '600' },
  heatBar: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', width: 120 },
  heatStep: { flex: 1 },
  heatEnds: { flexDirection: 'row', justifyContent: 'space-between', width: 120 },
  heatEnd: { color: '#D7A49E', fontSize: 10 },
  heatError: { color: '#FFB4AB', fontSize: 11 },
  screen: { flex: 1, backgroundColor: '#43333A' }, map: { flex: 1, position: 'relative' }, mapLoading: { position: 'absolute', top: '45%', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderRadius: 12, backgroundColor: '#33262C' },
  muted: { color: '#D7BEC5', fontSize: 13 }, topOverlay: { position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  status: { backgroundColor: '#33262CF2', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { backgroundColor: '#91D8A1', width: 7, height: 7, borderRadius: 4 }, offlineDot: { backgroundColor: '#D7A49E' }, statusText: { color: '#fff', fontSize: 13, fontWeight: '600', flexShrink: 1 }, statusHint: { color: '#D7A49E', fontSize: 11 },
  bottomOverlay: { position: 'absolute', left: 16, right: 16, alignItems: 'center', gap: 10 },
  legend: { backgroundColor: '#33262CF2', padding: 12, borderRadius: 10, flexDirection: 'row', gap: 10, alignItems: 'center' }, sightingDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFD46B', borderWidth: 2, borderColor: '#fff' }, legendText: { color: '#F3E3E0', fontSize: 12, flexShrink: 1 },
  success: { backgroundColor: '#294A37', padding: 14, borderRadius: 10, maxWidth: 500, gap: 6 }, successText: { color: '#E3F5E8', fontSize: 14 },
  error: { backgroundColor: '#4B2930', padding: 14, borderRadius: 10, maxWidth: 500, flexDirection: 'row', alignItems: 'center', gap: 8 }, errorText: { color: '#FFB4AB', flexShrink: 1 }, retry: { padding: 10 }, retryText: { color: '#fff', fontWeight: '600' },
});
