import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';

export class UpdateProductDto {
    @IsOptional() @IsNotEmpty()
    name?: string;

    @IsOptional() @IsInt() @IsPositive()
    price?: number;

    @IsOptional() @IsString()
    description?: string;
}