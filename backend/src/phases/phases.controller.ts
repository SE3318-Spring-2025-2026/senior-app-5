import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
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
  @Roles(
    Role.Student,
    Role.TeamLeader,
    Role.Professor,
    Role.Coordinator,
    Role.Admin,
  )
  @ApiQuery({ name: 'field', enum: ['phaseId', 'name'], required: false })
  @ApiQuery({ name: 'value', type: String, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  async listPhases(
    @Query('field') field?: string,
    @Query('value') value?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : undefined;
    return this.phasesService.listForScheduling(field, value, parsedLimit);
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
