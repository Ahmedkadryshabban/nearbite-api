import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module.js';
import { VendorsRepository } from './vendors.repository.js';
import { ProductsService } from '../products/products.service.js';
import { CreateVendorDto } from './dto/create-vendor.dto.js';
import { UpdateVendorDto } from './dto/update-vendor.dto.js';
import { encodeGeohash } from '../common/geohash/geohash.util.js';
import { buildInvalidationKeys } from '../common/geohash/home-cache.util.js';

@Injectable()
export class VendorsService {
    constructor(
        private readonly vendorsRepository: VendorsRepository,
        private readonly productsService: ProductsService,
        @Inject(REDIS_CLIENT) private readonly redis: Redis,
    ) {}

    async create(dto: CreateVendorDto, adminId: number) {
        const geohash = encodeGeohash(dto.lat, dto.lng);
        const vendor = await this.vendorsRepository.create({
            name: dto.name,
            logoUrl: dto.logoUrl,
            lat: dto.lat,
            lng: dto.lng,
            geohash,
            createdBy: adminId,
        });

        await this.invalidateArea(geohash);
        return vendor;
    }

    async update(id: number, dto: UpdateVendorDto) {
        const existing = await this.vendorsRepository.findById(id);
        if (!existing) {
            throw new NotFoundException('Vendor not found');
        }

        const locationChanged = dto.lat !== undefined || dto.lng !== undefined;
        const nextLat = dto.lat ?? existing.lat;
        const nextLng = dto.lng ?? existing.lng;
        const nextGeohash = locationChanged ? encodeGeohash(nextLat, nextLng) : existing.geohash;

        const updated = await this.vendorsRepository.update(id, {
            ...dto,
            ...(locationChanged ? { geohash: nextGeohash } : {}),
        });

        if (locationChanged) {
            await this.invalidateArea(existing.geohash);
            await this.invalidateArea(nextGeohash);
        }

        return updated;
    }

    async delete(id: number) {
        const existing = await this.vendorsRepository.findById(id);
        if (!existing) {
            throw new NotFoundException('Vendor not found');
        }
        await this.vendorsRepository.delete(id);
        await this.invalidateArea(existing.geohash);
        return { success: true };
    }

    async findWithProducts(id: number) {
        const vendor = await this.vendorsRepository.findById(id);
        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }
        const products = await this.productsService.findByVendorId(id);
        return { ...vendor, products };
    }

    private async invalidateArea(geohash: string) {
        const keys = buildInvalidationKeys(geohash);
        if (keys.length > 0) {
            await this.redis.del(...keys);
        }
    }
}
