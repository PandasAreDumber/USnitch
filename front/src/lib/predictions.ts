import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Client for the FastAPI prediction server in server/main.py.

const CONFIGURED_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/+$/, '');

// On a phone, "localhost" is the phone itself, not the computer running the
// server. During development Expo tells the app which computer served the
// bundle (hostUri, e.g. "10.0.0.5:8081"), so swap localhost for that address.
function resolveApiUrl() {
  if (Platform.OS === 'web') return CONFIGURED_URL;
  let url: URL;
  try { url = new URL(CONFIGURED_URL); } catch { return CONFIGURED_URL; }
  if (!['localhost', '127.0.0.1'].includes(url.hostname)) return CONFIGURED_URL;
  const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (!devHost) return CONFIGURED_URL;
  url.hostname = devHost;
  return url.toString().replace(/\/+$/, '');
}

export const API_URL = resolveApiUrl();

export type LotPrediction = { lot_id: string; name: string; likelihood: number };
export type PredictionsResponse = { time: string; lots: LotPrediction[] };

export class PredictionsError extends Error {
  constructor(message: string, readonly status?: number) { super(message); }
}

export async function fetchPredictions(time?: Date, signal?: AbortSignal): Promise<PredictionsResponse> {
  const url = time ? `${API_URL}/predictions?time=${encodeURIComponent(time.toISOString())}` : `${API_URL}/predictions`;
  let response: Response;
  try {
    response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw error;
    throw new PredictionsError(`Could not reach the prediction server at ${API_URL}.`);
  }
  if (!response.ok) {
    let detail = `Prediction server error (${response.status}).`;
    try {
      const body = await response.json();
      if (typeof body?.detail === 'string') detail = body.detail;
    } catch { /* Keep the generic message. */ }
    throw new PredictionsError(detail, response.status);
  }
  const body = await response.json() as PredictionsResponse;
  if (!body || !Array.isArray(body.lots)) throw new PredictionsError('Prediction server sent an unexpected response.');
  return body;
}

// {lot_id: likelihood} for the map.
export function toLikelihoodMap(lots: LotPrediction[]) {
  const map: Record<string, number> = {};
  for (const lot of lots) if (Number.isFinite(lot.likelihood)) map[lot.lot_id] = lot.likelihood;
  return map;
}
