import { Body, Controller, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PhasesService } from './phases.service';
import { UpdatePhaseScheduleDto } from './dto/update-phase-schedule.dto';

@Controller('phases')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Coordinator')
export class PhasesController {
  constructor(private readonly phasesService: PhasesService) {}

  @Put(':phaseId/schedule')
  async updateSchedule(
    @Param('phaseId') phaseId: string,
    @Body() dto: UpdatePhaseScheduleDto,
  ) {
    return this.phasesService.updateSchedule(phaseId, dto);
  }
}
