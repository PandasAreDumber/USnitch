import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Header({ onSignOut, signingOut }: { onSignOut?: () => void; signingOut?: boolean }) {
  return (
    <SafeAreaView edges={['top']} className="bg-red-square">
      <View className="flex-row items-center justify-between px-5 py-3">
        <Text className="text-2xl font-extrabold tracking-tight text-white">USnitch</Text>
        <View className="flex-row items-center gap-3">
          <Text className="text-sm font-medium text-rose">U of U Campus</Text>
          {onSignOut && <Pressable accessibilityRole="button" onPress={onSignOut} disabled={signingOut} style={{ padding: 10 }}><Text className="text-sm text-white">{signingOut ? 'Signing out…' : 'Sign out'}</Text></Pressable>}
        </View>
      </View>
    </SafeAreaView>
  );
}
