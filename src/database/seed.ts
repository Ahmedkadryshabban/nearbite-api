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
 
const VENDOR_COUNT = Number(process.env.SEED_VENDOR_COUNT ?? 100_000);
 
// Postgres caps a statement at 65535 bind parameters, so rows go in chunks.
// vendors ~6 cols, products ~4 cols — 2000 rows/statement stays well under it.
const VENDOR_CHUNK = 2_000;
const PRODUCT_CHUNK = 2_000;
 
const CITY_CENTER = { lat: 30.0444, lng: 31.2357 };
 
// Rough Egypt bounding box — a cheap final sanity guard, not the sampler.
const EGYPT_BOUNDS = { minLat: 21.9, maxLat: 31.7, minLng: 24.6, maxLng: 36.95 };
 
type LandBox = { minLat?: number; maxLat?: number; minLng?: number; maxLng?: number };
 
type Region = {
    name: string;
    lat: number;
    lng: number;
    /** scatter radius around the centre, in metres */
    radiusMeters: number;
    /** relative share of the total vendor count */
    weight: number;
    /** optional clamp that keeps coastal regions off the water */
    landBox?: LandBox;
};
 
/**
 * Real Egyptian population centres. Sampling around these (instead of picking
 * uniformly inside Egypt's bounding box) guarantees every point lands inside
 * Egypt and on land, and gives realistic clustering for geohash/radius queries
 * instead of vendors sprinkled evenly across the Western Desert.
 */
const EGYPT_REGIONS: Region[] = [
    { name: 'Cairo', lat: 30.0444, lng: 31.2357, radiusMeters: 25_000, weight: 20 },
    { name: 'Giza', lat: 29.9870, lng: 31.2118, radiusMeters: 22_000, weight: 12 },
    { name: 'New Cairo', lat: 30.0100, lng: 31.4900, radiusMeters: 14_000, weight: 5 },
    { name: '6th of October', lat: 29.9400, lng: 30.9200, radiusMeters: 12_000, weight: 4 },
    { name: 'Shubra El Kheima', lat: 30.1220, lng: 31.2440, radiusMeters: 7_000, weight: 3 },
    { name: 'Alexandria', lat: 31.1500, lng: 29.9300, radiusMeters: 14_000, weight: 10, landBox: { maxLat: 31.21 } },
    { name: 'Port Said', lat: 31.2200, lng: 32.2800, radiusMeters: 7_000, weight: 2, landBox: { maxLat: 31.26 } },
    { name: 'Damietta', lat: 31.4000, lng: 31.8100, radiusMeters: 6_000, weight: 1, landBox: { maxLat: 31.44 } },
    { name: 'Suez', lat: 29.9700, lng: 32.5100, radiusMeters: 7_000, weight: 2, landBox: { maxLng: 32.55 } },
    { name: 'Ismailia', lat: 30.6000, lng: 32.2700, radiusMeters: 8_000, weight: 2 },
    { name: 'Mansoura', lat: 31.0400, lng: 31.3800, radiusMeters: 9_000, weight: 3 },
    { name: 'Tanta', lat: 30.7900, lng: 31.0000, radiusMeters: 9_000, weight: 3 },
    { name: 'Zagazig', lat: 30.5870, lng: 31.5020, radiusMeters: 8_000, weight: 2 },
    { name: 'Banha', lat: 30.4600, lng: 31.1840, radiusMeters: 7_000, weight: 2 },
    { name: 'Damanhur', lat: 31.0340, lng: 30.4700, radiusMeters: 8_000, weight: 2 },
    { name: 'Kafr El Sheikh', lat: 31.1100, lng: 30.9400, radiusMeters: 8_000, weight: 2, landBox: { maxLat: 31.4 } },
    { name: 'Fayoum', lat: 29.3100, lng: 30.8400, radiusMeters: 10_000, weight: 3 },
    { name: 'Beni Suef', lat: 29.0700, lng: 31.0970, radiusMeters: 9_000, weight: 2 },
    { name: 'Minya', lat: 28.1100, lng: 30.7500, radiusMeters: 9_000, weight: 2 },
    { name: 'Asyut', lat: 27.1800, lng: 31.1830, radiusMeters: 10_000, weight: 3 },
    { name: 'Sohag', lat: 26.5560, lng: 31.6950, radiusMeters: 9_000, weight: 2 },
    { name: 'Qena', lat: 26.1640, lng: 32.7260, radiusMeters: 8_000, weight: 2 },
    { name: 'Luxor', lat: 25.6870, lng: 32.6400, radiusMeters: 9_000, weight: 3 },
    { name: 'Aswan', lat: 24.0880, lng: 32.8990, radiusMeters: 8_000, weight: 2 },
    { name: 'Hurghada', lat: 27.2570, lng: 33.7900, radiusMeters: 10_000, weight: 3, landBox: { maxLng: 33.83 } },
    { name: 'Sharm El Sheikh', lat: 27.9150, lng: 34.3200, radiusMeters: 8_000, weight: 2, landBox: { maxLng: 34.36 } },
    { name: 'Marsa Matrouh', lat: 31.3200, lng: 27.2400, radiusMeters: 7_000, weight: 1, landBox: { maxLat: 31.35 } },
    { name: 'Siwa', lat: 29.2030, lng: 25.5190, radiusMeters: 6_000, weight: 1 },
    { name: 'Kharga', lat: 25.4400, lng: 30.5500, radiusMeters: 6_000, weight: 1 },
];
 
