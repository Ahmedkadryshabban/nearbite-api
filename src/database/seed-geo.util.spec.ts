import { randomPointNear } from './seed-geo.util.js';
import { haversineDistance } from '../common/geo/haversine.util.js';

describe('randomPointNear', () => {
    const center = { lat: 30.0444, lng: 31.2357 };

    it('never generates a point farther than maxRadiusMeters from the center', () => {
        const maxRadiusMeters = 3000;

        for (let i = 0; i < 500; i++) {
            const point = randomPointNear(center, maxRadiusMeters);
            const distance = haversineDistance(center.lat, center.lng, point.lat, point.lng);
            expect(distance).toBeLessThanOrEqual(maxRadiusMeters + 1);
        }
    });

    it('spreads points across the full radius, not just near the center or the edge', () => {
        const maxRadiusMeters = 5000;
        const distances = Array.from({ length: 300 }, () => {
            const point = randomPointNear(center, maxRadiusMeters);
            return haversineDistance(center.lat, center.lng, point.lat, point.lng);
        });

        const closeCount = distances.filter((d) => d < maxRadiusMeters * 0.25).length;
        const farCount = distances.filter((d) => d > maxRadiusMeters * 0.75).length;

        expect(closeCount).toBeGreaterThan(0);
        expect(farCount).toBeGreaterThan(0);
    });

    it('returns a point exactly at the center when maxRadiusMeters is 0', () => {
        const point = randomPointNear(center, 0);

        expect(point.lat).toBeCloseTo(center.lat, 6);
        expect(point.lng).toBeCloseTo(center.lng, 6);
    });
});
