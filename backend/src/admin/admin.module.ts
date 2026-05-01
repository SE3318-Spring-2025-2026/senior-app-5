import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Group, GroupSchema } from '../groups/group.entity';
import { User, UserSchema } from '../users/data/user.schema'; 
import { UsersModule } from '../users/users.module';
import { AdvisorRequest, AdvisorRequestSchema } from '../advisors/schemas/advisor-request.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Group.name, schema: GroupSchema },
      { name: User.name, schema: UserSchema },
      { name: AdvisorRequest.name, schema: AdvisorRequestSchema },
    ]),
    UsersModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}