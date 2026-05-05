import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { CreateRubricDto } from './dto/create-rubric.dto';
import {
  RubricResponseDto,
  PaginatedRubricsDto,
  ListRubricsQueryDto,
} from './dto/rubric-response.dto';
import { RubricsService } from './rubrics.service';

interface RequestWithUser extends Request {
  user?: {
    userId?: string;
    sub?: string;
    _id?: string;
    role?: string;
  };
}

@ApiTags('Rubrics')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('deliverables/:deliverableId/rubrics')
export class RubricsController {
  constructor(private readonly rubricsService: RubricsService) {}

  private getCorrelationId(req: Request): string | undefined {
    const correlationId = req.headers['x-correlation-id'];
    return typeof correlationId === 'string' ? correlationId : undefined;
  }

  @ApiOperation({
    operationId: 'listRubrics',
    summary: 'List rubrics for a deliverable',
  })
  @ApiOkResponse({ type: PaginatedRubricsDto as never })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected internal failure',
  })
  @Roles(Role.Coordinator, Role.Professor, Role.Admin)
  @Get()
  @HttpCode(HttpStatus.OK)
  async listRubrics(
    @Param('deliverableId', new ParseUUIDPipe()) deliverableId: string,
    @Query() query: ListRubricsQueryDto,
    @Req() req: Request,
  ): Promise<PaginatedRubricsDto> {
    return this.rubricsService.listRubrics(
      deliverableId,
      query,
      this.getCorrelationId(req),
    );
  }

  @ApiOperation({
    operationId: 'createRubric',
    summary: 'Create a rubric for a deliverable',
  })
  @ApiCreatedResponse({ type: RubricResponseDto as never })
  @ApiBadRequestResponse({ description: 'Question weights do not sum to 1.0' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected internal failure',
  })
  @Roles(Role.Coordinator)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createRubric(
    @Param('deliverableId', new ParseUUIDPipe()) deliverableId: string,
    @Body() body: CreateRubricDto,
    @Req() req: RequestWithUser,
  ): Promise<RubricResponseDto> {
    if (body.deliverableId !== deliverableId) {
      throw new BadRequestException('Deliverable ID mismatch');
    }

    const actorId =
      req.user?.userId ?? req.user?.sub ?? req.user?._id ?? 'SYSTEM';

    return this.rubricsService.createRubric(
      body,
      actorId,
      this.getCorrelationId(req),
    );
  }

  @ApiOperation({
    operationId: 'deleteRubric',
    summary: 'Delete a rubric',
  })
  @ApiOkResponse()
  @ApiNotFoundResponse({ description: 'Rubric not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected internal failure',
  })
  @Roles(Role.Coordinator)
  @Delete(':rubricId')
  @HttpCode(HttpStatus.OK)
  async deleteRubric(
    @Param('deliverableId', new ParseUUIDPipe()) deliverableId: string,
    @Param('rubricId', new ParseUUIDPipe()) rubricId: string,
    @Req() req: Request,
  ): Promise<void> {
    await this.rubricsService.deleteRubric(
      rubricId,
      this.getCorrelationId(req),
    );
  }
}
