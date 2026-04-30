import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Group, GroupSchema } from '../groups/group.entity';
import { Schedule, ScheduleSchema } from '../advisors/schemas/schedule.schema';
import { SprintEvaluationsController } from './sprint-evaluations.controller';
import { SprintEvaluationsService } from './sprint-evaluations.service';
import {
  SprintEvaluation,
  SprintEvaluationSchema,
} from './schemas/sprint-evaluation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Group.name, schema: GroupSchema },
      { name: Schedule.name, schema: ScheduleSchema },
      { name: SprintEvaluation.name, schema: SprintEvaluationSchema },
    ]),
  ],
  controllers: [SprintEvaluationsController],
  providers: [SprintEvaluationsService],
  exports: [SprintEvaluationsService],
})
export class SprintEvaluationsModule {}
