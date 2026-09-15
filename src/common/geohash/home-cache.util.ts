import { encodeGeohash, geohashPrecisionForRadius, getGeohashNeighbors } from './geohash.util.js';

export const HOME_CACHE_TTL_SECONDS = 90;

export type HomeStrategy = 'bounding-box' | 'geohash';

export function buildHomeCacheKey(
    lat: number,
    lng: number,
    radiusMeters: number,
    strategy: HomeStrategy,
): string {
    const precision = geohashPrecisionForRadius(radiusMeters);
    const cell = encodeGeohash(lat, lng, precision);
    return `home:${precision}:${cell}:${strategy}`;
}

const INVALIDATION_PRECISIONS = [3, 4, 5, 6, 7];
const STRATEGIES: HomeStrategy[] = ['bounding-box', 'geohash'];

export function buildInvalidationKeys(vendorGeohash: string): string[] {
    const keys: string[] = [];

    for (const precision of INVALIDATION_PRECISIONS) {
        const cell = vendorGeohash.slice(0, precision);
        const affectedCells = [cell, ...getGeohashNeighbors(cell)];

        for (const affectedCell of affectedCells) {
            for (const strategy of STRATEGIES) {
                keys.push(`home:${precision}:${affectedCell}:${strategy}`);
            }
        }
    }

    return keys;
}
