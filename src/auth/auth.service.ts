import {
    ConflictException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersRepository } from '../users/users.repository.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtPayload } from './interfaces/jwt-payload.interface.js';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersRepository: UsersRepository,
        private readonly jwtService: JwtService,
) {}

async register(dto: RegisterDto) {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
        throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.usersRepository.create({
        name: dto.name,
        email: dto.email,
        passwordHash,
        lat: dto.lat,
        lng: dto.lng,
    });

    const { passwordHash: _omit, ...safeUser } = user;
    return safeUser;
}

async login(dto: LoginDto) {
    const user = await this.usersRepository.findByEmail(dto.email);
    if (!user) {
        throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
        throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = { sub: user.id, role: user.role };
    const token = await this.jwtService.signAsync(payload);

    return { token };
}
}