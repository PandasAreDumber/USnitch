import { useEffect, useMemo, useRef, useState } from 'react';
import { WebView } from 'react-native-webview';
import { buildLeafletHtml } from '../map/leafletHtml';
import { getMapState, handleMapMessage, type CampusMapProps } from '../map/types';

export default function CampusMap(props: CampusMapProps) {
  const html = useMemo(() => buildLeafletHtml(props.bottomInset), [props.bottomInset]);
  const webview = useRef<WebView<object>>(null);
  const [ready, setReady] = useState(false);
  const updateScript = `window.USnitchMap && window.USnitchMap.update(${JSON.stringify(getMapState(props)).replace(/</g, '\\u003c')}); true;`;
  useEffect(() => {
    if (ready) webview.current?.injectJavaScript(updateScript);
  }, [ready, updateScript]);

  return (
    <WebView<object>
      ref={webview}
      originWhitelist={['*']}
      source={{ html, baseUrl: 'https://usnitch.app' }}
      style={{ flex: 1, backgroundColor: '#43333A' }}
      onMessage={(event) => {
        if (event.nativeEvent.data === 'map-ready') {
          setReady(true);
          webview.current?.injectJavaScript(updateScript);
        }
        handleMapMessage(event.nativeEvent.data, props);
      }}
    />
  );
}
