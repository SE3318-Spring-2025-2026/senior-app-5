import {
  Controller,
  ForbiddenException,
  Get,
  Logger,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { hasAnyRole, normalizeRole, ROLES } from '../auth/constants/roles';
import { AdvisorsService } from './advisors.service';
import { ListAdvisorsQueryDto } from './dto/list-advisors-query.dto';

interface RequestWithUser extends Request {
  user?: {
    role?: string;
  };
}

@Controller('advisors')
@UseGuards(JwtAuthGuard)
export class AdvisorsController {
  private readonly logger = new Logger(AdvisorsController.name);

  constructor(private readonly advisorsService: AdvisorsService) {}

  private getCorrelationId(req: Request): string | undefined {
    const headerValue =
      req.headers?.['x-correlation-id'] ?? req.headers?.['x-request-id'];

    return typeof headerValue === 'string' ? headerValue : undefined;
  }

  @Get()
  async listAdvisors(
    @Req() req: RequestWithUser,
    @Query() query: ListAdvisorsQueryDto,
  ) {
    const role = req.user?.role;
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const correlationId = this.getCorrelationId(req);
    const callerRole = normalizeRole(role) ?? role ?? 'UNKNOWN';

    if (!hasAnyRole(role, [ROLES.COORDINATOR, ROLES.TEAM_LEADER])) {
      this.logger.warn(
        JSON.stringify({
          event: 'advisors_list_forbidden',
          callerRole,
          page,
          limit,
          correlationId,
        }),
      );

      throw new ForbiddenException(
        'Only coordinators and team leaders can view advisors.',
      );
    }

    const result = await this.advisorsService.listAdvisors(query);

    this.logger.log(
      JSON.stringify({
        event: 'advisors_listed',
        callerRole,
        page,
        limit,
        resultCount: result.data.length,
        correlationId,
      }),
    );

    return result;
  }
}
