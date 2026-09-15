import { IsNotEmpty, IsNumber, IsOptional, IsUrl } from 'class-validator';

export class UpdateVendorDto {
    @IsOptional() @IsNotEmpty()
    name?: string;

    @IsOptional() @IsUrl()
    logoUrl?: string;

    @IsOptional() @IsNumber()
    lat?: number;

    @IsOptional() @IsNumber()
    lng?: number;
}