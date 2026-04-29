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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StudentFinalGrade.name, schema: StudentFinalGradeSchema },
      { name: GroupFinalGrade.name, schema: GroupFinalGradeSchema },
      { name: GradeHistoryEntry.name, schema: GradeHistoryEntrySchema },
    ]),
  ],
  controllers: [GradesController],
  providers: [GradesService],
  exports: [GradesService],
})
export class GradesModule {}