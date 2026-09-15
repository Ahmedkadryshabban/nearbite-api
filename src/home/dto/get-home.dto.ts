import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsPositive, Max, Min } from 'class-validator';

export class GetHomeDto {
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    lat?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    lng?: number;

    @Type(() => Number)
    @IsInt()
    @IsPositive()
    radius!: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit: number = 20;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    cursor: number = 0;

    @IsOptional()
    @IsIn(['bounding-box', 'geohash'])
    strategy: 'bounding-box' | 'geohash' = 'geohash';
}
