import nodes from '../map/parkingNodes.json';
import type { Coordinates } from './sightings';

export type ParkingLot = typeof nodes[number];
export const PARKING_LOTS = nodes;
export const LOTS_BY_ID = new Map(nodes.map(lot => [lot.Lot_ID, lot]));

export function nearestParkingLot(point: Coordinates): ParkingLot | null {
  if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)
    || Math.abs(point.latitude) > 90 || Math.abs(point.longitude) > 180) return null;
  const radians = (degrees: number) => degrees * Math.PI / 180;
  let nearest: ParkingLot | null = null;
  let smallest = Infinity;
  for (const lot of nodes) {
    const distance = Math.sin(radians(lot.latitude - point.latitude) / 2) ** 2
      + Math.cos(radians(point.latitude)) * Math.cos(radians(lot.latitude))
      * Math.sin(radians(lot.longitude - point.longitude) / 2) ** 2;
    if (distance < smallest || (distance === smallest && lot.Lot_ID < (nearest?.Lot_ID ?? ''))) {
      nearest = lot; smallest = distance;
    }
  }
  return nearest;
}
