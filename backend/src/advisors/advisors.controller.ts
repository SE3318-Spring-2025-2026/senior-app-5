import {
  Controller,
  ForbiddenException,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
  constructor(private readonly advisorsService: AdvisorsService) {}

  @Get()
  async listAdvisors(
    @Req() req: RequestWithUser,
    @Query() query: ListAdvisorsQueryDto,
  ) {
    const role = req.user?.role;
    //TODO - Uppercase check should be removed once all roles are standardized to uppercase in the database
    if (role !== 'COORDINATOR' && role !== 'Coordinator') {
      throw new ForbiddenException('Only coordinators can view advisors.');
    }

    return this.advisorsService.listAdvisors(query);
  }
}
