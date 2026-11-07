import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Sign out lives in the Settings section of the home sheet.
export default function Header({ unreadCount = 0, onOpenNotifications }: { unreadCount?: number; onOpenNotifications?: () => void }) {
  return (
    <SafeAreaView edges={['top']} className="bg-red-square">
      <View className="flex-row items-center justify-between px-5 py-3">
        <Text className="text-2xl font-extrabold tracking-tight text-white">USnitch</Text>
        <View className="flex-row items-center gap-3">
          <Text className="text-sm font-medium text-rose">U of U Campus</Text>
          {onOpenNotifications && <Pressable accessibilityRole="button" accessibilityLabel={`Open notifications, ${unreadCount} unread`} onPress={onOpenNotifications} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 12, backgroundColor: '#33262C' }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Alerts{unreadCount ? ` · ${unreadCount}` : ''}</Text>
          </Pressable>}
        </View>
      </View>
    </SafeAreaView>
  );
}
