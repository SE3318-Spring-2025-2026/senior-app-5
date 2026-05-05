import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RubricsController } from './rubrics.controller';
import { RubricsService } from './rubrics.service';
import { Rubric, RubricSchema } from './schemas/rubric.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Rubric.name, schema: RubricSchema }]),
  ],
  controllers: [RubricsController],
  providers: [RubricsService],
  exports: [RubricsService, MongooseModule],
})
export class RubricsModule {}