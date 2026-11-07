import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, Text, View } from 'react-native';

const DOT_COLORS = ['bg-rose', 'bg-ogre', 'bg-geranium'];

// Full-screen splash shown while the app (and the map) loads.
export default function LoadingScreen() {
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View className="flex-1 items-center justify-center bg-mantle px-6">
      <Text className="text-5xl font-extrabold tracking-tight text-rose">USnitch</Text>
      <Text className="mt-2 text-base text-clay">University of Utah</Text>

      <View className="mt-10 flex-row gap-3">
        {DOT_COLORS.map((color, i) => {
          // Each dot peaks a third of a cycle after the previous one.
          const start = i / 3;
          const opacity = pulse.interpolate({
            inputRange: [0, start, start + 1 / 3, 1],
            outputRange: [0.3, 0.3, 1, 0.3],
            extrapolate: 'clamp',
          });
          return (
            // NativeWind doesn't style Animated.View, so the classes go on the inner View.
            <Animated.View key={color} style={{ opacity }}>
              <View className={`h-3 w-3 rounded-full ${color}`} />
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}
