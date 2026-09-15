import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, type AuthenticatedRequest } from '../auth/guards/jwt-auth.guard.js';
import { HomeService } from './home.service.js';
import { GetHomeDto } from './dto/get-home.dto.js';

@Controller('v1/home')
export class HomeController {
    constructor(private readonly homeService: HomeService) {}

    @UseGuards(JwtAuthGuard)
    @Get()
    getHome(@Query() query: GetHomeDto, @Req() req: AuthenticatedRequest) {
        return this.homeService.getNearbyVendors(req.user.sub, query);
    }
}
