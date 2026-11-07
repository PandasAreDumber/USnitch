import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { buildLeafletHtml, MAP_READY_MESSAGE } from '../map/leafletHtml';

type Props = {
  onReady?: () => void;
};

// react-native-webview has no web support, so on web the same Leaflet page
// is rendered in an iframe.
export default function CampusMap({ onReady }: Props) {
  const html = useMemo(buildLeafletHtml, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === MAP_READY_MESSAGE) onReady?.();
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onReady]);

  return (
    <View className="flex-1 bg-mantle">
      <iframe
        title="University of Utah campus map"
        srcDoc={html}
        style={{ border: 0, width: '100%', height: '100%' }}
      />
    </View>
  );
}
