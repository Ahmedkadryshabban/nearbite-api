const EARTH_RADIUS_METERS = 6371000;

export function randomPointNear(center: { lat: number; lng: number }, maxRadiusMeters: number) {
    const radiusMeters = Math.random() * maxRadiusMeters;
    const bearing = Math.random() * 2 * Math.PI;

    const deltaLat = (radiusMeters * Math.cos(bearing)) / EARTH_RADIUS_METERS;
    const deltaLng =
        (radiusMeters * Math.sin(bearing)) /
        (EARTH_RADIUS_METERS * Math.cos((center.lat * Math.PI) / 180));

    return {
        lat: center.lat + (deltaLat * 180) / Math.PI,
        lng: center.lng + (deltaLng * 180) / Math.PI,
    };
}
