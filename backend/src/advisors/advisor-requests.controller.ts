import {
  Body,
  Controller,
  ForbiddenException,
  Logger,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { hasAnyRole, normalizeRole, ROLES } from '../auth/constants/roles';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdvisorsService } from './advisors.service';
import { SubmitRequestDto } from './dto/submit-request.dto';

interface RequestWithUser extends Request {
  user?: {
    userId?: string;
    role?: string;
  };
}

@Controller('requests')
@UseGuards(JwtAuthGuard)
export class AdvisorRequestsController {
  private readonly logger = new Logger(AdvisorRequestsController.name);

  constructor(private readonly advisorsService: AdvisorsService) {}

  private getCorrelationId(req: Request): string | undefined {
    const headerValue =
      req.headers?.['x-correlation-id'] ?? req.headers?.['x-request-id'];

    return typeof headerValue === 'string' ? headerValue : undefined;
  }

  @Post()
  async submitRequest(@Req() req: RequestWithUser, @Body() body: SubmitRequestDto) {
    const role = req.user?.role;
    const userId = req.user?.userId;
    const correlationId = this.getCorrelationId(req);
    const callerRole = normalizeRole(role) ?? role ?? 'UNKNOWN';

    if (!hasAnyRole(role, [ROLES.TEAM_LEADER])) {
      this.logger.warn(
        JSON.stringify({
          event: 'advisor_request_submit_forbidden',
          callerRole,
          requestedAdvisorId: body.requestedAdvisorId,
          correlationId,
        }),
      );

      throw new ForbiddenException(
        'Only team leaders can submit advisor requests.',
      );
    }

    const result = await this.advisorsService.submitRequest({
      requestedAdvisorId: body.requestedAdvisorId,
      submittedBy: userId ?? '',
    });

    this.logger.log(
      JSON.stringify({
        event: 'advisor_request_submitted',
        requestId: result.requestId,
        groupId: result.groupId,
        requestedAdvisorId: result.requestedAdvisorId,
        callerRole,
        correlationId,
      }),
    );

    return result;
  }
}
