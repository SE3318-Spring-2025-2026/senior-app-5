import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UsersModule } from '../users/users.module';
import { TeamsModule } from '../teams/teams.module';
import { Group, GroupSchema } from '../groups/group.entity';
import { User, UserSchema } from '../users/data/user.schema';

@Module({
  imports: [
    UsersModule,
    TeamsModule,
    
    MongooseModule.forFeature([
      { name: Group.name, schema: GroupSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}