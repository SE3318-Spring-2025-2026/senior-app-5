import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { SprintConfigsService } from './sprint-configs.service';
import { CreateSprintConfigDto } from './dto/create-sprint-config.dto';
import { UpdateSprintConfigDto } from './dto/update-sprint-config.dto';
import { SprintConfigResponseDto } from './dto/sprint-config-response.dto';

@ApiTags('Sprint Configs')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sprints')
export class SprintConfigsController {
  constructor(private readonly sprintConfigsService: SprintConfigsService) {}

  @Post()
  @Roles(Role.Coordinator)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    operationId: 'createSprintConfig',
    summary: 'Create a sprint configuration (Coordinator only)',
  })
  @ApiCreatedResponse({
    description: 'Sprint configuration created successfully.',
    type: SprintConfigResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Validation failed, invalid sprintId, or deliverableId not found in D1.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiForbiddenResponse({ description: 'Requires COORDINATOR role.' })
  @ApiConflictResponse({
    description: 'A config for this sprint already exists.',
  })
  @ApiUnprocessableEntityResponse({
    description: 'Contribution percentage sum exceeds 100% for a deliverable.',
  })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  async createSprintConfig(
    @Body() dto: CreateSprintConfigDto,
  ): Promise<SprintConfigResponseDto> {
    return this.sprintConfigsService.create(dto);
  }

  @Patch(':sprintId')
  @Roles(Role.Coordinator)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'updateSprintConfig',
    summary: 'Update an existing sprint configuration (Coordinator only)',
  })
  @ApiOkResponse({
    description: 'Sprint configuration updated successfully.',
    type: SprintConfigResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed or deliverableId not found in D1.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiForbiddenResponse({ description: 'Requires COORDINATOR role.' })
  @ApiNotFoundResponse({ description: 'Sprint config not found.' })
  @ApiUnprocessableEntityResponse({
    description: 'Contribution percentage sum exceeds 100% for a deliverable.',
  })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  async updateSprintConfig(
    @Param('sprintId', new ParseUUIDPipe()) sprintId: string,
    @Body() dto: UpdateSprintConfigDto,
  ): Promise<SprintConfigResponseDto> {
    return this.sprintConfigsService.update(sprintId, dto);
  }

  @Get()
  @Roles(Role.Coordinator, Role.Professor)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'listSprintConfigs',
    summary: 'List all sprint configurations (Coordinator and Professor)',
  })
  @ApiOkResponse({
    description: 'Sprint configurations returned successfully.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiForbiddenResponse({ description: 'Requires COORDINATOR role.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  async listSprintConfigs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.sprintConfigsService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':sprintId')
  @Roles(Role.Coordinator, Role.Professor)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'getSprintConfig',
    summary: 'Get a sprint configuration by sprintId (Coordinator and Professor)',
  })
  @ApiOkResponse({
    description: 'Sprint configuration found.',
    type: SprintConfigResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiForbiddenResponse({ description: 'Requires COORDINATOR role.' })
  @ApiNotFoundResponse({ description: 'Sprint config not found.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  async getSprintConfig(
    @Param('sprintId', new ParseUUIDPipe()) sprintId: string,
  ): Promise<SprintConfigResponseDto> {
    return this.sprintConfigsService.findOne(sprintId);
  }

  @Delete(':sprintId')
  @Roles(Role.Coordinator)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    operationId: 'deleteSprintConfig',
    summary: 'Delete a sprint configuration (Coordinator only)',
  })
  @ApiNoContentResponse({
    description: 'Sprint configuration deleted successfully.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiForbiddenResponse({ description: 'Requires COORDINATOR role.' })
  @ApiNotFoundResponse({ description: 'Sprint config not found.' })
  @ApiInternalServerErrorResponse({ description: 'Unexpected server error.' })
  async deleteSprintConfig(
    @Param('sprintId', new ParseUUIDPipe()) sprintId: string,
  ): Promise<void> {
    return this.sprintConfigsService.remove(sprintId);
  }
}
