import { useState } from 'react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../lib/supabase';
import { useSightings } from '../hooks/useSightings';
import type { Sighting } from '../lib/sightings';
import CampusMap from '../components/CampusMap';
import Header from '../components/Header';
import LoadingScreen from '../components/LoadingScreen';
import ReportFooter, { REPORT_FOOTER_OVERLAP } from '../components/ReportFooter';
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
      <Header onSignOut={() => { void signOut(); }} signingOut={signingOut} />
      <View style={styles.map}>
        <CampusMap sightings={sightings} bottomInset={REPORT_FOOTER_OVERLAP} onReady={() => setMapReady(true)} onSightingSelected={id => {
          const sighting = sightings.find(item => item.id === id);
          if (sighting) setSelected(sighting);
        }} />
        {!mapReady && <View pointerEvents="none" style={styles.mapLoading}><ActivityIndicator color="#FB503F" /><Text style={styles.muted}>Loading campus map…</Text></View>}
        <View pointerEvents="box-none" style={styles.topOverlay}>
          <View style={styles.status}>
            <View style={[styles.liveDot, !live && styles.offlineDot]} />
            <Text style={styles.statusText}>{loading ? 'Loading sightings…' : `${sightings.length} sighting${sightings.length === 1 ? '' : 's'} · past 24h`}</Text>
            <Text style={styles.statusHint}>{live ? 'Live' : 'Syncing'}</Text>
          </View>
        </View>
        <View style={styles.bottomOverlay} pointerEvents="box-none">
          {published && <Pressable accessibilityRole="button" onPress={() => setPublished(false)} style={styles.success}><Text style={styles.successText}>Sighting published. Everyone can see it on the map.</Text><Text style={styles.muted}>Dismiss</Text></Pressable>}
          {(error || actionError) && <View style={styles.error}><Text accessibilityRole="alert" style={styles.errorText}>{actionError || error}</Text><Pressable accessibilityRole="button" onPress={() => { setActionError(null); void refresh(); }} style={styles.retry}><Text style={styles.retryText}>Retry</Text></Pressable></View>}
          <View style={styles.legend}><View style={styles.sightingDot} /><Text style={styles.legendText}>{sightings.length ? 'Tap a yellow dot to see the photo' : 'No sightings yet. Be the first to share one.'}</Text></View>
        </View>
      </View>
      <ReportFooter onReport={() => { setReporting(true); setPublished(false); }} />
      {reporting && <ReportSighting userId={session.user.id} onClose={() => setReporting(false)} onPublished={() => { setReporting(false); setPublished(true); void refresh(); }} />}
      {selected && <SightingPhoto sighting={selected} onClose={() => setSelected(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#43333A' }, map: { flex: 1, position: 'relative' }, mapLoading: { position: 'absolute', top: '45%', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderRadius: 12, backgroundColor: '#33262C' },
  muted: { color: '#D7BEC5', fontSize: 13 }, topOverlay: { position: 'absolute', top: 16, left: 16, right: 16, alignItems: 'flex-start' },
  status: { backgroundColor: '#33262CF2', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { backgroundColor: '#91D8A1', width: 7, height: 7, borderRadius: 4 }, offlineDot: { backgroundColor: '#D7A49E' }, statusText: { color: '#fff', fontSize: 13, fontWeight: '600' }, statusHint: { color: '#D7A49E', fontSize: 11 },
  bottomOverlay: { position: 'absolute', bottom: REPORT_FOOTER_OVERLAP + 16, left: 16, right: 16, alignItems: 'center', gap: 10 },
  legend: { backgroundColor: '#33262CF2', padding: 12, borderRadius: 10, flexDirection: 'row', gap: 10, alignItems: 'center' }, sightingDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFD46B', borderWidth: 2, borderColor: '#fff' }, legendText: { color: '#F3E3E0', fontSize: 12, flexShrink: 1 },
  success: { backgroundColor: '#294A37', padding: 14, borderRadius: 10, maxWidth: 500, gap: 6 }, successText: { color: '#E3F5E8', fontSize: 14 },
  error: { backgroundColor: '#4B2930', padding: 14, borderRadius: 10, maxWidth: 500, flexDirection: 'row', alignItems: 'center', gap: 8 }, errorText: { color: '#FFB4AB', flexShrink: 1 }, retry: { padding: 10 }, retryText: { color: '#fff', fontWeight: '600' },
});
