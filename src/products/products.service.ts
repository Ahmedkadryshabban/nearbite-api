import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductsRepository } from './products.repository.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';

@Injectable()
export class ProductsService {
    constructor(private readonly productsRepository: ProductsRepository) {}

    create(vendorId: number, dto: CreateProductDto) {
        return this.productsRepository.create({ ...dto, vendorId });
    }

    findByVendorId(vendorId: number) {
        return this.productsRepository.findByVendorId(vendorId);
    }

    async update(id: number, dto: UpdateProductDto) {
        const existing = await this.productsRepository.findById(id);
        if (!existing) {
            throw new NotFoundException('Product not found');
        }
        return this.productsRepository.update(id, dto);
    }

    async delete(id: number) {
        const existing = await this.productsRepository.findById(id);
        if (!existing) {
            throw new NotFoundException('Product not found');
        }
        await this.productsRepository.delete(id);
        return { success: true };
    }
}