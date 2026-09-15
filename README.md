# NearBite

NearBite is a learning project: a simplified food-delivery backend built with NestJS, based on the proximity-service chapter (Chapter 1) of *System Design Interview: An Insider's Guide, Volume 2*. It's not a real product — there's no UI — just the backend "engine" that a mobile app or website would talk to.

An admin can add vendors (restaurants) and their products. A customer can register, log in, and ask "what's near me?" The project's main focus is that last question: finding nearby vendors efficiently, at scale, without scanning every row in the database on every request.

## Features

- **Auth** — registration and login with JWT-based sessions, passwords hashed with bcrypt.
- **Roles** — `admin` and `customer`, enforced with route guards. Only admins can create/update/delete vendors and products.
- **Vendors & products** — standard CRUD, with products always scoped to a vendor.
- **Proximity search (`GET /v1/home`)** — the core feature. Given a location and radius, returns nearby vendors sorted by distance, paginated. Supports two interchangeable candidate-search strategies:
  - `bounding-box` — a simple lat/lng range query (the baseline).
  - `geohash` — geohash-prefix matching over the cell + its 8 neighboring cells (the target implementation).
  Both strategies narrow candidates first with an indexed query, then refine with an exact Haversine distance calculation — never a full-table distance scan.
- **Caching** — proximity results are cached in Redis (cache-aside, 90s TTL), keyed by geohash cell + radius + strategy. Cache entries are invalidated precisely (not flushed wholesale) whenever a vendor is created, moved, or deleted.
- **Seed script** — generates a seed admin user and 60 vendors (with products) distributed realistically around Cairo, for testing proximity search with real data.

## Tech stack

- [NestJS](https://nestjs.com/) (TypeScript)
- PostgreSQL via [Drizzle ORM](https://orm.drizzle.team/)
- [Redis](https://redis.io/) via `ioredis`
- `@nestjs/jwt` for authentication, `bcryptjs` for password hashing
- `class-validator` / `class-transformer` for request validation

## Project structure

```
src/
  auth/         registration, login, JWT guards & role guards
  users/        user records (not auth itself)
  vendors/      vendor CRUD + the two proximity-search queries
  products/     product CRUD, scoped to a vendor
  home/         GET /v1/home — the proximity search endpoint
  common/
    geo/        haversine distance, bounding-box math
    geohash/    geohash encode/decode/neighbors, cache-key scheme
  redis/        Redis client (Global module)
  database/     Postgres connection, schema, seed script
  config/       environment variable validation
  main.ts       app bootstrap
  app.module.ts root module wiring
```

## Getting started

### 1. Prerequisites

- Node.js
- Docker (for Postgres and Redis), or your own local instances of each

### 2. Start Postgres and Redis

```bash
docker compose up -d
```

This starts Postgres 16 and Redis 7 as defined in `docker-compose.yml`.

### 3. Configure environment variables

Create a `.env` file in the project root:

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | Postgres connection string | *required* |
| `REDIS_URL` | Redis connection string | *required* |
| `JWT_SECRET` | Secret used to sign JWTs (16+ chars) | *required* |
| `MAX_RADIUS_METERS` | Largest search radius `/v1/home` will accept | `20000` |
| `PORT` | Server port | `3000` |

Example, matching the default `docker-compose.yml` credentials:

```
DATABASE_URL=postgres://nearbite:nearbite@localhost:5432/nearbite
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-this-to-something-random
```

The server validates these on startup and refuses to boot if anything is missing or malformed (see `src/config/env.validation.ts`).

### 4. Install dependencies and set up the database schema

```bash
npm install
npx drizzle-kit push
```

### 5. Seed sample data (optional but recommended)

```bash
npm run seed
```

Creates a seed admin (`admin@nearbite.dev` / `admin12345`) and 60 vendors with products scattered around Cairo at varying distances.

### 6. Run the server

```bash
npm run start:dev
```

## API overview

| Endpoint | Access | Description |
|---|---|---|
| `POST /v1/auth/register` | Public | Create a customer account |
| `POST /v1/auth/login` | Public | Log in, get a JWT |
| `GET /v1/home` | Authenticated | Find nearby vendors (`radius`, optional `lat`/`lng`, `limit`, `cursor`, `strategy`) |
| `GET /v1/vendors/:id` | Public | Vendor details + products |
| `GET /v1/vendors/:id/products` | Public | A vendor's products |
| `POST /v1/vendors` | Admin | Create a vendor |
| `PUT /v1/vendors/:id` | Admin | Update a vendor |
| `DELETE /v1/vendors/:id` | Admin | Delete a vendor |
| `POST /v1/vendors/:id/products` | Admin | Add a product to a vendor |
| `PUT /v1/products/:id` | Admin | Update a product |
| `DELETE /v1/products/:id` | Admin | Delete a product |

## Postman collection

A Postman collection with example requests/responses for most endpoints is published here:
[nearbite-api — Postman docs](https://documenter.getpostman.com/view/56615090/2sBYAyuVKo)

> **Note:** the collection doesn't currently have a dedicated example for `GET /v1/vendors/:id/products`. It's exercised indirectly since `GET /v1/vendors/:id` already returns the vendor's products embedded in the response, but there's no standalone request for the products-only endpoint.

## Tests

```bash
npm run test        # unit tests
npm run test:e2e     # e2e tests
npm run test:cov     # coverage
```
