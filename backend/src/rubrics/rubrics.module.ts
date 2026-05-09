import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RubricsController, SprintRubricsController } from './rubrics.controller';
import { RubricsService } from './rubrics.service';
import { Rubric, RubricSchema } from './schemas/rubric.schema';
import {
  SprintEvaluation,
  SprintEvaluationSchema,
} from '../sprint-evaluations/schemas/sprint-evaluation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Rubric.name, schema: RubricSchema },
      { name: SprintEvaluation.name, schema: SprintEvaluationSchema },
    ]),
  ],
  controllers: [RubricsController, SprintRubricsController],
  providers: [RubricsService],
  exports: [RubricsService, MongooseModule],
})
export class RubricsModule {}