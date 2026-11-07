import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { InAppNotifications as Notifications } from '../hooks/useInAppNotifications';
import type { InAppNotification } from '../lib/inAppNotifications';

type Props = { notifications: Notifications; onOpen: (item: InAppNotification) => void };
export default function InAppNotifications({ notifications, onOpen }: Props) {
  const insets = useSafeAreaInsets();
  const { banner } = notifications;
  function open(item: InAppNotification) {
    notifications.markRead(item.id); notifications.closeInbox(); onOpen(item);
  }
  return <>
    {banner && <View pointerEvents="box-none" style={[styles.overlay, { top: insets.top + 8 }]}>
      <View style={styles.banner} accessibilityLiveRegion="polite">
        <View style={styles.icon}><Text style={styles.iconText}>!</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel={`${banner.title}. ${banner.body}`} onPress={() => open(banner)} style={styles.bannerCopy}>
          <Text style={styles.brand}>USNITCH · {banner.kind === 'preview' ? 'PREVIEW' : 'ALERT'}</Text>
          <Text style={styles.title}>{banner.title}</Text><Text style={styles.body}>{banner.body}</Text>
          <Text style={styles.action}>{banner.kind === 'sighting' ? 'View sighting ›' : banner.kind === 'prediction' ? 'View current risk ›' : 'Tap to dismiss preview'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss notification" onPress={() => notifications.dismiss(banner.id)} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable>
      </View>
    </View>}
    <Modal visible={notifications.inboxOpen} transparent animationType="slide" onRequestClose={notifications.closeInbox}>
      <View style={styles.backdrop}><View accessibilityViewIsModal style={[styles.inbox, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.inboxHeader}><Text style={styles.heading}>Notifications</Text><Pressable accessibilityRole="button" onPress={notifications.closeInbox} style={styles.close}><Text style={styles.action}>Done</Text></Pressable></View>
        <Text style={styles.explainer}>Alerts appear while you use the app. Your latest 20 notifications stay here for this session.</Text>
        <FlatList data={notifications.history} keyExtractor={item => item.id} ListEmptyComponent={<View style={styles.empty}><Text style={styles.title}>You’re all caught up</Text><Text style={styles.body}>New sightings and parked-lot risk alerts will appear here. Try “Preview notification” in the map’s settings.</Text></View>}
          renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => open(item)} style={styles.historyItem}>
            <Text style={styles.brand}>{item.kind === 'preview' ? 'PREVIEW' : item.kind === 'sighting' ? 'SIGHTING' : 'PREDICTION'} · {new Date(item.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
            <Text style={styles.title}>{item.title}</Text><Text style={styles.body}>{item.body}</Text>
          </Pressable>} />
      </View></View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', left: 12, right: 12, zIndex: 1000, alignItems: 'center' },
  banner: { width: '100%', maxWidth: 540, flexDirection: 'row', backgroundColor: '#33262C', borderRadius: 18, borderWidth: 1, borderColor: '#C5675E', borderLeftWidth: 4, borderLeftColor: '#FB503F', paddingLeft: 12, paddingVertical: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 20 },
  bannerCopy: { flex: 1, paddingVertical: 4, gap: 4 }, icon: { width: 30, height: 30, marginTop: 5, marginRight: 10, borderRadius: 15, backgroundColor: '#FB503F', alignItems: 'center', justifyContent: 'center' },
  iconText: { color: '#fff', fontSize: 20, fontWeight: '800' }, brand: { color: '#FF9B8F', fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  title: { color: '#fff', fontSize: 15, fontWeight: '700', lineHeight: 21 }, body: { color: '#E1CDD4', fontSize: 13, lineHeight: 19 },
  action: { color: '#FF9B8F', fontSize: 13, fontWeight: '600', marginTop: 4 }, close: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }, closeText: { color: '#D7BEC5', fontSize: 26 },
  backdrop: { flex: 1, backgroundColor: '#0009', justifyContent: 'flex-end' }, inbox: { height: '85%', backgroundColor: '#33262C', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20 },
  inboxHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, heading: { color: '#fff', fontSize: 22, fontWeight: '700' },
  explainer: { color: '#D7BEC5', fontSize: 13, lineHeight: 19, marginBottom: 16 }, historyItem: { paddingVertical: 16, gap: 6, borderBottomWidth: 1, borderBottomColor: '#5E4750' }, empty: { paddingVertical: 32, gap: 12 },
});
