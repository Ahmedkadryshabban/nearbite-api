const EARTH_RADIUS_METERS = 6371000;

export function randomPointNear(center: { lat: number; lng: number }, maxRadiusMeters: number) {
    // sqrt() spreads points evenly over the *area* of the disc. A plain
    // Math.random() is uniform in radius, which piles points onto the centre
    // (density ~ 1/r) — that's what put 73 vendors inside 100 m of downtown Cairo.
    const radiusMeters = maxRadiusMeters * Math.sqrt(Math.random());
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
