import { Body, Controller, Param, Put, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { PhasesService } from './phases.service';
import { UpdatePhaseScheduleDto } from './dto/update-phase-schedule.dto';

@ApiTags('Phases')
@Controller('phases')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Coordinator)
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
