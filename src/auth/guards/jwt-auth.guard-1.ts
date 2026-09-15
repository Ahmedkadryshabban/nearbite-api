import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { JwtPayload } from '../interfaces/jwt-payload.interface.js';

export interface AuthenticatedRequest extends Request {
    user: JwtPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService) {}

async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
        throw new UnauthorizedException('Missing bearer token');
    }

    try {
        const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
        request.user = payload;
        return true;
    } catch {
        throw new UnauthorizedException('Invalid or expired token');
    }
}

private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
}
}
