import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdvisorsController } from './advisors.controller';
import { AdvisorsService } from './advisors.service';
import { User, UserSchema } from '../users/data/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [AdvisorsController],
  providers: [AdvisorsService],
})
export class AdvisorsModule {}
