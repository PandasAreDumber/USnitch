import { Platform } from 'react-native';

// Builds the self-contained Leaflet page rendered by CampusMap (WebView on
// native, iframe on web). When the first tiles finish loading it posts
// "map-ready" back to React so the loading screen can be dismissed.

// University of Utah main campus
const CENTER: [number, number] = [40.7649, -111.8421];
// Keep the user on campus: [south-west, north-east]
const BOUNDS: [[number, number], [number, number]] = [
  [40.755, -111.86],
  [40.775, -111.82],
];

const STADIA_API_KEY = process.env.EXPO_PUBLIC_STADIA_API_KEY ?? '';

// Stadia only serves tiles without an API key to localhost, so phones need a
// key. Until one is set, native falls back to CARTO's keyless dark tiles.
const USE_STADIA = Boolean(STADIA_API_KEY) || Platform.OS === 'web';

const STADIA_LAYER = `L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.{ext}${
  STADIA_API_KEY ? `?api_key=${encodeURIComponent(STADIA_API_KEY)}` : ''
}', {
      minZoom: 0,
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      ext: 'png'
    })`;

const CARTO_LAYER = `L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    })`;

export const MAP_READY_MESSAGE = 'map-ready';

export function buildLeafletHtml() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #43333A; }
    .leaflet-control-attribution { background: rgba(67, 51, 58, 0.8) !important; color: #D7A49E; }
    .leaflet-control-attribution a { color: #FB503F; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    function notifyReady() {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage('${MAP_READY_MESSAGE}');
      } else if (window.parent !== window) {
        window.parent.postMessage('${MAP_READY_MESSAGE}', '*');
      }
    }

    var bounds = L.latLngBounds(${JSON.stringify(BOUNDS)});
    var map = L.map('map', {
      center: ${JSON.stringify(CENTER)},
      zoom: 15,
      minZoom: 14,
      maxBounds: bounds,
      maxBoundsViscosity: 1.0,
      zoomControl: false,
    });

    var tiles = ${USE_STADIA ? STADIA_LAYER : CARTO_LAYER};

    // Report ready once the first tiles render (or fail), whichever comes first.
    tiles.once('load', notifyReady);
    tiles.once('tileerror', notifyReady);
    tiles.addTo(map);
  </script>
</body>
</html>`;
}
