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
import { AdvisorRequestStatus } from './schemas/advisor-request.schema';

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
  async submitRequest(
    @Req() req: RequestWithUser,
    @Body() body: SubmitRequestDto,
  ) {
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

    const requestRecord = result as unknown as {
      requestId: string;
      groupId: string;
      submittedBy: string;
      requestedAdvisorId: string;
      status?: string;
      createdAt?: string;
      updatedAt?: string;
    };

    const response = {
      requestId: requestRecord.requestId,
      groupId: requestRecord.groupId,
      submittedBy: requestRecord.submittedBy,
      requestedAdvisorId: requestRecord.requestedAdvisorId,
      status: requestRecord.status ?? AdvisorRequestStatus.PENDING,
      createdAt: requestRecord.createdAt,
      updatedAt: requestRecord.updatedAt,
    };

    this.logger.log(
      JSON.stringify({
        event: 'advisor_request_submitted',
        requestId: response.requestId,
        groupId: response.groupId,
        requestedAdvisorId: response.requestedAdvisorId,
        callerRole,
        correlationId,
      }),
    );

    return response;
  }
}
