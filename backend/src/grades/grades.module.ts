import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GradesController } from './grades.controller';
import { GradesService } from './grades.service';
import {
  GradeHistoryEntry,
  GradeHistoryEntrySchema,
  GroupFinalGrade,
  GroupFinalGradeSchema,
  StudentFinalGrade,
  StudentFinalGradeSchema,
} from './schemas/grade-records.schema';
import {
  Deliverable,
  DeliverableSchema,
} from './schemas/deliverable.schema';
import {
  DeliverableEvaluation,
  DeliverableEvaluationSchema,
} from './schemas/deliverable-evaluation.schema';
import {
  SprintEvaluation,
  SprintEvaluationSchema,
} from '../sprint-evaluations/schemas/sprint-evaluation.schema';
import {
  SprintConfig,
  SprintConfigSchema,
} from '../story-points/schemas/sprint-config.schema';
import {
  StoryPointRecord,
  StoryPointRecordSchema,
} from '../story-points/schemas/story-point-record.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StudentFinalGrade.name, schema: StudentFinalGradeSchema },
      { name: GroupFinalGrade.name, schema: GroupFinalGradeSchema },
      { name: GradeHistoryEntry.name, schema: GradeHistoryEntrySchema },
      { name: Deliverable.name, schema: DeliverableSchema },
      { name: DeliverableEvaluation.name, schema: DeliverableEvaluationSchema },
      { name: SprintEvaluation.name, schema: SprintEvaluationSchema },
      { name: SprintConfig.name, schema: SprintConfigSchema },
      { name: StoryPointRecord.name, schema: StoryPointRecordSchema },
    ]),
  ],
  controllers: [GradesController],
  providers: [GradesService],
  exports: [GradesService],
})
export class GradesModule {}