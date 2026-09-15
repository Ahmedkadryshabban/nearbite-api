import {
    Body, Controller, Delete, Param, ParseIntPipe, Put, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { ProductsService } from './products.service.js';
import { UpdateProductDto } from './dto/update-product.dto.js';

@Controller('v1/products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) {}

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @Put(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
        return this.productsService.update(id, dto);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.productsService.delete(id);
    }
}