import './global.css';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CampusMap from './src/components/CampusMap';
import Header from './src/components/Header';
import LoadingScreen from './src/components/LoadingScreen';

// Show the loading screen for at least this long so it doesn't just flash,
// and at most this long in case the map never reports ready (e.g. offline).
const MIN_LOADING_MS = 1500;
const MAX_LOADING_MS = 8000;

export default function App() {
  const [mapReady, setMapReady] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const minTimer = setTimeout(() => setMinTimeElapsed(true), MIN_LOADING_MS);
    const maxTimer = setTimeout(() => setMapReady(true), MAX_LOADING_MS);
    return () => {
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
    };
  }, []);

  const loading = !(mapReady && minTimeElapsed);

  return (
    <SafeAreaProvider>
      <View className="flex-1 bg-mantle">
        {/* The map mounts behind the loading screen so its tiles load meanwhile. */}
        <Header />
        <CampusMap onReady={() => setMapReady(true)} />

        {loading && (
          <View className="absolute inset-0">
            <LoadingScreen />
          </View>
        )}
      </View>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
