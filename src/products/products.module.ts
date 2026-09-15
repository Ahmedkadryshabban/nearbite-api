import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ProductsRepository } from './products.repository.js';
import { ProductsService } from './products.service.js';
import { ProductsController } from './products.controller.js';

@Module({
    imports: [AuthModule],
    controllers: [ProductsController],
    providers: [ProductsRepository, ProductsService],
    exports: [ProductsService],
})
export class ProductsModule {}