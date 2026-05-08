import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SprintConfigsController } from './sprint-configs.controller';
import { SprintConfigsService } from './sprint-configs.service';
import {
  SprintConfigEntry,
  SprintConfigEntrySchema,
} from './schemas/sprint-config.schema';
import {
  Deliverable,
  DeliverableSchema,
} from '../deliverables/schemas/deliverable.schema';
import { Schedule, ScheduleSchema } from '../advisors/schemas/schedule.schema';
import { Team, TeamSchema } from '../teams/schemas/team.schema';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SprintConfigEntry.name, schema: SprintConfigEntrySchema },
      { name: Deliverable.name, schema: DeliverableSchema },
      { name: Schedule.name, schema: ScheduleSchema },
      { name: Team.name, schema: TeamSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [SprintConfigsController],
  providers: [SprintConfigsService],
  exports: [SprintConfigsService],
})
export class SprintConfigsModule {}
