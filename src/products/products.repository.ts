import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type Db } from '../database/database.module.js';
import { products } from '../database/schema.js';

@Injectable()
export class ProductsRepository {
constructor(@Inject(DRIZZLE) private readonly db: Db) {}

findByVendorId(vendorId: number) {
    return this.db.query.products.findMany({ where: eq(products.vendorId, vendorId) });
}

findById(id: number) {
    return this.db.query.products.findFirst({ where: eq(products.id, id) });
}

async create(data: typeof products.$inferInsert) {
    const [row] = await this.db.insert(products).values(data).returning();
    return row;
}

async update(id: number, data: Partial<typeof products.$inferInsert>) {
    const [row] = await this.db.update(products)
    .set(data)
    .where(eq(products.id, id))
    .returning();
    return row;
}

delete(id: number) {
    return this.db.delete(products).where(eq(products.id, id));
}
}