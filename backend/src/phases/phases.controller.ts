import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { PhasesService } from './phases.service';
import { CreatePhaseDto } from './dto/create-phase.dto';
import { UpdatePhaseScheduleDto } from './dto/update-phase-schedule.dto';

@ApiTags('Phases')
@Controller('phases')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PhasesController {
  constructor(private readonly phasesService: PhasesService) {}

  @Get()
  @Roles(Role.Coordinator)
  async listPhases() {
    return this.phasesService.listForScheduling();
  }

  @Post()
  @Roles(Role.Coordinator)
  async create(@Body() dto: CreatePhaseDto) {
    return this.phasesService.createPhase(dto);
  }

  @Get(':phaseId')
  @Roles(Role.Student, Role.Professor, Role.Coordinator, Role.Admin)
  async getPhase(@Param('phaseId') phaseId: string) {
    return this.phasesService.getPhaseById(phaseId);
  }

  @Put(':phaseId/schedule')
  @Roles(Role.Coordinator)
  async updateSchedule(
    @Param('phaseId') phaseId: string,
    @Body() dto: UpdatePhaseScheduleDto,
  ) {
    return this.phasesService.updateSchedule(phaseId, dto);
  }
}
