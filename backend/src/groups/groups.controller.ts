import { Controller, Post, Body, HttpCode, HttpStatus, Get, Param, UseGuards } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { ApiCreatedResponse, ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard'; 
import { Roles } from '../auth/decorators/roles.decorator'; 
import { Role } from '../auth/enums/role.enum'; 

@ApiTags('Groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard) 
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @ApiOperation({ summary: 'Create a new group' })
  @ApiCreatedResponse({ description: 'Group created successfully' })
  @Post()
  @Roles(Role.Admin, Role.Coordinator) 
  @HttpCode(HttpStatus.CREATED)
  async createGroup(@Body() createGroupDto: CreateGroupDto) {
    return this.groupsService.createGroup(createGroupDto);
  }

  @ApiOperation({ summary: 'Add a member to a group (by groupId UUID)' })
  @ApiCreatedResponse({ description: 'Member added to group successfully' })
  @Post(':groupId/members')
  @Roles(Role.Admin, Role.Coordinator) 
  @HttpCode(HttpStatus.CREATED)
  async addMember(
    @Param('groupId') groupId: string,
    @Body() body: AddMemberDto,
  ) {
    return this.groupsService.addMember(groupId, body.memberUserId);
  }

  @Get(':groupId/validate-statement-of-work')
  @ApiOperation({ summary: 'Check SoW status for a group' })
  async validateSow(@Param('groupId') groupId: string) {
    return this.groupsService.validateStatementOfWork(groupId);
  }
}