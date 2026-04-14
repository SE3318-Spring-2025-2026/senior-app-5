import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdvisorsController } from './advisors.controller';
import { AdvisorsService } from './advisors.service';
import { AdvisorRequestsController } from './advisor-requests.controller';
import { User, UserSchema } from '../users/data/user.schema';
import { Group, GroupSchema } from '../groups/group.entity';
import {
  AdvisorRequest,
  AdvisorRequestSchema,
} from './schemas/advisor-request.schema';
import { Schedule, ScheduleSchema } from './schemas/schedule.schema';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Group.name, schema: GroupSchema },
      { name: AdvisorRequest.name, schema: AdvisorRequestSchema },
      { name: Schedule.name, schema: ScheduleSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [AdvisorsController, AdvisorRequestsController],
  providers: [AdvisorsService],
})
export class AdvisorsModule {}
