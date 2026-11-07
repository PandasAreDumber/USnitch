import './global.css';
import { StatusBar } from 'expo-status-bar';
import { Pressable, Text, View } from 'react-native';

export default function App() {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-base-100 px-6">
      <Text className="text-3xl font-bold text-primary">USnitch</Text>
      <Text className="text-center text-base-content">
        Expo + NativeWind (Tailwind) + daisyUI theme colors are wired up.
      </Text>
      <Pressable className="rounded-lg bg-primary px-5 py-3 active:opacity-80">
        <Text className="font-semibold text-primary-content">Get started</Text>
      </Pressable>
      <StatusBar style="auto" />
    </View>
  );
}
