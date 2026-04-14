import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Logger,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { hasAnyRole, normalizeRole, ROLES } from '../auth/constants/roles';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
@UseGuards(JwtAuthGuard)
export class SchedulesController {
  private readonly logger = new Logger(SchedulesController.name);

  constructor(private readonly advisorsService: AdvisorsService) {}

  private getCorrelationId(req: Request): string | undefined {
    const headerValue =
      req.headers?.['x-correlation-id'] ?? req.headers?.['x-request-id'];

    return typeof headerValue === 'string' ? headerValue : undefined;
  }

  @Post()
  async setSchedule(@Req() req: RequestWithUser, @Body() body: SetScheduleDto) {
    const role = req.user?.role;
    const userId = req.user?.userId;
    const correlationId = this.getCorrelationId(req);
    const callerRole = normalizeRole(role) ?? role ?? 'UNKNOWN';

    if (!hasAnyRole(role, [ROLES.COORDINATOR])) {
      this.logger.warn(
        JSON.stringify({
          event: 'schedule_set_forbidden',
          callerRole,
          phase: body.phase,
          correlationId,
        }),
      );

      throw new ForbiddenException('Only coordinators can set schedules.');
    }

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
