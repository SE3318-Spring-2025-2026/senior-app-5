import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { RubricsService } from './rubrics.service';
import { CreateRubricDto } from './dto/create-rubric.dto';
import { ListRubricsQueryDto } from './dto/list-rubrics-query.dto';
import { RubricResponseDto } from './dto/rubric-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

interface JwtUser {
  userId: string;
  email: string;
  role: string;
}

interface RequestWithUser extends Request {
  user: JwtUser;
}

@ApiTags('Rubrics')
@Controller('deliverables')
export class RubricsController {
  constructor(private readonly rubricsService: RubricsService) {}

  /**
   * GET /deliverables/{deliverableId}/rubrics
   * List all rubrics for a deliverable, optionally filtered to active only
   */
  @Get(':deliverableId/rubrics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Coordinator, Role.Advisor)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'List rubrics for a deliverable',
    description:
      'Retrieve all rubrics (or only the active one) for a specific deliverable. Accessible to COORDINATOR and ADVISOR roles.',
  })
  @ApiOkResponse({
    description: 'Rubrics retrieved successfully',
    type: RubricResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - missing or invalid JWT',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - insufficient permissions',
  })
  @ApiNotFoundResponse({
    description: 'Deliverable not found',
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
  })
  async listRubrics(
    @Param('deliverableId', new ParseUUIDPipe()) deliverableId: string,
    @Query() queryDto: ListRubricsQueryDto,
    @Req() req: RequestWithUser,
  ): Promise<RubricResponseDto[]> {
    const rubrics = await this.rubricsService.listRubrics(
      deliverableId,
      queryDto.activeOnly || false,
      req.user?.userId,
    );
    return rubrics as RubricResponseDto[];
  }

  /**
   * POST /deliverables/{deliverableId}/rubrics
   * Create a new rubric for a deliverable
   */
  @Post(':deliverableId/rubrics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Coordinator)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Create a new rubric',
    description:
      'Create a new rubric for a deliverable. The new rubric becomes active, and any previously active rubric is deactivated. Only accessible to COORDINATOR role.',
  })
  @ApiCreatedResponse({
    description: 'Rubric created successfully',
    type: RubricResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation error - criteria weights must sum to 1.0',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - missing or invalid JWT',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - insufficient permissions',
  })
  @ApiNotFoundResponse({
    description: 'Deliverable not found',
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
  })
  async createRubric(
    @Param('deliverableId', new ParseUUIDPipe()) deliverableId: string,
    @Body() createRubricDto: CreateRubricDto,
    @Req() req: RequestWithUser,
  ): Promise<RubricResponseDto> {
    const rubric = await this.rubricsService.createRubric(
      deliverableId,
      createRubricDto,
      req.user?.userId,
    );
    return rubric as RubricResponseDto;
  }

  /**
   * DELETE /deliverables/{deliverableId}/rubrics/{rubricId}
   * Delete a rubric (if not referenced in any SprintEvaluation)
   */
  @Delete(':deliverableId/rubrics/:rubricId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Coordinator)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Delete a rubric',
    description:
      'Delete a rubric. The rubric cannot be deleted if it is currently referenced in any SprintEvaluation. Only accessible to COORDINATOR role.',
  })
  @ApiNoContentResponse({
    description: 'Rubric deleted successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - missing or invalid JWT',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - insufficient permissions',
  })
  @ApiNotFoundResponse({
    description: 'Deliverable or rubric not found',
  })
  @ApiConflictResponse({
    description: 'Conflict - rubric is referenced in evaluations',
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
  })
  async deleteRubric(
    @Param('deliverableId', new ParseUUIDPipe()) deliverableId: string,
    @Param('rubricId', new ParseUUIDPipe()) rubricId: string,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    await this.rubricsService.deleteRubric(
      deliverableId,
      rubricId,
      req.user?.userId,
    );
  }
}
