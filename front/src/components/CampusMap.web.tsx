import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { buildLeafletHtml } from '../map/leafletHtml';
import { getMapState, handleMapMessage, type CampusMapProps } from '../map/types';

// react-native-webview has no web support, so on web the same Leaflet page
// is rendered in an iframe.
export default function CampusMap(props: CampusMapProps) {
  const html = useMemo(() => buildLeafletHtml(props.bottomInset), [props.bottomInset]);
  const frame = useRef<HTMLIFrameElement>(null);
  const latest = useRef(props);
  useEffect(() => { latest.current = props; }, [props]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function syncMap() {
      const child = frame.current?.contentWindow as (Window & {
        USnitchMap?: { update: (state: ReturnType<typeof getMapState>) => void };
      }) | null;
      child?.USnitchMap?.update(getMapState(latest.current));
    }
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      if (event.data === 'map-ready') {
        setReady(true);
        syncMap();
      }
      handleMapMessage(event.data, latest.current);
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const child = frame.current?.contentWindow as (Window & {
      USnitchMap?: { update: (state: ReturnType<typeof getMapState>) => void };
    }) | null;
    child?.USnitchMap?.update(getMapState(props));
  }, [props, ready]);

  return (
    <View className="flex-1 bg-mantle">
      <iframe
        ref={frame}
        title="University of Utah campus map"
        srcDoc={html}
        sandbox="allow-scripts allow-same-origin"
        referrerPolicy="no-referrer"
        style={{ border: 0, width: '100%', height: '100%' }}
      />
    </View>
  );
}
