import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Header() {
  return (
    <SafeAreaView edges={['top']} className="bg-red-square">
      <View className="flex-row items-center justify-between px-5 py-3">
        <Text className="text-2xl font-extrabold tracking-tight text-white">USnitch</Text>
        <Text className="text-sm font-medium text-rose">U of U Campus</Text>
      </View>
    </SafeAreaView>
  );
}
