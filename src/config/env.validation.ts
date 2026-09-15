import { plainToInstance } from 'class-transformer';
import {
    IsString, IsUrl, MinLength, IsInt, IsPositive, validateSync,
} from 'class-validator';

class EnvironmentVariables {
    @IsUrl({ protocols: ['postgres', 'postgresql'], require_tld: false })
    DATABASE_URL!: string;

    @IsUrl({ protocols: ['redis'], require_tld: false })
    REDIS_URL!: string;

    @IsString() @MinLength(16)
    JWT_SECRET!: string;

    @IsInt() @IsPositive()
    MAX_RADIUS_METERS: number = 20000;

    @IsInt() @IsPositive()
    PORT: number = 3000;
}

export function validate(config: Record<string, unknown>) {
const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
});

const errors = validateSync(validated, { skipMissingProperties: false });

if (errors.length > 0) {
    throw new Error(errors.map((e) => e.toString()).join('\n'));
}

return validated;
}