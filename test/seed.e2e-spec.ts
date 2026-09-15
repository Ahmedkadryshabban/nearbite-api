// WARNING: this test is destructive. seedDatabase() deletes every row in
// `vendors` (and cascades to `products`) before reseeding, exactly like
// running `npm run seed` by hand. Only run this against a disposable dev
// database — never against one with real data.
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { Pool } from 'pg';
import * as schema from '../src/database/schema.js';
import { users, vendors, products } from '../src/database/schema.js';
import { seedDatabase } from '../src/database/seed.js';

describe('seedDatabase (e2e)', () => {
    let pool: Pool;
    let db: ReturnType<typeof drizzle<typeof schema>>;

    beforeAll(() => {
        pool = new Pool({ connectionString: process.env.DATABASE_URL });
        db = drizzle(pool, { schema });
    });

    afterAll(async () => {
        await pool.end();
    });

    it('seeds the admin user, 60 vendors with valid geohashes, and 1-2 products each', async () => {
        await seedDatabase();

        const admin = await db.query.users.findFirst({ where: eq(users.email, 'admin@nearbite.dev') });
        expect(admin).toBeDefined();

        const allVendors = await db.select().from(vendors);
        expect(allVendors).toHaveLength(60);
        for (const vendor of allVendors) {
            expect(vendor.geohash.length).toBeGreaterThan(0);
        }

        const allProducts = await db.select().from(products);
        expect(allProducts.length).toBeGreaterThanOrEqual(60);
        expect(allProducts.length).toBeLessThanOrEqual(120);
    }, 30000);

    it('is idempotent: running it twice does not duplicate the admin user or the vendors', async () => {
        await seedDatabase();
        await seedDatabase();

        const admins = await db.select().from(users).where(eq(users.email, 'admin@nearbite.dev'));
        expect(admins).toHaveLength(1);

        const allVendors = await db.select().from(vendors);
        expect(allVendors).toHaveLength(60);
    }, 60000);
});
