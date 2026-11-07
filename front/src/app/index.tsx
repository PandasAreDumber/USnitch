import { useMemo, useState } from 'react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../lib/supabase';
import { useSightings } from '../hooks/useSightings';
import { usePredictions } from '../hooks/usePredictions';
import type { Sighting } from '../lib/sightings';
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

export default function Campus() {
  const { session, loading: authLoading } = useAuth();
  const { sightings, loading, error, live, refresh } = useSightings(session?.user.id);
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
  const predictions = usePredictions(predictionTime);

  if (authLoading) return <LoadingScreen />;
  if (!session) return <Redirect href="/sign-in" />;

  async function signOut() {
    setSigningOut(true); setActionError(null);
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
    if (signOutError) setActionError(signOutError.message);
    setSigningOut(false);
  }

  return (
    <View style={styles.screen}>
      <Header />
      <View style={styles.map}>
        <CampusMap sightings={visible} likelihoods={predictions.likelihoods} bottomInset={sheet.hump} onReady={() => setMapReady(true)} onSightingSelected={id => {
          const sighting = sightings.find(item => item.id === id);
          if (sighting) setSelected(sighting);
        }} />
        {!mapReady && <View pointerEvents="none" style={styles.mapLoading}><ActivityIndicator color="#FB503F" /><Text style={styles.muted}>Loading campus map…</Text></View>}
        <View pointerEvents="box-none" style={styles.topOverlay}>
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
        <View style={[styles.bottomOverlay, { bottom: sheet.hump + 12 }]} pointerEvents="box-none">
          {published && <Pressable accessibilityRole="button" onPress={() => setPublished(false)} style={styles.success}><Text style={styles.successText}>Sighting published. Everyone can see it on the map.</Text><Text style={styles.muted}>Dismiss</Text></Pressable>}
          {(error || actionError) && <View style={styles.error}><Text accessibilityRole="alert" style={styles.errorText}>{actionError || error}</Text><Pressable accessibilityRole="button" onPress={() => { setActionError(null); void refresh(); }} style={styles.retry}><Text style={styles.retryText}>Retry</Text></Pressable></View>}
          <View style={styles.legend}><View style={styles.sightingDot} /><Text style={styles.legendText}>{visible.length ? 'Tap a yellow dot to see the photo' : slot ? 'No reports around this time.' : 'No sightings yet. Be the first to share one.'}</Text></View>
        </View>
        <HomeSheet onReport={() => { setReporting(true); setPublished(false); }} onExpandedChange={setSheetOpen}>
          <TimeSlotPicker selected={slot} onSelect={setSlot} />
          <NearbySightings sightings={visible} active={sheetOpen} onSelect={setSelected} emptyMessage={slot ? 'No reports around this time.' : undefined} />
          <SettingsSection onSignOut={() => { void signOut(); }} signingOut={signingOut} />
        </HomeSheet>
      </View>
      {reporting && <ReportSighting userId={session.user.id} onClose={() => setReporting(false)} onPublished={() => { setReporting(false); setPublished(true); void refresh(); }} />}
      {selected && <SightingPhoto sighting={selected} onClose={() => setSelected(null)} />}
    </View>
  );
}

// Matches the heat scale in map/leafletHtml.ts (yellow → orange → red).
const HEAT_LEGEND = ['rgb(255,230,80)', 'rgb(255,185,55)', 'rgb(255,140,30)', 'rgb(243,85,30)', 'rgb(230,30,30)'];

const styles = StyleSheet.create({
  heatLegend: { marginTop: 8, backgroundColor: '#33262CF2', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 6, maxWidth: 240 },
  heatLabel: { color: '#fff', fontSize: 12, fontWeight: '600' },
  heatBar: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', width: 160 },
  heatStep: { flex: 1 },
  heatEnds: { flexDirection: 'row', justifyContent: 'space-between', width: 160 },
  heatEnd: { color: '#D7A49E', fontSize: 10 },
  heatError: { color: '#FFB4AB', fontSize: 11 },
  screen: { flex: 1, backgroundColor: '#43333A' }, map: { flex: 1, position: 'relative' }, mapLoading: { position: 'absolute', top: '45%', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderRadius: 12, backgroundColor: '#33262C' },
  muted: { color: '#D7BEC5', fontSize: 13 }, topOverlay: { position: 'absolute', top: 16, left: 16, right: 16, alignItems: 'flex-start' },
  status: { backgroundColor: '#33262CF2', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { backgroundColor: '#91D8A1', width: 7, height: 7, borderRadius: 4 }, offlineDot: { backgroundColor: '#D7A49E' }, statusText: { color: '#fff', fontSize: 13, fontWeight: '600' }, statusHint: { color: '#D7A49E', fontSize: 11 },
  bottomOverlay: { position: 'absolute', left: 16, right: 16, alignItems: 'center', gap: 10 },
  legend: { backgroundColor: '#33262CF2', padding: 12, borderRadius: 10, flexDirection: 'row', gap: 10, alignItems: 'center' }, sightingDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFD46B', borderWidth: 2, borderColor: '#fff' }, legendText: { color: '#F3E3E0', fontSize: 12, flexShrink: 1 },
  success: { backgroundColor: '#294A37', padding: 14, borderRadius: 10, maxWidth: 500, gap: 6 }, successText: { color: '#E3F5E8', fontSize: 14 },
  error: { backgroundColor: '#4B2930', padding: 14, borderRadius: 10, maxWidth: 500, flexDirection: 'row', alignItems: 'center', gap: 8 }, errorText: { color: '#FFB4AB', flexShrink: 1 }, retry: { padding: 10 }, retryText: { color: '#fff', fontWeight: '600' },
});
