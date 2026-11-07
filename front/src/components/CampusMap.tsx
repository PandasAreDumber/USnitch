import { useMemo } from 'react';
import { WebView } from 'react-native-webview';
import { buildLeafletHtml, MAP_READY_MESSAGE } from '../map/leafletHtml';

type Props = {
  onReady?: () => void;
};

export default function CampusMap({ onReady }: Props) {
  const html = useMemo(buildLeafletHtml, []);

  return (
    <WebView
      originWhitelist={['*']}
      source={{ html, baseUrl: 'https://usnitch.app' }}
      style={{ flex: 1, backgroundColor: '#43333A' }}
      onMessage={(event) => {
        if (event.nativeEvent.data === MAP_READY_MESSAGE) onReady?.();
      }}
    />
  );
}
