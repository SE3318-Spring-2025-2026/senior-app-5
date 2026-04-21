import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Phase, PhaseSchema } from './phase.entity';
import { PhasesService } from './phases.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Phase.name, schema: PhaseSchema }]),
  ],
  providers: [PhasesService],
  exports: [PhasesService],
})
export class PhasesModule {}
