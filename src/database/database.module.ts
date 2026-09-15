import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

export const DRIZZLE = 'DRIZZLE';
export type Db = ReturnType<typeof drizzle<typeof schema>>;

@Global()
@Module({
providers: [{
    provide: DRIZZLE,
    inject: [ConfigService],
    useFactory: (config: ConfigService) => {
    const pool = new Pool({
        connectionString: config.getOrThrow<string>('DATABASE_URL'),
        });
    return drizzle(pool, { schema });
    },
},
],
exports: [DRIZZLE],
})
export class DatabaseModule {}