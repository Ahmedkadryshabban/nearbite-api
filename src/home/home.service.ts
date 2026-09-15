import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module.js';
import { VendorsRepository } from '../vendors/vendors.repository.js';
import { UsersRepository } from '../users/users.repository.js';
import { GetHomeDto } from './dto/get-home.dto.js';
import { computeBoundingBox } from '../common/geo/bounding-box.util.js';
import { haversineDistance } from '../common/geo/haversine.util.js';
import {
    encodeGeohash, getGeohashNeighbors, geohashPrecisionForRadius,
    decodeGeohashBounds, maxRadiusForPrecision,
} from '../common/geohash/geohash.util.js';
import { buildHomeCacheKey, HOME_CACHE_TTL_SECONDS, type HomeStrategy } from '../common/geohash/home-cache.util.js';

interface VendorCandidate {
    id: number;
    name: string;
    logoUrl: string | null;
    lat: number;
    lng: number;
}

export interface VendorWithDistance {
    id: number;
    name: string;
    logoUrl: string | null;
    lat: number;
    lng: number;
    distanceMeters: number;
}

@Injectable()
export class HomeService {
    constructor(
        private readonly vendorsRepository: VendorsRepository,
        private readonly usersRepository: UsersRepository,
        private readonly configService: ConfigService,
        @Inject(REDIS_CLIENT) private readonly redis: Redis,
    ) {}

    async getNearbyVendors(userId: number, query: GetHomeDto) {
        const maxRadius = this.configService.getOrThrow<number>('MAX_RADIUS_METERS');
        if (query.radius > maxRadius) {
            throw new BadRequestException(`radius must not exceed ${maxRadius} meters`);
        }

        let lat = query.lat;
        let lng = query.lng;

        if (lat === undefined || lng === undefined) {
            const user = await this.usersRepository.findById(userId);
            lat = lat ?? user!.lat;
            lng = lng ?? user!.lng;
        }

        const withinRadius = await this.getWithinRadius(lat, lng, query.radius, query.strategy);

        const page = withinRadius.slice(query.cursor, query.cursor + query.limit);
        const nextCursor =
            query.cursor + query.limit < withinRadius.length ? query.cursor + query.limit : null;

        return {
            vendors: page,
            nextCursor,
            strategy: query.strategy,
        };
    }

    private async getWithinRadius(
        lat: number,
        lng: number,
        radiusMeters: number,
        strategy: HomeStrategy,
    ): Promise<VendorWithDistance[]> {
        const candidates = await this.getCandidates(lat, lng, radiusMeters, strategy);

        // Distance and the radius filter are always recomputed against the caller's
        // exact point: the cache holds the cell's candidates, never a finished page.
        return candidates
            .map((vendor) => ({
                id: vendor.id,
                name: vendor.name,
                logoUrl: vendor.logoUrl,
                lat: vendor.lat,
                lng: vendor.lng,
                distanceMeters: Math.round(haversineDistance(lat, lng, vendor.lat, vendor.lng)),
            }))
            .filter((vendor) => vendor.distanceMeters <= radiusMeters)
            .sort((a, b) => a.distanceMeters - b.distanceMeters);
    }

    /**
     * Vendors that *might* be in range, keyed by geohash cell. The cached set
     * depends only on the cell and its precision — never on where inside the cell
     * the caller stood or on their exact radius — so any query landing in the cell
     * can reuse it.
     */
    private async getCandidates(
        lat: number,
        lng: number,
        radiusMeters: number,
        strategy: HomeStrategy,
    ): Promise<VendorCandidate[]> {
        const cacheKey = buildHomeCacheKey(lat, lng, radiusMeters, strategy);

        const cached = await this.redis.get(cacheKey);
        if (cached) {
            return JSON.parse(cached) as VendorCandidate[];
        }

        const precision = geohashPrecisionForRadius(radiusMeters);
        const cell = encodeGeohash(lat, lng, precision);

        const candidates = strategy === 'bounding-box'
            ? await this.getBoundingBoxCandidates(cell, precision, radiusMeters)
            : await this.getGeohashCandidates(cell);

        await this.redis.set(cacheKey, JSON.stringify(candidates), 'EX', HOME_CACHE_TTL_SECONDS);
        return candidates;
    }

    /** The cell's own bounds, grown by the largest radius that maps to this precision. */
    private getBoundingBoxCandidates(cell: string, precision: number, radiusMeters: number) {
        const bounds = decodeGeohashBounds(cell);
        const centerLat = (bounds.minLat + bounds.maxLat) / 2;
        const centerLng = (bounds.minLng + bounds.maxLng) / 2;

        const bucketRadius = maxRadiusForPrecision(precision);
        const margin = Number.isFinite(bucketRadius) ? bucketRadius : radiusMeters;

        const cellRadius = haversineDistance(centerLat, centerLng, bounds.maxLat, bounds.maxLng);
        const box = computeBoundingBox(centerLat, centerLng, cellRadius + margin);

        return this.vendorsRepository.findByBoundingBox(box);
    }

    private getGeohashCandidates(cell: string) {
        const prefixes = [cell, ...getGeohashNeighbors(cell)];
        return this.vendorsRepository.findByGeohashPrefixes(prefixes);
    }
}
