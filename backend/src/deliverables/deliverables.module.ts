import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DeliverablesService } from './deliverables.service';
import { Deliverable, DeliverableSchema } from './deliverable.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Deliverable.name, schema: DeliverableSchema },
    ]),
  ],
  providers: [DeliverablesService],
  exports: [DeliverablesService],
})
export class DeliverablesModule {}
