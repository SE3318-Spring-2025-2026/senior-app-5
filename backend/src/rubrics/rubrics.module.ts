import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RubricsController } from './rubrics.controller';
import { RubricsService } from './rubrics.service';
import { Rubric, RubricSchema } from './schemas/rubric.schema';
import { DeliverablesModule } from '../deliverables/deliverables.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Rubric.name, schema: RubricSchema }]),
    DeliverablesModule,
  ],
  controllers: [RubricsController],
  providers: [RubricsService],
  exports: [RubricsService],
})
export class RubricsModule {}
