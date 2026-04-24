import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { AdvisorsService } from './advisors.service';
import { GetActiveScheduleQueryDto } from './dto/get-active-schedule-query.dto';
import { SetScheduleDto } from './dto/set-schedule.dto';

interface RequestWithUser extends Request {
  user?: {
    userId?: string;
    role?: string;
  };
}

@Controller('schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchedulesController {
  private readonly logger = new Logger(SchedulesController.name);

  constructor(private readonly advisorsService: AdvisorsService) {}

  private getCorrelationId(req: Request): string | undefined {
    const headerValue =
      req.headers?.['x-correlation-id'] ?? req.headers?.['x-request-id'];
    return typeof headerValue === 'string' ? headerValue : undefined;
  }

  @Post()
  @Roles(Role.Coordinator)
  async setSchedule(@Req() req: RequestWithUser, @Body() body: SetScheduleDto) {
    const userId = req.user?.userId;
    const correlationId = this.getCorrelationId(req);

    const result = await this.advisorsService.setSchedule({
      phase: body.phase,
      startDatetime: body.startDatetime,
      endDatetime: body.endDatetime,
      coordinatorId: userId ?? '',
    });

    this.logger.log(
      JSON.stringify({
        event: 'schedule_set',
        scheduleId: result.scheduleId,
        phase: result.phase,
        coordinatorId: result.coordinatorId,
        correlationId,
      }),
    );

    return result;
  }

  @Get('active')
  async getActiveSchedule(
    @Req() req: RequestWithUser,
    @Query() query: GetActiveScheduleQueryDto,
  ) {
    const correlationId = this.getCorrelationId(req);

    const result = await this.advisorsService.getActiveSchedule(query.phase);

    this.logger.log(
      JSON.stringify({
        event: 'schedule_active_queried',
        phase: query.phase,
        isOpen: result.isOpen,
        correlationId,
      }),
    );

    return result;
  }
}
