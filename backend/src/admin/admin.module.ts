import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Group, GroupSchema } from '../groups/group.entity';
import { User, UserSchema } from '../users/data/user.schema';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Group.name, schema: GroupSchema },
      { name: User.name, schema: UserSchema },
    ]),
    UsersModule,
    MailModule,
    ActivityLogsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
