import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Committee, CommitteeSchema } from './schemas/committee.schema';
import { CommitteesService } from './committees.service';
import { CommitteesController } from './committees.controller';
import { Group, GroupSchema } from '../groups/group.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Committee.name, schema: CommitteeSchema },
      { name: Group.name, schema: GroupSchema },
    ]),
  ],
  controllers: [CommitteesController],
  providers: [CommitteesService],
  exports: [CommitteesService],
})
export class CommitteesModule {}
