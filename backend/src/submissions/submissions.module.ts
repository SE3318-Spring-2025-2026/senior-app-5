import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubmissionsService } from './submissions.service';
import { SubmissionsController } from './submissions.controller';
import { PhasesModule } from '../phases/phases.module';
import { Submission, SubmissionSchema } from './schemas/submission.schema';
import { GroupMemberGuard } from './guards/group-member.guard'; // Yeni Guard

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Submission.name, schema: SubmissionSchema }]),
    PhasesModule,
  ],
  controllers: [SubmissionsController],
  providers: [
    SubmissionsService, 
    GroupMemberGuard 
  ],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}