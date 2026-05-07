import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RubricsController } from './rubrics.controller';
import { RubricsService } from './rubrics.service';
import { Rubric, RubricSchema } from './schemas/rubric.schema';
import {
  Deliverable,
  DeliverableSchema,
} from '../deliverables/schemas/deliverable.schema';
import {
  SprintEvaluation,
  SprintEvaluationSchema,
} from '../sprint-evaluations/schemas/sprint-evaluation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Rubric.name, schema: RubricSchema },
      { name: Deliverable.name, schema: DeliverableSchema },
      { name: SprintEvaluation.name, schema: SprintEvaluationSchema },
    ]),
  ],
  controllers: [RubricsController],
  providers: [RubricsService],
  exports: [RubricsService, MongooseModule],
})
export class RubricsModule {}