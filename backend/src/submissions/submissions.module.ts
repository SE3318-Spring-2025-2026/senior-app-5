import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubmissionsService } from './submissions.service';
import { SubmissionsController } from './submissions.controller';
import { Submission, SubmissionSchema } from './schemas/submission.schema';
import { PhasesModule } from '../phases/phases.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Submission.name, schema: SubmissionSchema }]),
    PhasesModule
  ],
  providers: [SubmissionsService],
  controllers: [SubmissionsController]
})
export class SubmissionsModule {}