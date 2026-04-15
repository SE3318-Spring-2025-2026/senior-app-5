import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { SchedulesService } from './schedules.service';
import { SetScheduleDto } from './dto/set-schedule.dto';
import { SchedulePhase } from './schedule.schema';

@ApiTags('Schedules')
@Controller('schedules')
@UseGuards(JwtAuthGuard)
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.Coordinator)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: SetScheduleDto, @Req() req: any) {
    return this.schedulesService.create(dto, req.user.userId as string);
  }

  @Get('active')
  @ApiQuery({ name: 'phase', enum: SchedulePhase, required: true })
  getActive(@Query('phase') phase: SchedulePhase) {
    return this.schedulesService.getActive(phase);
  }
}
