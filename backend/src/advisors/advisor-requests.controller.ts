import {
  Body,
  Controller,
  Logger,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { AdvisorsService } from './advisors.service';
import {
  AdvisorDecision,
  DecisionRequestDto,
} from './dto/decision-request.dto';
import { SubmitRequestDto } from './dto/submit-request.dto';
import { AdvisorRequestStatus } from './schemas/advisor-request.schema';

interface RequestWithUser extends Request {
  user?: {
    userId?: string;
    role?: string;
  };
}

@Controller('requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdvisorRequestsController {
  private readonly logger = new Logger(AdvisorRequestsController.name);

  constructor(private readonly advisorsService: AdvisorsService) {}

  private getCorrelationId(req: Request): string | undefined {
    const headerValue =
      req.headers?.['x-correlation-id'] ?? req.headers?.['x-request-id'];
    return typeof headerValue === 'string' ? headerValue : undefined;
  }

  @Post()
  @Roles(Role.TeamLeader)
  async submitRequest(
    @Req() req: RequestWithUser,
    @Body() body: SubmitRequestDto,
  ) {
    const userId = req.user?.userId;
    const correlationId = this.getCorrelationId(req);

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
        callerRole: req.user?.role,
        correlationId,
      }),
    );

    return response;
  }

  @Patch(':requestId/decision')
  @Roles(Role.Professor)
  async decideRequest(
    @Req() req: RequestWithUser,
    @Param('requestId', new ParseUUIDPipe({ version: '4' })) requestId: string,
    @Body() body: DecisionRequestDto,
  ) {
    const advisorId = req.user?.userId;
    const correlationId = this.getCorrelationId(req);
    const callerRole = req.user?.role ?? 'UNKNOWN';

    const result = await this.advisorsService.decideRequest({
      requestId,
      advisorId: advisorId ?? '',
      decision: body.decision,
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

    this.logger.log(
      JSON.stringify({
        event: 'advisor_request_decided',
        requestId: requestRecord.requestId,
        groupId: requestRecord.groupId,
        decision: body.decision,
        advisorId,
        callerRole,
        correlationId,
      }),
    );

    return {
      requestId: requestRecord.requestId,
      groupId: requestRecord.groupId,
      submittedBy: requestRecord.submittedBy,
      requestedAdvisorId: requestRecord.requestedAdvisorId,
      status:
        requestRecord.status ??
        (body.decision === AdvisorDecision.APPROVE
          ? AdvisorRequestStatus.APPROVED
          : AdvisorRequestStatus.REJECTED),
      createdAt: requestRecord.createdAt,
      updatedAt: requestRecord.updatedAt,
    };
  }
}
