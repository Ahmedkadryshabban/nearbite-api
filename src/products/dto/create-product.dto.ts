import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateProductDto {
    @IsNotEmpty()
    name!: string;

    @IsInt() @IsPositive()
    price!: number;

    @IsOptional() @IsString()
    description?: string;
}