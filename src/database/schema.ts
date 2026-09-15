import {
    pgTable, serial, varchar, doublePrecision, integer, timestamp, index,
} from 'drizzle-orm/pg-core';
import type { Role } from '../users/role.enum.js';

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: varchar('role', { length: 20 }).notNull().default('customer').$type<Role>(),
    lat: doublePrecision('lat').notNull(),
    lng: doublePrecision('lng').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const vendors = pgTable('vendors',{
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    logoUrl: varchar('logo_url', { length: 512 }),
    lat: doublePrecision('lat').notNull(),
    lng: doublePrecision('lng').notNull(),
    geohash: varchar('geohash', { length: 12 }).notNull(),
    createdBy: integer('created_by').notNull().references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
},
(t) => [
    index('vendors_geohash_idx').on(t.geohash),     
    index('vendors_lat_lng_idx').on(t.lat, t.lng),  
    ],
);

export const products = pgTable('products', {
    id: serial('id').primaryKey(),
    vendorId: integer('vendor_id').notNull()
    .references(() => vendors.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    price: integer('price').notNull(),  
    description: varchar('description', { length: 1024 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
});