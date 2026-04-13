import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UsersModule } from '../users/users.module';
import { TeamsModule } from '../teams/teams.module';

@Module({
  imports: [UsersModule, TeamsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
