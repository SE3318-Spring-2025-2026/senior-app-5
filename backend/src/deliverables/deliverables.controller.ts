import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { CreateDeliverableDto } from './dto/create-deliverable.dto';
import {
  DeliverableResponseDto,
  PaginatedDeliverablesDto,
} from './dto/deliverable-response.dto';
import { ListDeliverablesQueryDto } from './dto/list-deliverables-query.dto';
import { UpdateDeliverableDto } from './dto/update-deliverable.dto';
import { DeliverablesService } from './deliverables.service';

interface RequestWithUser extends Request {
  user?: {
    userId?: string;
    sub?: string;
    _id?: string;
    role?: string;
  };
}

@ApiTags('Deliverables')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('deliverables')
export class DeliverablesController {
  constructor(private readonly deliverablesService: DeliverablesService) {}

  private getCorrelationId(req: Request): string | undefined {
    const correlationId = req.headers['x-correlation-id'];
    return typeof correlationId === 'string' ? correlationId : undefined;
  }

  private getActorId(req: RequestWithUser): string {
    return req.user?.userId ?? req.user?.sub ?? req.user?._id ?? 'SYSTEM';
  }

  @ApiOperation({
    operationId: 'listDeliverables',
    summary: 'List deliverables with pagination',
  })
  @ApiOkResponse({ type: PaginatedDeliverablesDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected internal failure',
  })
  @Roles(Role.Coordinator, Role.Professor, Role.Admin)
  @Get()
  @HttpCode(HttpStatus.OK)
  async listDeliverables(
    @Query() query: ListDeliverablesQueryDto,
    @Req() req: Request,
  ): Promise<PaginatedDeliverablesDto> {
    return this.deliverablesService.listDeliverables(
      query,
      this.getCorrelationId(req),
    );
  }

  @ApiOperation({
    operationId: 'createDeliverable',
    summary: 'Create a deliverable',
  })
  @ApiCreatedResponse({ type: DeliverableResponseDto })
  @ApiConflictResponse({ description: 'Deliverable name already exists' })
  @ApiUnprocessableEntityResponse({
    description: 'Deliverable percentage total would exceed 100',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected internal failure',
  })
  @Roles(Role.Coordinator)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createDeliverable(
    @Body() body: CreateDeliverableDto,
    @Req() req: RequestWithUser,
  ): Promise<DeliverableResponseDto> {
    return this.deliverablesService.createDeliverable(
      body,
      this.getActorId(req),
      this.getCorrelationId(req),
    );
  }

  @ApiOperation({
    operationId: 'updateDeliverableWeights',
    summary: 'Update deliverable weights',
  })
  @ApiOkResponse({ type: DeliverableResponseDto })
  @ApiNotFoundResponse({ description: 'Deliverable not found' })
  @ApiUnprocessableEntityResponse({
    description: 'Deliverable percentage total would exceed 100',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected internal failure',
  })
  @Roles(Role.Coordinator)
  @Patch(':deliverableId')
  @HttpCode(HttpStatus.OK)
  async updateDeliverable(
    @Param('deliverableId', new ParseUUIDPipe()) deliverableId: string,
    @Body() body: UpdateDeliverableDto,
    @Req() req: RequestWithUser,
  ): Promise<DeliverableResponseDto> {
    return this.deliverablesService.updateDeliverable(
      deliverableId,
      body,
      this.getActorId(req),
      this.getCorrelationId(req),
    );
  }
}
