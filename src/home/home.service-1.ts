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
} from '../common/geohash/geohash.util.js';
import { buildHomeCacheKey, HOME_CACHE_TTL_SECONDS, type HomeStrategy } from '../common/geohash/home-cache.util.js';

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
        const cacheKey = buildHomeCacheKey(lat, lng, radiusMeters, strategy);

        const cached = await this.redis.get(cacheKey);
        if (cached) {
            return JSON.parse(cached) as VendorWithDistance[];
        }

        const candidates = strategy === 'bounding-box'
            ? await this.getBoundingBoxCandidates(lat, lng, radiusMeters)
            : await this.getGeohashCandidates(lat, lng, radiusMeters);

        const withinRadius: VendorWithDistance[] = candidates
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

        await this.redis.set(cacheKey, JSON.stringify(withinRadius), 'EX', HOME_CACHE_TTL_SECONDS);
        return withinRadius;
    }

    private getBoundingBoxCandidates(lat: number, lng: number, radiusMeters: number) {
        const box = computeBoundingBox(lat, lng, radiusMeters);
        return this.vendorsRepository.findByBoundingBox(box);
    }

    private getGeohashCandidates(lat: number, lng: number, radiusMeters: number) {
        const precision = geohashPrecisionForRadius(radiusMeters);
        const centerHash = encodeGeohash(lat, lng, precision);
        const neighborHashes = getGeohashNeighbors(centerHash);
        const prefixes = [centerHash, ...neighborHashes];
        return this.vendorsRepository.findByGeohashPrefixes(prefixes);
    }
}
