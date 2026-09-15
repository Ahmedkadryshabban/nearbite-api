import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type Db } from '../database/database.module.js';
import { users } from '../database/schema.js';

@Injectable()
export class UsersRepository {
constructor(@Inject(DRIZZLE) private readonly db: Db) {}

findByEmail(email: string) {
    return this.db.query.users.findFirst({ where: eq(users.email, email) });
}

findById(id: number) {
    return this.db.query.users.findFirst({ where: eq(users.id, id) });
}

async create(data: typeof users.$inferInsert) {
    const [row] = await this.db.insert(users).values(data).returning();
    return row;
}
}