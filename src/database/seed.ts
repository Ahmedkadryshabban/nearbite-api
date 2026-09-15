import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import * as schema from './schema.js';
import { users, vendors, products } from './schema.js';
import { encodeGeohash } from '../common/geohash/geohash.util.js';
import { randomPointNear } from './seed-geo.util.js';

const CITY_CENTER = { lat: 30.0444, lng: 31.2357 };

const RINGS: { count: number; maxRadiusMeters: number }[] = [
    { count: 15, maxRadiusMeters: 800 },
    { count: 20, maxRadiusMeters: 3000 },
    { count: 15, maxRadiusMeters: 8000 },
    { count: 10, maxRadiusMeters: 18000 },
];

const VENDOR_NAMES = [
    'Koshary Corner', 'Falafel House', 'Shawarma King', 'Pizza Roma', 'Sushi Go',
    'Burger Hub', 'Pasta Point', 'Grill Master', 'Taco Fiesta', 'Noodle Bar',
    'Bakery Fresh', 'Coffee Stop', 'Juice Bar', 'Seafood Spot', 'Steak House',
    'Vegan Table', 'Curry Place', 'Dumpling Den', 'Crepe Corner', 'Wing Stop',
];

export async function seedDatabase() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool, { schema });

    console.log('Clearing existing vendors...');
    await db.delete(vendors);

    console.log('Ensuring the seed admin user exists...');
    let admin = await db.query.users.findFirst({ where: eq(users.email, 'admin@nearbite.dev') });
    if (!admin) {
        const passwordHash = await bcrypt.hash('admin12345', 10);
        const [created] = await db.insert(users).values({
            name: 'Seed Admin',
            email: 'admin@nearbite.dev',
            passwordHash,
            role: 'admin',
            lat: CITY_CENTER.lat,
            lng: CITY_CENTER.lng,
        }).returning();
        admin = created;
        console.log('  created admin@nearbite.dev / admin12345');
    } else {
        console.log('  already exists — reusing it');
    }

    const vendorCount = RINGS.reduce((sum, ring) => sum + ring.count, 0);
    console.log(`Seeding ${vendorCount} vendors around Cairo...`);

    const vendorRows: (typeof vendors.$inferInsert)[] = [];
    let nameIndex = 0;
    for (const ring of RINGS) {
        for (let i = 0; i < ring.count; i++) {
            const { lat, lng } = randomPointNear(CITY_CENTER, ring.maxRadiusMeters);
            const name = `${VENDOR_NAMES[nameIndex % VENDOR_NAMES.length]} ${nameIndex + 1}`;
            nameIndex++;

            vendorRows.push({
                name,
                logoUrl: null,
                lat,
                lng,
                geohash: encodeGeohash(lat, lng),
                createdBy: admin.id,
            });
        }
    }

    const insertedVendors = await db.insert(vendors).values(vendorRows).returning();
    console.log(`  inserted ${insertedVendors.length} vendors.`);

    console.log('Seeding 1-2 products per vendor...');
    const productRows: (typeof products.$inferInsert)[] = [];
    for (const vendor of insertedVendors) {
        const productCount = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < productCount; i++) {
            productRows.push({
                vendorId: vendor.id,
                name: `${vendor.name} special ${i + 1}`,
                price: 5000 + Math.floor(Math.random() * 15000),
                description: 'Seed data product.',
            });
        }
    }
    await db.insert(products).values(productRows);
    console.log(`  inserted ${productRows.length} products.`);

    await pool.end();
    console.log('Done.');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
    seedDatabase().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
