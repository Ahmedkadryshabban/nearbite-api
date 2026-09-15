import {
    Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, type AuthenticatedRequest } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { VendorsService } from './vendors.service.js';
import { ProductsService } from '../products/products.service.js';
import { CreateVendorDto } from './dto/create-vendor.dto.js';
import { UpdateVendorDto } from './dto/update-vendor.dto.js';
import { CreateProductDto } from '../products/dto/create-product.dto.js';

@Controller('v1/vendors')
export class VendorsController {
    constructor(
        private readonly vendorsService: VendorsService,
        private readonly productsService: ProductsService,
    ) {}

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @Post()
    create(@Body() dto: CreateVendorDto, @Req() req: AuthenticatedRequest) {
        return this.vendorsService.create(dto, req.user.sub);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @Put(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVendorDto) {
        return this.vendorsService.update(id, dto);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.vendorsService.delete(id);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.vendorsService.findWithProducts(id);
    }

    @Get(':id/products')
    findProducts(@Param('id', ParseIntPipe) id: number) {
        return this.productsService.findByVendorId(id);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @Post(':id/products')
    createProduct(
        @Param('id', ParseIntPipe) vendorId: number,
        @Body() dto: CreateProductDto,
    ) {
        return this.productsService.create(vendorId, dto);
    }
}