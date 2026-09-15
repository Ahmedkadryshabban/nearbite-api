const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export function encodeGeohash(lat: number, lng: number, precision = 8): string {
    let latMin = -90, latMax = 90;
    let lngMin = -180, lngMax = 180;
    let hash = '';
    let bit = 0;
    let ch = 0;
    let isEvenBit = true;

    while (hash.length < precision) {
        if (isEvenBit) {
            const mid = (lngMin + lngMax) / 2;
            if (lng >= mid) {
                ch |= 1 << (4 - bit);
                lngMin = mid;
            } else {
                lngMax = mid;
            }
        } else {
            const mid = (latMin + latMax) / 2;
            if (lat >= mid) {
                ch |= 1 << (4 - bit);
                latMin = mid;
            } else {
                latMax = mid;
            }
        }

        isEvenBit = !isEvenBit;

        if (bit < 4) {
            bit++;
        } else {
            hash += BASE32[ch];
            bit = 0;
            ch = 0;
        }
    }

    return hash;
}

export interface GeohashBounds {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
}

export function decodeGeohashBounds(hash: string): GeohashBounds {
    let latMin = -90, latMax = 90;
    let lngMin = -180, lngMax = 180;
    let isEvenBit = true;

    for (const char of hash) {
        const idx = BASE32.indexOf(char);
        if (idx === -1) {
            throw new Error(`Invalid geohash character: "${char}"`);
        }

        for (let bit = 4; bit >= 0; bit--) {
            const bitValue = (idx >> bit) & 1;
            if (isEvenBit) {
                const mid = (lngMin + lngMax) / 2;
                if (bitValue === 1) lngMin = mid; else lngMax = mid;
            } else {
                const mid = (latMin + latMax) / 2;
                if (bitValue === 1) latMin = mid; else latMax = mid;
            }
            isEvenBit = !isEvenBit;
        }
    }

    return { minLat: latMin, maxLat: latMax, minLng: lngMin, maxLng: lngMax };
}

export function getGeohashNeighbors(hash: string): string[] {
    const precision = hash.length;
    const { minLat, maxLat, minLng, maxLng } = decodeGeohashBounds(hash);

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const latHeight = maxLat - minLat;
    const lngWidth = maxLng - minLng;

    const neighbors = new Set<string>();

    for (const dLat of [-1, 0, 1]) {
        for (const dLng of [-1, 0, 1]) {
            if (dLat === 0 && dLng === 0) continue;

            const neighborLat = Math.max(-90, Math.min(90, centerLat + dLat * latHeight));
            const neighborLng = ((centerLng + dLng * lngWidth + 180) % 360 + 360) % 360 - 180;

            neighbors.add(encodeGeohash(neighborLat, neighborLng, precision));
        }
    }

    return Array.from(neighbors);
}

export function geohashPrecisionForRadius(radiusMeters: number): number {
    if (radiusMeters <= 150) return 7;
    if (radiusMeters <= 1200) return 6;
    if (radiusMeters <= 5000) return 5;
    if (radiusMeters <= 20000) return 4;
    return 3;
}
