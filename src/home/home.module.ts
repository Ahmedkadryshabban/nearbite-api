import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { UsersModule } from '../users/users.module.js';
import { VendorsModule } from '../vendors/vendors.module.js';
import { HomeService } from './home.service.js';
import { HomeController } from './home.controller.js';

@Module({
    imports: [AuthModule, UsersModule, VendorsModule],
    controllers: [HomeController],
    providers: [HomeService],
})
export class HomeModule {}