const REGION_CUMULATIVE_WEIGHTS: number[] = (() => {
    const cumulative: number[] = [];
    let running = 0;
    for (const region of EGYPT_REGIONS) {
        running += region.weight;
        cumulative.push(running);
    }
    return cumulative;
})();
 
const TOTAL_REGION_WEIGHT = REGION_CUMULATIVE_WEIGHTS[REGION_CUMULATIVE_WEIGHTS.length - 1];
 
function pickRegion(): Region {
    const target = Math.random() * TOTAL_REGION_WEIGHT;
    let low = 0;
    let high = REGION_CUMULATIVE_WEIGHTS.length - 1;
    while (low < high) {
        const mid = (low + high) >> 1;
        if (REGION_CUMULATIVE_WEIGHTS[mid] < target) low = mid + 1;
        else high = mid;
    }
    return EGYPT_REGIONS[low];
}
 
function isInsideEgypt(lat: number, lng: number, landBox?: LandBox): boolean {
    if (lat < EGYPT_BOUNDS.minLat || lat > EGYPT_BOUNDS.maxLat) return false;
    if (lng < EGYPT_BOUNDS.minLng || lng > EGYPT_BOUNDS.maxLng) return false;
    if (!landBox) return true;
    if (landBox.minLat !== undefined && lat < landBox.minLat) return false;
    if (landBox.maxLat !== undefined && lat > landBox.maxLat) return false;
    if (landBox.minLng !== undefined && lng < landBox.minLng) return false;
    if (landBox.maxLng !== undefined && lng > landBox.maxLng) return false;
    return true;
}
 
/** A random point inside Egypt, clustered around a real population centre. */
function randomEgyptPoint(): { lat: number; lng: number; region: Region } {
    const region = pickRegion();
    for (let attempt = 0; attempt < 25; attempt++) {
        const point = randomPointNear(region, region.radiusMeters);
        if (isInsideEgypt(point.lat, point.lng, region.landBox)) {
            return { lat: point.lat, lng: point.lng, region };
        }
    }
    // Extremely unlikely — fall back to the centre itself, which is always valid.
    return { lat: region.lat, lng: region.lng, region };
}
 
const VENDOR_NAMES = [
    'Koshary Corner', 'Falafel House', 'Shawarma King', 'Pizza Roma', 'Sushi Go',
    'Burger Hub', 'Pasta Point', 'Grill Master', 'Taco Fiesta', 'Noodle Bar',
    'Bakery Fresh', 'Coffee Stop', 'Juice Bar', 'Seafood Spot', 'Steak House',
    'Vegan Table', 'Curry Place', 'Dumpling Den', 'Crepe Corner', 'Wing Stop',
    'Feteer Palace', 'Hawawshi Hub', 'Molokhia Kitchen', 'Kebda Express', 'Ful Cart',
    'Sugar & Spice', 'Grill & Chill', 'Mezze Lab', 'Charcoal Room', 'Daily Bites',
];
 
function chunk<T>(rows: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
    return out;
}
 
export async function seedDatabase() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool, { schema });
 
    console.log('Clearing existing products and vendors...');
    await db.delete(products);
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
 
    console.log(`Seeding ${VENDOR_COUNT.toLocaleString()} vendors across Egypt...`);
    const startedAt = Date.now();
 
    let vendorsInserted = 0;
    let productsInserted = 0;
 
    // Vendors are generated, inserted and given products one chunk at a time so
    // memory stays flat no matter how large VENDOR_COUNT gets.
    for (let offset = 0; offset < VENDOR_COUNT; offset += VENDOR_CHUNK) {
        const size = Math.min(VENDOR_CHUNK, VENDOR_COUNT - offset);
 
        const vendorRows: (typeof vendors.$inferInsert)[] = new Array(size);
        for (let i = 0; i < size; i++) {
            const index = offset + i;
            const { lat, lng, region } = randomEgyptPoint();
 
            vendorRows[i] = {
                name: `${VENDOR_NAMES[index % VENDOR_NAMES.length]} ${region.name} #${index + 1}`,
                logoUrl: null,
                lat,
                lng,
                geohash: encodeGeohash(lat, lng),
                createdBy: admin.id,
            };
        }
 
        const insertedVendors = await db
            .insert(vendors)
            .values(vendorRows)
            .returning({ id: vendors.id, name: vendors.name });
        vendorsInserted += insertedVendors.length;
 
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
 
        for (const batch of chunk(productRows, PRODUCT_CHUNK)) {
            await db.insert(products).values(batch);
        }
        productsInserted += productRows.length;
 
        if (vendorsInserted % 10_000 === 0 || vendorsInserted === VENDOR_COUNT) {
            const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
            console.log(
                `  ${vendorsInserted.toLocaleString()}/${VENDOR_COUNT.toLocaleString()} vendors, ` +
                `${productsInserted.toLocaleString()} products (${elapsed}s)`,
            );
        }
    }
 
    await pool.end();
    console.log(
        `Done — ${vendorsInserted.toLocaleString()} vendors and ` +
        `${productsInserted.toLocaleString()} products in ${((Date.now() - startedAt) / 1000).toFixed(1)}s.`,
    );
}
 
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
    seedDatabase().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
 

