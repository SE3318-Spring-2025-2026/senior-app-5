import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommitteesController } from './committees.controller';
import { CommitteesService } from './committees.service';
import { Committee, CommitteeSchema } from './schemas/committee.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Committee.name, schema: CommitteeSchema },
    ]),
    UsersModule,
  ],
  controllers: [CommitteesController],
  providers: [CommitteesService],
  exports: [CommitteesService],
})
export class CommitteesModule {}