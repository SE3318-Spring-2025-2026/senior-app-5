import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PhasesController } from './phases.controller';
import { PhasesService } from './phases.service';
import { Phase, PhaseSchema } from './phase.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Phase.name, schema: PhaseSchema }]),
  ],
  controllers: [PhasesController],
  providers: [PhasesService],
  exports: [PhasesService],
})
export class PhasesModule {}
