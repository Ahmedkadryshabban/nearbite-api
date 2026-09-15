import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ProductsModule } from '../products/products.module.js';
import { VendorsRepository } from './vendors.repository.js';
import { VendorsService } from './vendors.service.js';
import { VendorsController } from './vendors.controller.js';

@Module({
    imports: [AuthModule, ProductsModule],
    controllers: [VendorsController],
    providers: [VendorsRepository, VendorsService],
    exports: [VendorsRepository, VendorsService],
})
export class VendorsModule {}