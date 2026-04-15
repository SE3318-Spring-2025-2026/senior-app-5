import { Controller, Post, Body, HttpCode, HttpStatus, Get, Param } from '@nestjs/common';
import { Delete, UseGuards } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiBearerAuth, ApiNoContentResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@ApiTags('Groups')
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @ApiOperation({ summary: 'Create a new group' })
  @ApiCreatedResponse({ description: 'Group created successfully' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createGroup(@Body() createGroupDto: CreateGroupDto) {
    return this.groupsService.createGroup(createGroupDto);
  }

  @Get(':groupId/validate-statement-of-work')
  async validateSow(@Param('groupId') groupId: string) {
    return this.groupsService.validateStatementOfWork(groupId);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Disband a group entirely' })
  @ApiNoContentResponse({ description: 'Group disbanded successfully' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Coordinator)
  @Delete(':groupId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async disbandGroup(@Param('groupId') groupId: string): Promise<void> {
    await this.groupsService.disbandGroup(groupId);
  }
}
