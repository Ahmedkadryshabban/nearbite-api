import type { Role } from '../../users/role.enum.js';

export interface JwtPayload {
    sub: number;
    role: Role;
}
