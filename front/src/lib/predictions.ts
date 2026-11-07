// Client for the FastAPI prediction server in server/main.py.

// On a phone, "localhost" is the phone itself: set EXPO_PUBLIC_API_URL to the
// computer's LAN address (e.g. http://192.168.1.20:8000) when testing on a device.
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/+$/, '');

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
    throw new PredictionsError('Could not reach the prediction server.');
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
