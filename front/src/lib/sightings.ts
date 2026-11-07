import { decode } from 'base64-arraybuffer';
import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';

export type Coordinates = { latitude: number; longitude: number };
export type Sighting = Coordinates & {
  id: string;
  user_id: string;
  photo_path: string;
  note: string;
  observed_at: string;
  created_at: string;
};
export const PHOTO_BUCKET = 'sighting-photos';
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const SIGHTING_WINDOW_MS = 24 * 60 * 60 * 1000;
export const SIGHTING_COLUMNS = 'id,user_id,latitude,longitude,photo_path,note,observed_at,created_at';

export function isCampusLocation(point: Coordinates) {
  return Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
    && point.latitude >= 40.748 && point.latitude <= 40.777
    && point.longitude >= -111.86 && point.longitude <= -111.812;
}

export async function listSightings() {
  // Paginate so shared markers don't silently disappear at PostgREST's row limit.
  const cutoff = new Date(Date.now() - SIGHTING_WINDOW_MS).toISOString();
  const result: Sighting[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('sightings').select(SIGHTING_COLUMNS)
      .gte('observed_at', cutoff).order('observed_at', { ascending: false })
      .order('id').range(offset, offset + 499);
    if (error) throw error;
    result.push(...data as Sighting[]);
    if (data.length < 500) return result;
  }
}

export async function publishSighting(input: {
  userId: string;
  base64: string;
  location: Coordinates;
  note: string;
  observedAt: string;
}) {
  if (!isCampusLocation(input.location)) throw new Error('Place the sighting inside the campus map area.');
  const bytes = decode(input.base64);
  if (bytes.byteLength > MAX_PHOTO_BYTES) throw new Error('Choose a smaller photo (maximum 5 MB).');
  const id = Crypto.randomUUID();
  const photoPath = `${input.userId}/${id}.jpg`;
  const { error: uploadError } = await supabase.storage.from(PHOTO_BUCKET).upload(photoPath, bytes, {
    contentType: 'image/jpeg', upsert: false,
  });
  if (uploadError) throw uploadError;
  const { error } = await supabase.from('sightings').insert({
    id, user_id: input.userId, ...input.location, photo_path: photoPath,
    note: input.note.trim(), observed_at: input.observedAt,
  });
  if (error) {
    // A lost response can follow a successful commit. Confirm before deleting.
    const check = await supabase.from('sightings').select('id').eq('id', id).maybeSingle();
    if (check.data) return id;
    if (!check.error) await supabase.storage.from(PHOTO_BUCKET).remove([photoPath]);
    throw error;
  }
  return id;
}

export async function getSightingPhoto(path: string) {
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, 900);
  if (error) throw error;
  return data.signedUrl;
}
