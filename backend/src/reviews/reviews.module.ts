import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Schedule, ScheduleSchema } from '../advisors/schemas/schedule.schema';
import {
  Committee,
  CommitteeSchema,
} from '../committees/schemas/committee.schema';
import {
  Submission,
  SubmissionSchema,
} from '../submissions/schemas/submission.schema';
import { Review, ReviewSchema } from './schemas/review.schema';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [
    ActivityLogsModule,
    MongooseModule.forFeature([
      { name: Review.name, schema: ReviewSchema },
      { name: Submission.name, schema: SubmissionSchema },
      { name: Committee.name, schema: CommitteeSchema },
      { name: Schedule.name, schema: ScheduleSchema },
    ]),
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
