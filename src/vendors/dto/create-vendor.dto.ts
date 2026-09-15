import { IsNotEmpty, IsNumber, IsOptional, IsUrl } from 'class-validator';

export class CreateVendorDto {
    @IsNotEmpty()
    name!: string;

    @IsOptional()
    @IsUrl()
    logoUrl?: string;

    @IsNumber()
    lat!: number;

    @IsNumber()
    lng!: number;
}