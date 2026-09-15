const EARTH_RADIUS_METERS = 6371000;

export interface BoundingBox {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
}

export function computeBoundingBox(lat: number, lng: number, radiusMeters: number): BoundingBox {
    const latDelta = (radiusMeters / EARTH_RADIUS_METERS) * (180 / Math.PI);
    const lngDelta =
        (radiusMeters / (EARTH_RADIUS_METERS * Math.cos((lat * Math.PI) / 180))) * (180 / Math.PI);

    return {
        minLat: lat - latDelta,
        maxLat: lat + latDelta,
        minLng: lng - lngDelta,
        maxLng: lng + lngDelta,
    };
}
