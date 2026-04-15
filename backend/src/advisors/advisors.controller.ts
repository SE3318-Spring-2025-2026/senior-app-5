import { Controller, Get, Logger, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { AdvisorsService } from './advisors.service';
import { ListAdvisorsQueryDto } from './dto/list-advisors-query.dto';

interface RequestWithUser extends Request {
  user?: {
    role?: string;
  };
}

@Controller('advisors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdvisorsController {
  private readonly logger = new Logger(AdvisorsController.name);

  constructor(private readonly advisorsService: AdvisorsService) {}

  private getCorrelationId(req: Request): string | undefined {
    const headerValue =
      req.headers?.['x-correlation-id'] ?? req.headers?.['x-request-id'];
    return typeof headerValue === 'string' ? headerValue : undefined;
  }

  @Get()
  @Roles(Role.Coordinator, Role.TeamLeader)
  async listAdvisors(
    @Req() req: RequestWithUser,
    @Query() query: ListAdvisorsQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const correlationId = this.getCorrelationId(req);

    const result = await this.advisorsService.listAdvisors(query);

    this.logger.log(
      JSON.stringify({
        event: 'advisors_listed',
        callerRole: req.user?.role,
        page,
        limit,
        resultCount: result.data.length,
        correlationId,
      }),
    );

    return result;
  }
}
