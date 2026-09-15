import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config/env.validation.js';
import { DatabaseModule } from './database/database.module.js';
import { RedisModule } from './redis/redis.module.js';
import { UsersModule } from './users/users.module.js';
import { VendorsModule } from './vendors/vendors.module.js';
import { ProductsModule } from './products/products.module.js';
import { AuthModule } from './auth/auth.module.js';
import { HomeModule } from './home/home.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    DatabaseModule,
    RedisModule,
    UsersModule,
    VendorsModule,
    ProductsModule,
    AuthModule,
    HomeModule,
  ],
})
export class AppModule {}
