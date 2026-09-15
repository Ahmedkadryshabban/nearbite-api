import { Inject, Injectable } from '@nestjs/common';
import { and, between, eq, or, sql } from 'drizzle-orm';
import { DRIZZLE, type Db } from '../database/database.module.js';
import { vendors } from '../database/schema.js';

@Injectable()
export class VendorsRepository {
constructor(@Inject(DRIZZLE) private readonly db: Db) {}

findById(id: number) {
    return this.db.query.vendors.findFirst({ where: eq(vendors.id, id) });
}

async create(data: typeof vendors.$inferInsert) {
    const [row] = await this.db.insert(vendors).values(data).returning();
    return row;
}

async update(id: number, data: Partial<typeof vendors.$inferInsert>) {
    const [row] = await this.db.update(vendors)
    .set(data)
    .where(eq(vendors.id, id))
    .returning();
    return row;
}

delete(id: number) {
    return this.db.delete(vendors).where(eq(vendors.id, id));
}

findByBoundingBox(box: {
    minLat: number; maxLat: number; minLng: number; maxLng: number;
}) {
    return this.db.query.vendors.findMany({
    where: and(
        between(vendors.lat, box.minLat, box.maxLat),
        between(vendors.lng, box.minLng, box.maxLng),
    ),
    });
}

findByGeohashPrefixes(prefixes: string[]) {
    return this.db.query.vendors.findMany({
    where: or(...prefixes.map((p) => sql`${vendors.geohash} LIKE ${p + '%'}`)),
    });
}
}
