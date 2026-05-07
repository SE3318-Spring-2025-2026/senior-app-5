import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DeliverablesController } from './deliverables.controller';
import { DeliverablesService } from './deliverables.service';
import { Deliverable, DeliverableSchema } from './schemas/deliverable.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Deliverable.name, schema: DeliverableSchema },
    ]),
  ],
  controllers: [DeliverablesController],
  providers: [DeliverablesService],
  exports: [DeliverablesService, MongooseModule],
})
export class DeliverablesModule {}
